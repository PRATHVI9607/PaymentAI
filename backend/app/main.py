import re
import time
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
from .logger import log_info, log_error, log_request, log_response
from .gateway import router as gateway_router
from .logger import log_request, log_response, log_info
from .speech import voice

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        log_request(request.method, request.url.path)
        response = await call_next(request)
        log_response(response.status_code)
        return response

class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Always allow CORS preflight requests
        if request.method == "OPTIONS":
            return await call_next(request)

        # Skip auth for login and docs
        if request.url.path in ["/login", "/docs", "/openapi.json"]:
            return await call_next(request)

        try:
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                log_error(f"Missing/invalid auth header for {request.method} {request.url.path}")
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Please log in to continue"},
                    headers={"Access-Control-Allow-Origin": "*"}
                )

            token = auth_header.split(" ")[1]
            if token not in db.sessions:
                log_error(f"Invalid token {token[:8]}... for {request.method} {request.url.path}")
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Session expired - Please log in again"},
                    headers={"Access-Control-Allow-Origin": "*"}
                )

            # Add user_id to request state
            user_id = db.sessions[token]
            request.state.user_id = user_id
            
            # Log successful auth
            log_info(f"Auth success: {token[:8]}... -> User {user_id}")
            
            return await call_next(request)
            
        except Exception as e:
            log_error(f"Auth error: {str(e)}")
            return JSONResponse(
                status_code=401,
                content={"detail": "Authentication failed"},
                headers={"Access-Control-Allow-Origin": "*"}
            )

class LoginData(BaseModel):
    phone: str

app = FastAPI()

# Add middlewares
app.add_middleware(LoggingMiddleware)
app.add_middleware(AuthMiddleware)

# Include routers
app.include_router(agent_router)
app.include_router(gateway_router)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your actual frontend domain
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],  # Allow all headers for development
    expose_headers=["Content-Type"]
)

@app.on_event("startup")
def startup_event():
    rsa_utils.ensure_keys()
    # Clear existing data and reseed
    db.products.clear()
    db.users.clear()
    db.sessions.clear()
    db.bank_accounts.clear()
    db.transactions.clear()
    db.activities.clear()
    db.orders.clear()
    db.pending_orders.clear()
    
    # Load fresh seed data
    from . import seed_data
    seed_data.seed()

@app.post("/login")
async def login(data: LoginData):
    try:
        # Input validation with detailed errors
        if not data.phone:
            return JSONResponse(
                status_code=400,
                content={"detail": "Phone number is required"}
            )
        if not data.phone.startswith("+"):
            return JSONResponse(
                status_code=400,
                content={"detail": "Phone number must start with +"}
            )
        if not re.match(r'^\+\d{11}$', data.phone):
            return JSONResponse(
                status_code=400,
                content={"detail": "Invalid phone format. Must be +XXXXXXXXXXX (11 digits)"}
            )

        user = next((u for u in db.users.values() if u["phone"] == data.phone), None)
        if not user:
            return JSONResponse(
                status_code=404,
                content={
                    "detail": "User not found",
                    "help": "Try numbers from +10000000001 to +10000000010"
                }
            )

        # Get the user's account - handle missing data gracefully
        account = db.bank_accounts.get(user["account_id"])
        if not account:
            log_error(f"Account not found for user {user['id']}")
            return JSONResponse(
                status_code=500,
                content={"detail": "Account data is missing"}
            )

        # Create session
        token = str(uuid4())
        db.sessions[token] = user["id"]
        
        # Log the login activity
        db.log_activity(user["id"], "login", {"timestamp": time.time()})
        
        return {
            "token": token,
            "user": {
                **user,
                "balance": account["balance"]
            }
        }
    except Exception as e:
        log_error(f"Login error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "detail": "Internal server error",
                "help": "Please try again or contact support if the problem persists"
            }
        )

@app.get("/products/search")
async def search_products(request: Request, query: str, min_rating: float = None, max_price: float = None):
    """Search for products with optional rating and price filters"""
    try:
        log_info(f"Searching products - Query: {query}, Min Rating: {min_rating}, Max Price: {max_price}")
        
        # Get matching products
        products = db.find_best_price_products(query, max_price)
        
        # Filter by rating if specified
        if min_rating is not None:
            products = [p for p in products if p.get("rating", 0) >= min_rating]
            
        log_info(f"Found {len(products)} products after filtering")
        return products
        
    except Exception as e:
        log_error(f"Search error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": "Failed to search products"}
        )

@app.get("/products")
async def list_products(request: Request, brand: str = None, category: str = None):
    try:
        # Log debug information
        log_info(f"Listing products - Brand: {brand}, Category: {category}")
        log_info(f"User ID: {request.state.user_id}")

        try:
            products = db.get_products(brand, category)
            log_info(f"Found {len(products)} products after filtering")
            return products
            
        except KeyError as e:
            log_error(f"Database error: {str(e)}")
            return JSONResponse(
                status_code=500,
                content={"detail": "Internal database error"}
            )
            
    except Exception as e:
        log_error(f"Error listing products: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": "Failed to list products"}
        )

@app.get("/users/{user_id}")
async def get_user(request: Request, user_id: str):
    try:
        if user_id != request.state.user_id:
            return JSONResponse(status_code=403, content={"detail": "Access denied"})
        
        user = db.users.get(user_id)
        if not user:
            return JSONResponse(status_code=404, content={"detail": "User not found"})
        return user
    except Exception as e:
        log_info(f"Error getting user: {str(e)}")
        return JSONResponse(status_code=500, content={"detail": "Failed to get user info"})

@app.get("/balances/{user_id}")
async def get_balance(request: Request, user_id: str):
    try:
        if user_id != request.state.user_id:
            return JSONResponse(status_code=403, content={"detail": "Access denied"})
        
        user = db.users.get(user_id)
        if not user:
            return JSONResponse(status_code=404, content={"detail": "User not found"})
        
        account = db.bank_accounts.get(user["account_id"])
        if not account:
            return JSONResponse(status_code=404, content={"detail": "Account not found"})
            
        return {"balance": account["balance"]}
    except Exception as e:
        log_info(f"Error getting balance: {str(e)}")
        return JSONResponse(status_code=500, content={"detail": "Failed to get balance"})

@app.get("/transactions/{user_id}")
async def get_user_transactions(request: Request, user_id: str):
    """Get all transactions (sent and received) for a user"""
    try:
        if user_id != request.state.user_id:
            return JSONResponse(status_code=403, content={"detail": "Access denied"})
        
        txs = [tx for tx in db.transactions if tx["from"] == user_id or tx["to"] == user_id]
        # Enrich with user names
        for tx in txs:
            tx["from_user"] = db.users[tx["from"]]["name"]
            tx["to_user"] = db.users[tx["to"]]["name"]
        return sorted(txs, key=lambda x: x["ts"], reverse=True)
    except Exception as e:
        log_info(f"Error getting transactions: {str(e)}")
        return JSONResponse(status_code=500, content={"detail": "Failed to get transactions"})

@app.get("/activities/{user_id}")
async def get_user_activities(request: Request, user_id: str, activity_type: str = None):
    """Get user activities, optionally filtered by type"""
    try:
        # Verify user access
        if user_id != request.state.user_id:
            log_error(f"Access denied: {request.state.user_id} tried to access activities of {user_id}")
            return JSONResponse(status_code=403, content={"detail": "Access denied"})
            
        # Get user activities
        activities = db.get_user_activities(user_id, activity_type)
        log_info(f"Retrieved {len(activities)} activities for user {user_id}")
        
        # Add user info to activities
        for activity in activities:
            if "from_user" in activity and activity["from_user"] in db.users:
                activity["from_user_name"] = db.users[activity["from_user"]]["name"]
            if "to_user" in activity and activity["to_user"] in db.users:
                activity["to_user_name"] = db.users[activity["to_user"]]["name"]
                
        return activities
        
    except Exception as e:
        log_error(f"Error getting activities for {user_id}: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": "Failed to retrieve activities"}
        )

class VoiceCommand(BaseModel):
    command_type: str
    message: str = ""

@app.post("/voice/speak")
async def voice_speak(request: Request, command: VoiceCommand):
    """Endpoint to trigger voice assistant to speak a message"""
    try:
        if command.command_type == "speak":
            voice.speak(command.message)
            return {"status": "success", "message": "Voice command queued"}
        else:
            return JSONResponse(
                status_code=400,
                content={"detail": "Invalid command type"}
            )
    except Exception as e:
        log_info(f"Voice speak error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": "Failed to process voice command"}
        )

@app.post("/voice/listen")
async def voice_listen(request: Request):
    """Endpoint to trigger voice assistant to listen for commands"""
    try:
        text = voice.listen(timeout=5)
        if text:
            return {"status": "success", "text": text}
        else:
            return JSONResponse(
                status_code=404,
                content={"detail": "No speech detected or recognition failed"}
            )
    except Exception as e:
        log_info(f"Voice listen error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": "Failed to process voice input"}
        )
