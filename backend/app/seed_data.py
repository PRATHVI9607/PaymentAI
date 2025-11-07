from .db import db
from uuid import uuid4
import random

def seed():
    # Create shop account first
    shop_uid = str(uuid4())
    shop_account_id = str(uuid4())
    
    # Create banks
    quantum_bank_id = str(uuid4())
    digital_bank_id = str(uuid4())
    
    db.banks = {
        quantum_bank_id: {
            "id": quantum_bank_id,
            "name": "Quantum Bank",
            "code": "QNT",
            "description": "Next-gen digital banking"
        },
        digital_bank_id: {
            "id": digital_bank_id,
            "name": "Digital First Bank",
            "code": "DFB",
            "description": "Your digital banking partner"
        }
    }
    
    # Create users with bank accounts
    for i in range(1, 11):
        uid = str(uuid4())
        account_id = str(uuid4())
        bank_id = quantum_bank_id if i <= 5 else digital_bank_id
        
        user = {
            "id": uid,
            "name": f"User{i}",
            "phone": f"+100000000{i:02d}",
            "email": f"user{i}@example.com",
            "bank_id": bank_id,
            "account_id": account_id
        }
        
        account = {
            "id": account_id,
            "user_id": uid,
            "bank_id": bank_id,
            "account_number": f"{random.randint(1000000000, 9999999999)}",
            "balance": 1000.0 + i * 100,
            "type": "Savings"
        }
        
        db.users[uid] = user
        db.bank_accounts[account_id] = account

    # Set up shop account
    shop_user = {
        "id": shop_uid,
        "name": "AI Shopping Assistant",
        "phone": "+10000000000",
        "email": "shop@example.com",
        "bank_id": quantum_bank_id,
        "account_id": shop_account_id
    }
    
    shop_account = {
        "id": shop_account_id,
        "user_id": shop_uid,
        "bank_id": quantum_bank_id,
        "account_number": f"{random.randint(1000000000, 9999999999)}",
        "balance": 1000000.0,  # Shop has a large balance
        "type": "Business"
    }
    
    db.users[shop_uid] = shop_user
    db.bank_accounts[shop_account_id] = shop_account
    db.shop_id = shop_uid  # Set the shop_id in the database
    
    # Brands are now initialized in Database.__init__
    techpro_id = "techpro"
    gadgetx_id = "gadgetx"

    # Sample products with variations
    products = [
        # TechPro Products
        {
            "brand_id": techpro_id,
            "title": "TechPro Wireless Pro Mouse",
            "description": "Premium wireless mouse with 16000 DPI sensor",
            "price": 49.99,
            "category": "Accessories",
            "rating": 4.8,
            "stock": 150
        },
        {
            "brand_id": techpro_id,
            "title": "TechPro Mechanical Gaming Keyboard",
            "description": "RGB mechanical keyboard with Cherry MX switches",
            "price": 129.99,
            "category": "Accessories",
            "rating": 4.9,
            "stock": 75
        },
        {
            "brand_id": techpro_id,
            "title": "TechPro 4K Webcam Pro",
            "description": "4K webcam with AI auto-focus",
            "price": 89.99,
            "category": "Accessories",
            "rating": 4.7,
            "stock": 100
        },
        {
            "brand_id": techpro_id,
            "title": "TechPro Noise-Cancelling Headphones",
            "description": "Over-ear headphones with active noise cancellation",
            "price": 199.99,
            "category": "Audio",
            "rating": 4.9,
            "stock": 50
        },
        
        # GadgetX Products
        {
            "brand_id": gadgetx_id,
            "title": "GadgetX Wireless Mouse",
            "description": "Ergonomic wireless mouse with long battery life",
            "price": 39.99,
            "category": "Accessories",
            "rating": 4.5,
            "stock": 200
        },
        {
            "brand_id": gadgetx_id,
            "title": "GadgetX Gaming Keyboard",
            "description": "Backlit membrane gaming keyboard",
            "price": 79.99,
            "category": "Accessories",
            "rating": 4.3,
            "stock": 100
        },
        {
            "brand_id": gadgetx_id,
            "title": "GadgetX HD Webcam",
            "description": "1080p webcam with built-in microphone",
            "price": 59.99,
            "category": "Accessories",
            "rating": 4.4,
            "stock": 150
        },
        {
            "brand_id": gadgetx_id,
            "title": "GadgetX Premium Headphones",
            "description": "Comfortable headphones with great sound quality",
            "price": 149.99,
            "category": "Audio",
            "rating": 4.6,
            "stock": 80
        },
        # Additional products for both brands
        {
            "brand_id": techpro_id,
            "title": "TechPro 32-inch 4K Monitor",
            "description": "Professional 4K monitor with HDR support",
            "price": 499.99,
            "category": "Displays",
            "rating": 4.9,
            "stock": 30
        },
        {
            "brand_id": gadgetx_id,
            "title": "GadgetX 27-inch Gaming Monitor",
            "description": "144Hz gaming monitor with 1ms response time",
            "price": 349.99,
            "category": "Displays",
            "rating": 4.7,
            "stock": 40
        }
    ]

    # Add products to database
    for product_data in products:
        pid = str(uuid4())
        db.products[pid] = {
            "id": pid,
            **product_data
        }

seed()
