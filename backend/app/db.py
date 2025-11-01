from typing import Dict, List
from uuid import uuid4

class InMemoryDB:
    def __init__(self):
        self.users: Dict[str, dict] = {}
        self.products: Dict[str, dict] = {}
        self.orders: Dict[str, dict] = {}
        self.sessions: Dict[str, str] = {}  # token -> user_id
        self.transactions: List[dict] = []  # list of all transactions (purchases and transfers)
        self.activity_log: Dict[str, List[dict]] = {}  # user_id -> list of activities
    
    def log_activity(self, user_id: str, activity_type: str, details: dict):
        """Log user activity like transfers, purchases, etc."""
        if user_id not in self.activity_log:
            self.activity_log[user_id] = []
        
        activity = {
            "id": str(uuid4()),
            "type": activity_type,
            "timestamp": "2025-11-01T00:00:00Z",  # You might want to use actual timestamp
            **details
        }
        self.activity_log[user_id].append(activity)
        return activity
    
    def get_user_activities(self, user_id: str, activity_type: str = None) -> List[dict]:
        """Get user activities, optionally filtered by type"""
        activities = self.activity_log.get(user_id, [])
        if activity_type:
            activities = [a for a in activities if a["type"] == activity_type]
        return sorted(activities, key=lambda x: x["timestamp"], reverse=True)

db = InMemoryDB()
