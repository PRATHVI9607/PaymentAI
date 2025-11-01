from .db import db
from uuid import uuid4
import time
from .logger import log_info, log_error

def get_balance(user_id: str):
    u = db.users.get(user_id)
    balance = u and u["balance"] or 0.0
    log_info(f"Balance check for user {user_id}: ${balance:.2f}")
    return balance

def transfer(from_id: str, to_id: str, amount: float, meta: dict = None):
    meta = meta or {}
    sender = db.users.get(from_id)
    recipient = db.users.get(to_id)

    if not sender:
        log_error(f"Transfer failed: Sender {from_id} not found")
        return {"ok": False, "reason": "from user not found"}
    if not recipient:
        log_error(f"Transfer failed: Recipient {to_id} not found")
        return {"ok": False, "reason": "to user not found"}
    if sender["balance"] < amount:
        log_error(f"Transfer failed: Insufficient funds (${sender['balance']:.2f} < ${amount:.2f})")
        return {"ok": False, "reason": "insufficient funds"}
    
    # Execute transfer
    log_info(f"Initiating transfer: ${amount:.2f} from {sender['name']} to {recipient['name']}")
    
    db.users[from_id]["balance"] -= amount
    db.users[to_id]["balance"] += amount
    
    log_info(f"Transfer complete: ${amount:.2f}")
    log_info(f"New balances - {sender['name']}: ${db.users[from_id]['balance']:.2f}, {recipient['name']}: ${db.users[to_id]['balance']:.2f}")
    
    # Create transaction record
    tx = {
        "id": str(uuid4()),
        "from": from_id,
        "to": to_id,
        "amount": amount,
        "ts": time.time(),
        "meta": meta,
        "type": "transfer"
    }
    db.transactions.append(tx)
    
    # Log activity for sender
    db.log_activity(from_id, "transfer_sent", {
        "amount": amount,
        "to_user": db.users[to_id]["name"],
        "transaction_id": tx["id"]
    })
    
    # Log activity for receiver
    db.log_activity(to_id, "transfer_received", {
        "amount": amount,
        "from_user": db.users[from_id]["name"],
        "transaction_id": tx["id"]
    })
    
    return {"ok": True, "tx": tx}
