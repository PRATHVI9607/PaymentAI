import React, { useState, useEffect } from 'react';
import { products } from '../api';

export default function TechProShop({ token }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    products(token)
      .then(data => {
        // Filter only TechPro products
        const techProItems = data.filter(item => item.brand_name === 'TechPro');
        setItems(techProItems);
        setError(null);
      })
      .catch(err => {
        console.error('Failed to load TechPro products:', err);
        setError('Failed to load products');
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (error) return <div className="error card">{error}</div>;
  
  return (
    <div className="shop-section card">
      <div className="shop-header">
        <h3>TechPro Store</h3>
        <div className="shop-badge premium">Premium Tech</div>
      </div>
      {loading ? (
        <div className="loading">Loading products...</div>
      ) : (
        <div>
          <div className="shop-description">
            Experience premium tech accessories with industry-leading quality and innovation.
          </div>
          <ul className="product-list premium">
            {items.map((p) => (
              <li key={p.id} className="product-item">
                <div className="product-details">
                  <span className="product-title">{p.title}</span>
                  <span className="product-rating">⭐ {p.rating}</span>
                  <span className="product-description">{p.description}</span>
                </div>
                <div className="product-price-section">
                  <span className="price">${p.price.toFixed(2)}</span>
                  <span className="stock">Stock: {p.stock}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}