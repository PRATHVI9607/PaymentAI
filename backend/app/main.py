from uuid import uuid4
from typing import List
from pydantic import BaseModel

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from .db import db
from . import rsa_utils
from .agent import router as agent_router
from .gateway import router as gateway_router
from .logger import log_request, log_response, log_info

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        log_request(request.method, request.url.path)
        response = await call_next(request)
        log_response(response.status_code)
        return response

class LoginData(BaseModel):
    phone: str

app = FastAPI()

# Add logging middleware
app.add_middleware(LoggingMiddleware)

app.include_router(agent_router)
app.include_router(gateway_router)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    rsa_utils.ensure_keys()
    from . import seed_data
    seed_data.seed()

@app.post("/login")
def login(data: LoginData):
    user = next((u for u in db.users.values() if u["phone"] == data.phone), None)
    if not user:
        return JSONResponse(status_code=404, content={"detail": "user not found"})

    token = str(uuid4())
    db.sessions[token] = user["id"]
    return {"token": token, "user": user}

@app.get("/products")
def list_products():
    return list(db.products.values())

@app.get("/users/{user_id}")
def get_user(user_id: str):
    u = db.users.get(user_id)
    if not u:
        return JSONResponse(status_code=404, content={"detail": "not found"})
    return u

@app.get("/balances/{user_id}")
def get_balance(user_id: str):
    from .bank import get_balance
    return {"balance": get_balance(user_id)}

@app.get("/transactions/{user_id}")
def get_user_transactions(user_id: str):
    """Get all transactions (sent and received) for a user"""
    txs = [tx for tx in db.transactions if tx["from"] == user_id or tx["to"] == user_id]
    # Enrich with user names
    for tx in txs:
        tx["from_user"] = db.users[tx["from"]]["name"]
        tx["to_user"] = db.users[tx["to"]]["name"]
    return sorted(txs, key=lambda x: x["ts"], reverse=True)

@app.get("/activities/{user_id}")
def get_user_activities(user_id: str, activity_type: str = None):
    """Get user activities, optionally filtered by type"""
    return db.get_user_activities(user_id, activity_type)
