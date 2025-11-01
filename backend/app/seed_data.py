from .db import db
from .models import User, Product
from uuid import uuid4

def seed():
    # create 10 dummy users
    for i in range(1, 11):
        uid = str(uuid4())
        user = {
            "id": uid,
            "name": f"User{i}",
            "phone": f"+100000000{i:02d}",
            "email": f"user{i}@example.com",
            "balance": 1000.0 + i * 100,
        }
        db.users[uid] = user

    # add a merchant account (shop)
    shop_id = str(uuid4())
    db.users[shop_id] = {
        "id": shop_id,
        "name": "Shop",
        "phone": "+19999999999",
        "email": "shop@example.com",
        "balance": 0.0,
    }
    db.shop_id = shop_id

    # sample products
    products = [
        ("Wireless Mouse", 25.0),
        ("Mechanical Keyboard", 80.0),
        ("USB-C Cable", 8.0),
        ("Noise Cancelling Headphones", 120.0),
        ("27-inch Monitor", 220.0),
        ("Laptop Stand", 35.0),
        ("Webcam", 50.0),
    ]
    for title, price in products:
        pid = str(uuid4())
        db.products[pid] = {
            "id": pid,
            "title": title,
            "description": f"{title} at best price",
            "price": price,
        }

seed()
