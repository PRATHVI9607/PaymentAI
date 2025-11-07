import React, { useState, useEffect } from 'react';
import { products } from '../api';

export default function Shop({ token }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!token) {
      return; // Don't fetch without token
    }

    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await products(token);
        setItems(data);
      } catch (err) {
        console.error('Failed to load products:', err);
        
        // Handle auth errors
        if (err.message.includes('Session expired') || err.message.includes('Please log in')) {
          localStorage.removeItem('session');
          window.dispatchEvent(new Event('storage'));
        } else {
          setError('Failed to load products');
          // Retry up to 3 times with exponential backoff
          if (retryCount < 3) {
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
            }, Math.pow(2, retryCount) * 1000);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [token, retryCount]);

  if (!token) return null;
  if (error) return <div className="error card">{error}</div>;
  
  return (
    <div className="card">
      <h3>Available Products</h3>
      {loading ? (
        <div className="loading">Loading products...</div>
      ) : (
        <ul className="product-list">
          {items.map((p) => (
            <li key={p.id} className="product-item">
              <span>{p.title}</span>
              <span className="price">${p.price.toFixed(2)}</span>
              <div className="product-details">
                <span className="brand">{p.brand_name}</span>
                <span className="rating">★ {p.rating}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}