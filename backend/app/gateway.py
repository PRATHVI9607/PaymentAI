import json
from pydantic import BaseModel

from fastapi import APIRouter

from .rsa_utils import load_private_key, decrypt_with_private
from .bank import transfer
from .db import db

class PaymentRequest(BaseModel):
    payload: str

router = APIRouter()

priv = load_private_key()

@router.post("/gateway/pay")
def gateway_pay(data: PaymentRequest):
    try:
        pt = decrypt_with_private(data.payload, priv)
        payment_data = json.loads(pt.decode())
    except Exception as e:
        return {"ok": False, "reason": f"decrypt failed: {e}"}

    # expected: {from_id,to_id,amount,order_id,session_token}
    from_id = payment_data.get("from_id")
    to_id = payment_data.get("to_id")
    amount = float(payment_data.get("amount", 0))
    meta = {"order_id": payment_data.get("order_id")}

    res = transfer(from_id, to_id, amount, meta=meta)
    return res
