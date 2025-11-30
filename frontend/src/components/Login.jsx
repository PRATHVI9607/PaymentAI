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
    setError('');
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

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleLogin();
    }
  };

  const quickLogin = (phoneNumber) => {
    setPhone(phoneNumber);
    setError('');
  };

  const demoAccounts = [
    { phone: '+10000000001', name: 'Alice Johnson', balance: '$5,000' },
    { phone: '+10000000002', name: 'Bob Smith', balance: '$8,500' },
    { phone: '+10000000003', name: 'Carol Davis', balance: '$12,300' }
  ];

  return (
    <div className="login-page">
      <div className="login-background">
        <div className="login-gradient-orb orb-1"></div>
        <div className="login-gradient-orb orb-2"></div>
        <div className="login-gradient-orb orb-3"></div>
      </div>
      
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">
              <div className="logo-icon">💳</div>
              <h1 className="logo-text">PaymentAI</h1>
            </div>
            <p className="login-tagline">Intelligent Payment Solutions</p>
          </div>

          <div className="login-body">
            <h2 className="login-title">Welcome Back</h2>
            <p className="login-subtitle">Enter your phone number to access your account</p>

            <div className="login-form">
              <div className="input-wrapper">
                <label className="input-label">Phone Number</label>
                <div className="input-with-icon">
                  <span className="input-icon">📱</span>
                  <input
                    type="tel"
                    className="login-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="+10000000001"
                    disabled={loading}
                    autoFocus
                  />
                </div>
              </div>

              <button 
                className="login-button"
                onClick={handleLogin} 
                disabled={loading || !phone.trim()}
              >
                {loading ? (
                  <>
                    <span className="button-spinner"></span>
                    Authenticating...
                  </>
                ) : (
                  <>
                    <span className="button-icon">🚀</span>
                    Sign In
                  </>
                )}
              </button>

              {error && (
                <div className="login-error">
                  <span className="error-icon">⚠️</span>
                  {error}
                </div>
              )}
            </div>

            <div className="login-divider">
              <span>Quick Access</span>
            </div>

            <div className="demo-accounts">
              {demoAccounts.map((account) => (
                <button
                  key={account.phone}
                  className="demo-account-card"
                  onClick={() => quickLogin(account.phone)}
                  disabled={loading}
                >
                  <div className="demo-avatar">
                    {account.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="demo-info">
                    <div className="demo-name">{account.name}</div>
                    <div className="demo-phone">{account.phone}</div>
                  </div>
                  <div className="demo-balance">{account.balance}</div>
                </button>
              ))}
            </div>

            <div className="login-footer">
              <p className="footer-note">
                <span className="note-icon">ℹ️</span>
                Demo accounts: +10000000001 through +10000000010
              </p>
            </div>
          </div>
        </div>

        <div className="login-features">
          <div className="feature-item">
            <div className="feature-icon">🤖</div>
            <h3>AI-Powered</h3>
            <p>Smart shopping assistant</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🔒</div>
            <h3>Secure</h3>
            <p>End-to-end encryption</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">⚡</div>
            <h3>Fast</h3>
            <p>Instant transactions</p>
          </div>
        </div>
      </div>
    </div>
  );
}