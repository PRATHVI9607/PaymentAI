// src/components/Login.jsx
import React, { useState } from 'react';
import { login as apiLogin } from '../api';

function Login({ onLoginSuccess, onLoginError, appError }) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const data = await apiLogin(phone);
      onLoginSuccess(data);
    } catch (err) {
      onLoginError(err.detail || 'Login failed. Please check your phone number.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Login to PaymentAI</h2>
      <input
        type="text"
        placeholder="Phone Number (e.g., +10000000001)"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        disabled={loading}
      />
      <button onClick={handleLogin} disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
      {appError && <p className="error-message">{appError}</p>}
      <p className="hint-text">Demo users: +10000000001 to +10000000010</p>
    </div>
  );
}

export default Login;