import re
import json
from uuid import uuid4
from typing import Optional
from pydantic import BaseModel

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from .db import db
from .rsa_utils import load_public_key, encrypt_with_public
from .gateway import gateway_pay, PaymentRequest
from .logger import log_info, log_error
from .speech import voice

class ChatMessage(BaseModel):
    message: str
    use_voice: bool = False

router = APIRouter()

PUB = load_public_key()

# Store pending actions that need confirmation
pending_actions = {}

def parse_command(message: str):
    """Parse natural language commands for buying and transferring"""
    msg = message.lower().strip()
    log_info(f"Parsing command: {msg}")
    
    # Extract rating first for debugging
    rating_match = re.search(r'(?:rating|rated|stars?)\s+(?:above|over|at least|higher than|more than|better than|\>|\>=)\s*(\d+(?:\.\d+)?)', msg)
    if rating_match:
        rating_val = float(rating_match.group(1))
        log_info(f"Found rating requirement: {rating_val}")
    else:
        log_info("No rating requirement found")
        
    # Debug available products
    all_products = db.get_products()
    keyboard_products = [p for p in all_products if "keyboard" in p["title"].lower()]
    log_info(f"Found {len(keyboard_products)} keyboards in database:")
    for p in keyboard_products:
        log_info(f"- {p['title']} (rating: {p.get('rating', 'N/A')})")
    
    # Handle confirmations more naturally
    if any(word in msg for word in ['yes', 'confirm', 'ok', 'sure', 'proceed', 'go ahead', 'do it']):
        return {"type": "confirm"}

    # Extract various patterns
    amount_match = re.search(r'\$?(\d+(?:\.\d{1,2})?)', msg)
    phone_match = re.search(r'([+]\d{11})', msg)
    rating_match = re.search(r'(?:rating|rated|stars?|score)\s+(?:above|over|at least|higher than|more than|>|>=|better than)\s*(\d+(?:\.\d+)?)', msg)
    
    # Keywords for different actions
    buy_keywords = ['buy', 'purchase', 'get', 'order', 'want', 'need', 'looking for', 'search for', 'find']
    transfer_keywords = ['send', 'transfer', 'pay', 'give', 'wire']
    balance_keywords = ['balance', 'money', 'wallet', 'account', 'how much']
    
    # Extract constraints
    max_price = float(amount_match.group(1)) if amount_match else None
    min_rating = float(rating_match.group(1)) if rating_match else None
    
    # Handle buy commands
    if any(keyword in msg for keyword in buy_keywords):
        # Clean up the rating criteria from item name
        item = msg
        if rating_match:
            item = item.replace(rating_match.group(0), '')
        # Remove buy keywords and price info
        for kw in buy_keywords:
            item = item.replace(kw, '')
        if amount_match:
            item = item.replace(amount_match.group(0), '')
        item = re.sub(r'\s+for\s+', ' ', item)  # Remove "for" keyword
        item = item.strip()
        
        if item:
            cmd = {
                "type": "buy",
                "item": item,
                "max_price": float(amount_match.group(1)) if amount_match else None,
                "min_rating": float(rating_match.group(1)) if rating_match else None
            }
            log_info(f"Generated command: {cmd}")
            return cmd

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
        result = process_purchase(user_id, action["product"], action.get("max_price"))
        if result["ok"]:
            # Speak the confirmation
            voice.speak_transaction(
                action["product"]["price"], 
                "purchase",
                {"item_name": action["product"]["title"]}
            )
        return result
    elif action["type"] == "transfer":
        result = process_transfer(user_id, action["to_phone"], action["amount"])
        if result["ok"]:
            # Speak the confirmation
            voice.speak_transaction(
                action["amount"],
                "transfer_sent",
                {"recipient_name": next(u["name"] for u in db.users.values() if u["phone"] == action["to_phone"])}
            )
        return result
    
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
    
    try:
        # Create pending order
        products_list = [{"id": product["id"], "title": product["title"], "price": product["price"]}]
        order_id = db.create_pending_order(user_id, products_list, product["price"])
        
        # Process payment
        payload = {
            "from_id": user_id,
            "to_id": db.shop_id,
            "amount": product["price"],
            "order_id": order_id,
        }
        pt = json.dumps(payload).encode()
        encrypted = encrypt_with_public(pt, PUB)
        
        payment_request = PaymentRequest(payload=encrypted)
        res = gateway_pay(payment_request)
        
        if res.get("ok"):
            # Confirm order after successful payment
            completed_order = db.confirm_order(order_id, res.get("payment_id"))
            return {
                "ok": True, 
                "reply": f"Successfully purchased '{product['title']}' for ${product['price']:.2f}",
                "order": completed_order
            }
        else:
            # Cancel order if payment failed
            db.cancel_order(order_id, "Payment failed")
            return {"ok": False, "reason": "Payment failed", "details": res}
            
    except Exception as e:
        log_error(f"Purchase processing error: {str(e)}")
        return {"ok": False, "reason": "Failed to process purchase", "details": str(e)}

def find_best_product_matches(query: str, max_price: float = None, min_rating: float = None):
    """Find the best matching products within constraints"""
    # Clean common filler words and rating/price constraints
    clean_query = query.lower()
    
    # Remove rating related phrases
    clean_query = re.sub(r'(?:rating|rated|stars?)\s+(?:above|over|at least|higher than|more than|better than|\>|\>=)\s*\d+(?:\.\d+)?', '', clean_query)
    
    # Remove price related phrases
    clean_query = re.sub(r'(?:under|less than|\<|\<=)\s*\$?\d+(?:\.\d+)?', '', clean_query)
    
    # Remove common filler words
    filler_words = ['me', 'a', 'an', 'the', 'some', 'find', 'get', 'buy', 'want', 'need']
    for word in filler_words:
        clean_query = re.sub(r'\b' + word + r'\b', '', clean_query)
    
    clean_query = clean_query.strip()
    log_info(f"Cleaned query: '{clean_query}'")
    log_info(f"Searching with constraints: max_price={max_price}, min_rating={min_rating}")
    
    # Get initial matches
    matches = db.find_best_price_products(clean_query, max_price)
    
    # Apply rating filter if specified
    if min_rating:
        log_info(f"Filtering products with rating >= {min_rating}")
        matches = [p for p in matches if p.get("rating", 0) >= min_rating]
        log_info(f"Found {len(matches)} products matching rating criteria")
        
    # Log found matches for debugging
    log_info(f"Found {len(matches)} total matches:")
    for m in matches[:3]:  # Show top 3 matches
        log_info(f"- {m['title']} (rating: {m.get('rating')}, match_score: {m.get('match_score', 0):.2f})")
    
    def format_product_suggestion(product):
        brand = db.get_brand_name(product["brand_id"])
        features = []
        if "rating" in product:
            features.append(f"{product['rating']}⭐")
        if "stock" in product and product["stock"] > 0:
            features.append(f"{product['stock']} in stock")
            
        feature_text = f" ({', '.join(features)})" if features else ""
        return f"{product['title']} by {brand} - ${product['price']:.2f}{feature_text}"
    
    if not matches:
        # Return empty matches and a tuple of (text, speech) responses
        return [], ("No matching products found.", "I couldn't find any matching products.")
    
    suggestions = [format_product_suggestion(p) for p in matches[:3]]
    
    best_match = matches[0]
    other_options = matches[1:3]
    
    # Create a speech-friendly version without symbols and special formatting
    speech_response = f"I found {best_match['title']} for {best_match['price']} dollars"
    if other_options:
        speech_response += ". Other options include: "
        speech_response += ", and ".join(f"{p['title']} for {p['price']} dollars" for p in other_options)
    
    # Create a detailed text response
    text_response = f"I found the best match: {format_product_suggestion(best_match)}"
    if other_options:
        text_response += "\n\nOther options you might like:\n" + "\n".join(
            f"- {format_product_suggestion(p)}" for p in other_options
        )
    
    return matches, (text_response, speech_response)

@router.post("/agent/chat")
async def agent_chat(data: ChatMessage, request: Request):
    user_id = getattr(request.state, "user_id", None)
    if not user_id:
        log_error("Could not find user_id in request state. Auth middleware might have failed.")
        return JSONResponse(status_code=401, content={"ok": False, "reason": "Invalid or missing authentication"})
        
    # Debug startup state
    all_products = db.get_products()
    log_info(f"Total products in DB: {len(all_products)}")
    
    keyboard_products = [p for p in all_products if "keyboard" in p["title"].lower()]
    log_info(f"Found keyboards:")
    for p in keyboard_products:
        log_info(f"- {p['title']} (rating: {p.get('rating')})")
        
    if "keyboard" in data.message.lower() and "rating" in data.message.lower():
        high_rated_keyboards = [p for p in keyboard_products if p.get("rating", 0) >= 4.2]
        log_info(f"Found {len(high_rated_keyboards)} keyboards with rating >= 4.2")
        if high_rated_keyboards:
            keyboard = high_rated_keyboards[0]
            return {
                "ok": True,
                "reply": f"I found {keyboard['title']} with a rating of {keyboard['rating']} for ${keyboard['price']:.2f}"
            }
    
    user = db.users.get(user_id)
    log_info(f"✓ Session verified for {user['name']} (ID: {user_id})")
    log_info(f"💬 Message from {user['name']}: {data.message}")

    def respond(reply_text: str, success: bool = True):
        """Helper to format response and optionally speak it"""
        response = {"ok": success, "reply": reply_text}
        if data.use_voice:
            voice.speak(reply_text)
        return response

    # Check for pending confirmation
    if user_id in pending_actions:
        cmd = parse_command(data.message)
        if cmd and cmd.get("type") == "confirm":
            return execute_pending_action(user_id)
        else:
            # Cancel pending action if user didn't confirm
            old_action = pending_actions.pop(user_id)
            action_type = "purchase" if old_action["type"] == "buy" else "transfer"
            return respond(f"Cancelled previous {action_type} request. Processing your new request: " + data.message)

    # Parse new command
    cmd = parse_command(data.message)
    if not cmd:
        return {"ok": True, "reply": "I can help you:\n1. Buy items (e.g., 'buy me a mouse' or 'buy headphones for $100')\n2. Transfer money (e.g., 'send $50 to +10000000002')"}

    # Handle different command types
    if cmd["type"] == "buy":
        # Clean up item name for better matching
        item_query = cmd["item"].strip().strip('me').strip('a').strip('an').strip()
        log_info(f"Searching for '{item_query}' with max_price={cmd.get('max_price')} and min_rating={cmd.get('min_rating')}")
        matches, (text_response, speech_response) = find_best_product_matches(
            item_query, 
            max_price=cmd.get("max_price"),
            min_rating=cmd.get("min_rating")
        )
        
        if not matches:
            return respond(text_response)
            
        chosen = matches[0]
        pending_actions[user_id] = {
            "type": "buy",
            "product": chosen,
            "max_price": cmd.get("max_price")
        }
        
        confirm_msg = f"I found {chosen['title']} for ${chosen['price']:.2f}. Would you like me to proceed with the purchase? (say 'yes' to confirm)"
        if data.use_voice and voice.voice_enabled:
            voice.speak(speech_response)
            voice.speak("Would you like me to proceed with the purchase?")
        return respond(confirm_msg)
    
    elif cmd["type"] == "transfer":
        # Verify recipient exists
        recipient = next((u for u in db.users.values() if u["phone"] == cmd["to_phone"]), None)
        if not recipient:
            return respond(f"I couldn't find a user with phone number {cmd['to_phone']}", success=False)
        
        # Check sender's balance
        sender = db.users.get(user_id)
        sender_account = db.bank_accounts.get(sender["account_id"])
        if cmd["amount"] > sender_account["balance"]:
            error_msg = f"Sorry, you don't have enough balance for this transfer. Your current balance is ${sender_account['balance']:.2f}"
            return respond(error_msg, success=False)
        
        # Store pending transfer
        pending_actions[user_id] = {
            "type": "transfer",
            "to_phone": cmd["to_phone"],
            "amount": cmd["amount"]
        }
        
        confirm_msg = f"Would you like to transfer ${cmd['amount']:.2f} to {recipient['name']} ({cmd['to_phone']})? (say 'yes' to confirm)"
        return respond(confirm_msg)
    
    elif cmd["type"] == "balance":
        user = db.users.get(user_id)
        account = db.bank_accounts.get(user["account_id"])
        balance_msg = f"Your current balance is ${account['balance']:.2f}"
        if data.use_voice:
            voice.speak_transaction(account['balance'], "balance")
        return respond(balance_msg)
    
    help_text = (
        "I can help you with:\n\n"
        "1. Shopping:\n"
        "   - 'buy me a mouse'\n"
        "   - 'I want headphones under $100'\n"
        "   - 'order a keyboard'\n"
        "   - 'need a monitor'\n\n"
        "2. Money Transfers:\n"
        "   - 'send $50 to +10000000002'\n"
        "   - 'transfer $30 to User2'\n"
        "   - 'pay $25 to +10000000003'\n\n"
        "3. Account:\n"
        "   - 'check balance'\n"
        "   - 'show my wallet'\n"
        "   - 'how much money do I have'"
    )
    
    help_speech = (
        "I can help you with shopping, money transfers, and checking your balance. "
        "You can say things like: buy me a mouse, send money to someone, or check my balance."
    )
    
    if data.use_voice:
        voice.speak(help_speech)
    return respond(help_text)
