import re
import json
from uuid import uuid4
from typing import Optional
from pydantic import BaseModel

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from .db import db
from .rsa_utils import load_public_key, encrypt_with_public
from .gateway import gateway_pay, PaymentRequest
from .logger import log_info, log_error

class ChatMessage(BaseModel):
    token: str
    message: str

router = APIRouter()

PUB = load_public_key()

# Store pending actions that need confirmation
pending_actions = {}

def parse_command(message: str):
    """Parse natural language commands for buying and transferring"""
    msg = message.lower().strip()
    
    # Handle confirmations more naturally
    if any(word in msg for word in ['yes', 'confirm', 'ok', 'sure', 'proceed', 'go ahead', 'do it']):
        return {"type": "confirm"}

    # Extract money amounts and phone numbers
    amount_match = re.search(r'\$?(\d+(?:\.\d{1,2})?)', msg)
    phone_match = re.search(r'([+]\d{11})', msg)
    
    # Keywords for different actions
    buy_keywords = ['buy', 'purchase', 'get', 'order', 'want', 'need']
    transfer_keywords = ['send', 'transfer', 'pay', 'give']
    
    # Handle buy commands
    if any(keyword in msg for keyword in buy_keywords):
        # Remove buy keywords and price info to isolate product description
        for kw in buy_keywords:
            msg = msg.replace(kw, '')
        if amount_match:
            msg = msg.replace(amount_match.group(0), '')
        msg = re.sub(r'\s+for\s+', ' ', msg)  # Remove "for" keyword
        item = msg.strip()
        if item:
            return {
                "type": "buy",
                "item": item,
                "max_price": float(amount_match.group(1)) if amount_match else None
            }

    # Handle transfer commands - more flexible now
    if any(keyword in msg for keyword in transfer_keywords):
        if amount_match and phone_match:
            return {
                "type": "transfer",
                "amount": float(amount_match.group(1)),
                "to_phone": phone_match.group(1)
            }
        elif amount_match:
            # Found amount but no phone, look for a name or phone reference
            name_match = re.search(r'(?:to|for)\s+(.+?)(?:\s+|$)', msg)
            if name_match:
                name = name_match.group(1).strip()
                # Try to find user by name prefix
                user = next((u for u in db.users.values() 
                           if u["name"].lower().startswith(name.lower())), None)
                if user:
                    return {
                        "type": "transfer",
                        "amount": float(amount_match.group(1)),
                        "to_phone": user["phone"]
                    }
    
    # Check for balance inquiries
    if any(word in msg for word in ['balance', 'money', 'wallet', 'account']):
        return {"type": "balance"}
    
    return None

def execute_pending_action(user_id: str):
    """Execute a previously confirmed action"""
    if user_id not in pending_actions:
        return {"ok": False, "reason": "No pending action"}
    
    action = pending_actions.pop(user_id)
    if action["type"] == "buy":
        return process_purchase(user_id, action["product"], action.get("max_price"))
    elif action["type"] == "transfer":
        return process_transfer(user_id, action["to_phone"], action["amount"])
    
    return {"ok": False, "reason": "Invalid action type"}

def process_transfer(user_id: str, to_phone: str, amount: float):
    """Process money transfer between users"""
    # Get sender details
    sender = db.users.get(user_id)
    log_info(f"Processing transfer request from {sender['name']} (${amount:.2f})")
    
    # Find recipient by phone
    recipient = next((u for u in db.users.values() if u["phone"] == to_phone), None)
    if not recipient:
        log_error(f"Transfer failed: Recipient not found with phone {to_phone}")
        return {"ok": False, "reason": "Recipient not found"}

    log_info(f"Found recipient: {recipient['name']} ({to_phone})")

    # Create transfer payload
    payload = {
        "from_id": user_id,
        "to_id": recipient["id"],
        "amount": amount,
        "order_id": str(uuid4())  # Use order_id for tracking
    }
    
    # Encrypt and process payment
    pt = json.dumps(payload).encode()
    encrypted = encrypt_with_public(pt, PUB)
    payment_request = PaymentRequest(payload=encrypted)
    
    res = gateway_pay(payment_request)
    if res.get("ok"):
        return {"ok": True, "reply": f"Successfully transferred ${amount:.2f} to {recipient['name']} ({to_phone})"}
    return {"ok": False, "reason": "Transfer failed", "details": res}

def process_purchase(user_id: str, product: dict, max_price: float = None):
    """Process product purchase"""
    if max_price and product["price"] > max_price:
        return {"ok": False, "reason": f"Price ${product['price']} exceeds your limit of ${max_price}"}
    
    # Create order
    oid = str(uuid4())
    order = {
        "id": oid,
        "buyer_id": user_id,
        "product_id": product["id"],
        "amount": product["price"],
        "status": "pending",
    }
    db.orders[oid] = order
    
    # Process payment
    payload = {
        "from_id": user_id,
        "to_id": db.shop_id,
        "amount": order["amount"],
        "order_id": oid,
    }
    pt = json.dumps(payload).encode()
    encrypted = encrypt_with_public(pt, PUB)
    
    payment_request = PaymentRequest(payload=encrypted)
    res = gateway_pay(payment_request)
    
    if res.get("ok"):
        order["status"] = "complete"
        return {
            "ok": True, 
            "reply": f"Successfully purchased '{product['title']}' for ${product['price']:.2f}",
            "order": order
        }
    
    order["status"] = "failed"
    return {"ok": False, "reason": "Payment failed", "details": res}

def find_best_product_match(query: str, max_price: float = None):
    """Find the best matching product within price range"""
    products = list(db.products.values())
    
    # Filter by price if specified
    if max_price is not None:
        products = [p for p in products if p["price"] <= max_price]
    
    # First try exact substring match
    matches = [p for p in products if query.lower() in p["title"].lower()]
    
    # Then try word matching
    if not matches:
        matches = [p for p in products if any(w.lower() in p["title"].lower() for w in query.split())]
    
    # Sort by price and relevance
    return sorted(matches, key=lambda x: (x["price"], len(x["title"])))

@router.post("/agent/chat")
def agent_chat(data: ChatMessage):
    log_info(f"Verifying session token: {data.token[:8]}...")
    user_id = db.sessions.get(data.token)
    if not user_id:
        log_error(f"Session verification failed: Invalid token {data.token[:8]}...")
        return {"ok": False, "reason": "invalid session token"}
    
    user = db.users.get(user_id)
    log_info(f"✓ Session verified for {user['name']} (ID: {user_id})")
    log_info(f"💬 Message from {user['name']}: {data.message}")

    # Check for pending confirmation
    if user_id in pending_actions:
        cmd = parse_command(data.message)
        if cmd and cmd.get("type") == "confirm":
            return execute_pending_action(user_id)
        else:
            # Cancel pending action if user didn't confirm
            pending_actions.pop(user_id)
            return {"ok": True, "reply": "Previous action cancelled. What would you like to do?"}

    # Parse new command
    cmd = parse_command(data.message)
    if not cmd:
        return {"ok": True, "reply": "I can help you:\n1. Buy items (e.g., 'buy me a mouse' or 'buy headphones for $100')\n2. Transfer money (e.g., 'send $50 to +10000000002')"}

    # Handle different command types
    if cmd["type"] == "buy":
        # Clean up item name for better matching
        item_query = cmd["item"].strip().strip('me').strip('a').strip('an').strip()
        matches = find_best_product_match(item_query, cmd.get("max_price"))
        if not matches:
            similar_products = find_best_product_match(item_query.split()[0] if item_query.split() else item_query)
            suggestion = ""
            if similar_products:
                prices = [f"{p['title']} (${p['price']:.2f})" for p in similar_products[:3]]
                suggestion = f"\n\nMaybe you'd be interested in:\n" + "\n".join(prices)
            
            return {"ok": True, "reply": f"Sorry, I couldn't find any products matching '{cmd['item']}'" + 
                                       (" within your price range" if cmd.get("max_price") else "") +
                                       suggestion}
        
        chosen = matches[0]
        pending_actions[user_id] = {
            "type": "buy",
            "product": chosen,
            "max_price": cmd.get("max_price")
        }
        return {
            "ok": True,
            "reply": f"I found {chosen['title']} for ${chosen['price']:.2f}. Would you like me to proceed with the purchase? (say 'yes' to confirm)"
        }
    
    elif cmd["type"] == "transfer":
        # Verify recipient exists
        recipient = next((u for u in db.users.values() if u["phone"] == cmd["to_phone"]), None)
        if not recipient:
            return {"ok": False, "reply": f"I couldn't find a user with phone number {cmd['to_phone']}"}
        
        # Check sender's balance
        sender = db.users.get(user_id)
        if cmd["amount"] > sender.get("balance", 0):
            return {"ok": False, "reply": f"Sorry, you don't have enough balance for this transfer. Your current balance is ${sender['balance']:.2f}"}
        
        # Store pending transfer
        pending_actions[user_id] = {
            "type": "transfer",
            "to_phone": cmd["to_phone"],
            "amount": cmd["amount"]
        }
        return {
            "ok": True,
            "reply": f"Would you like to transfer ${cmd['amount']:.2f} to {recipient['name']} ({cmd['to_phone']})? (say 'yes' to confirm)"
        }
    
    elif cmd["type"] == "balance":
        user = db.users.get(user_id)
        return {"ok": True, "reply": f"Your current balance is ${user['balance']:.2f}"}
    
    return {
        "ok": True,
        "reply": "I can help you with:\n\n" +
                "1. Shopping:\n" +
                "   - 'buy me a mouse'\n" +
                "   - 'I want headphones under $100'\n" +
                "   - 'order a keyboard'\n" +
                "   - 'need a monitor'\n\n" +
                "2. Money Transfers:\n" +
                "   - 'send $50 to +10000000002'\n" +
                "   - 'transfer $30 to User2'\n" +
                "   - 'pay $25 to +10000000003'\n\n" +
                "3. Account:\n" +
                "   - 'check balance'\n" +
                "   - 'show my wallet'\n" +
                "   - 'how much money do I have'"
    }
