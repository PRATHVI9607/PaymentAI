import React, { useState } from 'react';
import { login } from '../api';

export default function Login({ onLogin }) {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!phone.trim()) {
      setError('Please enter a phone number');
      return;
    }
    
    setLoading(true);
    try {
      const r = await login(phone);
      if (r && r.token) {
        localStorage.setItem('session', JSON.stringify(r));
        onLogin(r);
      } else {
        setError('Invalid phone number');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.toString() || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container card">
      <h3>Welcome to PaymentAI</h3>
      <p>Enter your phone number to continue</p>
      <p className="help-text">Try: +10000000001 to +10000000010</p>
      <div className="input-group">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+10000000001"
          disabled={loading}
        />
        <button onClick={handleLogin} disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </div>
      {error && <div className="error">{error}</div>}
    </div>
  );
}