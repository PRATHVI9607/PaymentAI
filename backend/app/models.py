from dataclasses import dataclass
from typing import Optional, Dict

@dataclass
class User:
    id: str
    name: str
    phone: str
    email: str
    balance: float

@dataclass
class Product:
    id: str
    title: str
    description: Optional[str]
    price: float

@dataclass
class Order:
    id: str
    buyer_id: str
    product_id: str
    amount: float
    status: str
