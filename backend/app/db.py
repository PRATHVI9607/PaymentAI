from typing import Dict, List
from uuid import uuid4
import time
from .logger import log_info, log_error

class Database:
    def __init__(self):
        self.users: Dict[str, dict] = {}
        self.sessions: Dict[str, str] = {}  # token -> user_id
        self.bank_accounts: Dict[str, dict] = {}
        self.transactions: List[dict] = []
        self.activities: List[dict] = []
        self.products: Dict[str, dict] = {}
        self.banks: Dict[str, dict] = {}
        self.brands: Dict[str, dict] = {}
        self.shop_id: str = None
        self.activity_log: Dict[str, List[dict]] = {}
        self.orders: Dict[str, dict] = {}  # Store orders
        self.pending_orders: Dict[str, dict] = {}  # Store pending orders

        # Initialize default brands first
        self._init_default_brands()

    def _init_default_brands(self):
        """Initialize default brands with fixed IDs"""
        self.brands = {
            "techpro": {
                "id": "techpro",
                "name": "TechPro",
                "description": "Premium tech accessories",
                "rating": 4.8
            },
            "gadgetx": {
                "id": "gadgetx",
                "name": "GadgetX",
                "description": "Innovative gadgets for modern life",
                "rating": 4.6
            }
        }
        
    def get_bank_name(self, bank_id: str) -> str:
        return self.banks.get(bank_id, {}).get("name", "Unknown Bank")
    
    def get_brand_name(self, brand_id: str) -> str:
        brand = self.brands.get(brand_id)
        if not brand:
            raise KeyError(f"Brand not found: {brand_id}")
        return brand["name"]
    
    def find_best_price_products(self, query: str, max_price: float = None) -> List[dict]:
        """Find matching products across all brands, sorted by price"""
        # Normalize query and split into terms
        query = query.lower().strip()
        query_terms = set(word.lower() for word in query.split() if len(word) > 1)  # Keep words of length 2+
        
        log_info(f"Search query: '{query}', terms: {query_terms}")
        matches = []
        
        for product in self.products.values():
            # Extract all searchable terms
            title = product["title"].lower()
            description = product.get("description", "").lower()
            category = product.get("category", "").lower()
            brand_id = product.get("brand_id", "").lower()
            
            # Calculate different match types
            exact_title_match = query in title
            exact_desc_match = query in description
            
            title_terms = set(word.lower() for word in title.split() if len(word) > 1)
            desc_terms = set(word.lower() for word in description.split() if len(word) > 1)
            category_terms = {category}
            brand_terms = {brand_id, self.get_brand_name(brand_id).lower()}
            all_terms = title_terms | desc_terms | category_terms | brand_terms
            
            # Calculate scores
            matching_terms = query_terms & all_terms
            title_term_matches = query_terms & title_terms
            
            # Combined scoring with weights
            score = 0
            if exact_title_match:
                score += 1.0  # Perfect title match
            if exact_desc_match:
                score += 0.5  # Description exact match
                
            # Add term match scores
            title_term_score = len(title_term_matches) * 0.3  # Higher weight for title matches
            general_term_score = len(matching_terms) * 0.2     # Lower weight for general matches
            
            score += title_term_score + general_term_score
            
            # Include if there's any meaningful match and price is in range
            if score > 0.2 and (max_price is None or product["price"] <= max_price):
                try:
                    # Add brand info and match score to product
                    product_with_brand = {
                        **product,
                        "brand_name": self.get_brand_name(product["brand_id"]),
                        "brand_info": self.brands[product["brand_id"]],
                        "match_score": score
                    }
                    matches.append(product_with_brand)
                except KeyError:
                    continue
        
        # Sort first by match score (desc), then by rating (desc), then by price (asc)
        return sorted(matches, 
            key=lambda x: (-x["match_score"], -(x.get("rating", 0)), x["price"])
        )
    
    def add_product(self, product_data: dict) -> str:
        """Add a product with validation"""
        if "brand_id" not in product_data or product_data["brand_id"] not in self.brands:
            raise ValueError(f"Invalid brand_id: {product_data.get('brand_id')}")
            
        product_id = str(uuid4())
        self.products[product_id] = {
            "id": product_id,
            **product_data
        }
        return product_id
        
    def get_products(self, brand: str = None, category: str = None) -> List[dict]:
        """Get products with optional filtering"""
        products = []
        
        for product in self.products.values():
            try:
                # Get and validate brand info
                brand_info = self.brands[product["brand_id"]]
                
                # Enrich product with brand info
                enriched_product = {
                    **product,
                    "brand_name": brand_info["name"],
                    "brand_info": {
                        "name": brand_info["name"],
                        "description": brand_info["description"],
                        "rating": brand_info["rating"]
                    }
                }
                
                # Apply filters if specified
                if brand and brand.lower() != brand_info["name"].lower():
                    continue
                if category and category.lower() != product.get("category", "").lower():
                    continue
                    
                products.append(enriched_product)
                
            except KeyError:
                # Skip products with invalid brand references
                continue
                
        return products
    
    def log_activity(self, user_id: str, activity_type: str, details: dict):
        """Log user activity like transfers, purchases, etc."""
        try:
            if not isinstance(user_id, str):
                raise ValueError(f"Invalid user_id: {user_id}")
                
            # Create activity entry
            activity = {
                "id": str(uuid4()),
                "user_id": user_id,
                "type": activity_type,
                "timestamp": time.time()
            }
            
            # Add all additional details
            activity.update(details)
            
            # Initialize user's activity log if needed
            if user_id not in self.activity_log:
                self.activity_log[user_id] = []
                
            # Add to both user's log and global activities
            self.activity_log[user_id].append(activity)
            self.activities.append(activity)
            
            log_info(f"Activity logged for user {user_id}: {activity_type}")
            return activity
            
        except Exception as e:
            log_error(f"Failed to log activity for user {user_id}: {str(e)}")
            raise
    
    def get_user_activities(self, user_id: str, activity_type: str = None) -> List[dict]:
        """Get user activities, optionally filtered by type"""
        try:
            if not user_id:
                raise ValueError("user_id is required")
                
            # Get activities from both sources
            user_activities = self.activity_log.get(user_id, [])
            global_activities = [a for a in self.activities if a.get("user_id") == user_id]
            
            # Combine and deduplicate
            all_activities = []
            seen = set()
            
            for activity in user_activities + global_activities:
                if activity["id"] not in seen:
                    seen.add(activity["id"])
                    all_activities.append(activity)
            
            # Filter by type if specified
            if activity_type:
                all_activities = [a for a in all_activities if a.get("type") == activity_type]
                
            # Sort by timestamp descending
            return sorted(
                all_activities,
                key=lambda x: x.get("timestamp", 0),
                reverse=True
            )
            
        except Exception as e:
            log_error(f"Failed to get activities for user {user_id}: {str(e)}")
            return []  # Return empty list on error
        
    def create_pending_order(self, user_id: str, products: List[dict], total: float) -> str:
        """Create a pending order for the user"""
        order_id = str(uuid4())
        order = {
            "id": order_id,
            "user_id": user_id,
            "products": products,
            "total": total,
            "status": "pending",
            "created_at": time.time()
        }
        self.pending_orders[order_id] = order
        return order_id
        
    def confirm_order(self, order_id: str, payment_id: str = None) -> dict:
        """Confirm a pending order after successful payment"""
        if order_id not in self.pending_orders:
            raise KeyError(f"Order not found: {order_id}")
            
        order = self.pending_orders.pop(order_id)
        order["status"] = "completed"
        order["completed_at"] = time.time()
        order["payment_id"] = payment_id
        
        self.orders[order_id] = order
        
        # Log activity
        self.log_activity(
            order["user_id"],
            "purchase",
            {
                "order_id": order_id,
                "products": [p["title"] for p in order["products"]],
                "total": order["total"],
                "timestamp": order["completed_at"]
            }
        )
        
        return order
        
    def cancel_order(self, order_id: str, reason: str = None) -> dict:
        """Cancel a pending order"""
        if order_id not in self.pending_orders:
            raise KeyError(f"Order not found: {order_id}")
            
        order = self.pending_orders.pop(order_id)
        order["status"] = "cancelled"
        order["cancelled_at"] = time.time()
        order["cancel_reason"] = reason
        
        self.orders[order_id] = order
        return order
        
    def get_order(self, order_id: str) -> dict:
        """Get an order by ID"""
        if order_id in self.orders:
            return self.orders[order_id]
        if order_id in self.pending_orders:
            return self.pending_orders[order_id]
        raise KeyError(f"Order not found: {order_id}")
        
    def get_user_orders(self, user_id: str, include_pending: bool = True) -> List[dict]:
        """Get all orders for a user"""
        orders = []
        
        # Get completed/cancelled orders
        orders.extend([
            order for order in self.orders.values()
            if order["user_id"] == user_id
        ])
        
        # Include pending orders if requested
        if include_pending:
            orders.extend([
                order for order in self.pending_orders.values()
                if order["user_id"] == user_id
            ])
            
        return sorted(orders, key=lambda x: x["created_at"], reverse=True)

# Create global database instance
db = Database()
