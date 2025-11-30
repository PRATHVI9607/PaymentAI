import React, { useState, useEffect } from 'react';
import { products, agentChat, getUserTransactions, getUserActivities, getBalance } from './api';
import Login from './components/Login';
import BanksMonitor from './components/BanksMonitor';
import GatewayPipeline from './components/GatewayPipeline';
import VoiceRecorder from './components/VoiceRecorder';
import './App.css';

// Shop Component
function Shop({ token }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    products(token)
      .then(data => {
        setItems(data);
        setError(null);
      })
      .catch(err => {
        console.error('Failed to load products:', err);
        setError('Failed to load products');
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (error) return <div className="error">{error}</div>;
  
  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">🛍️ Product Store</h2>
        <p className="page-subtitle">Browse and purchase from our collection</p>
      </div>
      
      {loading ? (
        <div className="loading">Loading products...</div>
      ) : (
        <div className="product-grid">
          {items.map((p) => (
            <div key={p.id} className="product-card">
              <div className="product-image">📦</div>
              <div className="product-title">{p.title}</div>
              <div className="product-brand">by {p.brand_name || 'Unknown'}</div>
              {p.rating && (
                <div className="product-rating">⭐ {p.rating}/5.0</div>
              )}
              <div className="product-price">${p.price.toFixed(2)}</div>
              {p.stock !== undefined && (
                <div className="product-stock">{p.stock} in stock</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Chat Component
function Chat({ token, onReply }) {
  const [msg, setMsg] = useState('');
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(false);

  async function send(message = msg) {
    if (!message.trim()) return;
    setLoading(true);
    try {
      const r = await agentChat(message, token);
      setLog((l) => [...l, { in: message, out: r }]);
      setMsg('');
      // Trigger callback for any successful response (orders, transfers, etc.)
      if (r.ok) {
        onReply && onReply(r);
      }
    } catch (err) {
      setLog((l) => [...l, { in: message, error: err.message }]);
    } finally {
      setLoading(false);
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      send();
    }
  };

  const handleVoiceTranscript = (transcript) => {
    setMsg(transcript);
    // Automatically send the message
    send(transcript);
  };

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">🤖 AI Assistant</h2>
        <p className="page-subtitle">Chat with our intelligent shopping assistant</p>
      </div>
      
      <div className="chat-container">
        <div className="messages">
          {log.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-light)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</div>
              <h4>Start a conversation</h4>
              <p>Ask me to find products, make purchases, or check your balance</p>
              <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--sky-blue)' }}>
                <p>Try: "show me laptops" or "buy wireless mouse"</p>
              </div>
            </div>
          ) : (
            log.map((e, i) => (
              <div key={i}>
                <div className="message user">
                  <div className="message-sender">You</div>
                  <div className="message-content">{e.in}</div>
                </div>
                {e.error ? (
                  <div className="message assistant">
                    <div className="message-sender">Assistant</div>
                    <div className="message-content" style={{ color: 'var(--danger)' }}>
                      Error: {e.error}
                    </div>
                  </div>
                ) : (
                  <div className="message assistant">
                    <div className="message-sender">Assistant</div>
                    <div className="message-content" style={{ color: e.out.ok === false ? 'var(--danger)' : 'inherit' }}>
                      {e.out.reply || (e.out.ok === false ? `Error: ${e.out.reason || 'Unknown error'}` : JSON.stringify(e.out))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        
        <div className="chat-input-area">
          <input
            className="chat-input"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything..."
            disabled={loading}
          />
          <VoiceRecorder onTranscript={handleVoiceTranscript} token={token} />
          <button onClick={() => send()} disabled={loading} className="primary">
            {loading ? '⏳' : '📤'} Send
          </button>
        </div>
      </div>
    </div>
  );
}

// Transactions Component
function Transactions({ userId, token }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getUserTransactions(userId, token)
      .then(data => {
        setTransactions(data);
        setError(null);
      })
      .catch(err => {
        console.error('Failed to load transactions:', err);
        setError('Failed to load transactions');
      })
      .finally(() => setLoading(false));
  }, [userId]);

  if (error) return <div className="error">{error}</div>;
  if (loading) return <div className="loading">Loading transactions...</div>;

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">💸 Transaction History</h2>
        <p className="page-subtitle">View your recent transactions</p>
      </div>
      
      <div className="card">
        <div className="transaction-list">
          {transactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-light)' }}>
              No transactions yet
            </div>
          ) : (
            transactions.map((tx) => (
              <div key={tx.id} className="transaction-item">
                <div className="transaction-details">
                  <div className="transaction-type">
                    {tx.from === userId ? `Sent to ${tx.to_user}` : `Received from ${tx.from_user}`}
                  </div>
                  <div className="transaction-date">
                    {new Date(tx.ts * 1000).toLocaleString()}
                  </div>
                </div>
                <div className={`transaction-amount ${tx.from === userId ? 'negative' : 'positive'}`}>
                  {tx.from === userId ? '-' : '+'}${tx.amount.toFixed(2)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Activities Component
function Activities({ userId, token }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getUserActivities(userId, token)
      .then(data => {
        setActivities(data);
        setError(null);
      })
      .catch(err => {
        console.error('Failed to load activities:', err);
        setError('Failed to load activities');
      })
      .finally(() => setLoading(false));
  }, [userId, token]);

  const getActivityMessage = (activity) => {
    switch (activity.type) {
      case 'transfer_sent':
        return `Sent $${activity.amount.toFixed(2)} to ${activity.to_user}`;
      case 'transfer_received':
        return `Received $${activity.amount.toFixed(2)} from ${activity.from_user}`;
      case 'purchase':
        if (activity.products && activity.products.length > 0) {
          return `Purchased ${activity.products.join(', ')} for $${activity.total.toFixed(2)}`;
        }
        return `Made a purchase for $${activity.total.toFixed(2)}`;
      case 'login':
        return 'Logged in to account';
      default:
        return activity.type.charAt(0).toUpperCase() + activity.type.slice(1);
    }
  };

  if (error) return <div className="error">{error}</div>;
  if (loading) return <div className="loading">Loading activities...</div>;

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">📊 Activity Log</h2>
        <p className="page-subtitle">Track all account activities</p>
      </div>
      
      <div className="card">
        <div className="activity-list">
          {activities.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-light)' }}>
              No activities found
            </div>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="activity-item">
                <div className="activity-time">
                  {new Date(activity.timestamp * 1000).toLocaleString()}
                </div>
                <div className="activity-description">
                  {getActivityMessage(activity)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Main App Component
export default function App() {
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [session, setSession] = useState(null);
  const [activeView, setActiveView] = useState('store');
  const [balance, setBalance] = useState(null);
  const [error, setError] = useState(null);
  const [orderNotification, setOrderNotification] = useState(null);

  // Initialize session on component mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.token && parsed.user && parsed.user.id) {
          setSession(parsed);
        } else {
          console.warn('Invalid session data found');
          localStorage.removeItem('session');
        }
      }
    } catch (err) {
      console.error('Failed to parse session:', err);
      localStorage.removeItem('session');
    } finally {
      setInitialized(true);
    }
  }, []);

  // Handle storage events and session updates
  useEffect(() => {
    const handleStorage = () => {
      const saved = localStorage.getItem('session');
      try {
        const parsed = saved ? JSON.parse(saved) : null;
        if (!parsed || !parsed.token || !parsed.user || !parsed.user.id) {
          setSession(null);
          setBalance(null);
        } else if (JSON.stringify(parsed) !== JSON.stringify(session)) {
          setSession(parsed);
        }
      } catch (err) {
        console.error('Failed to parse session from storage:', err);
        setSession(null);
        setBalance(null);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [session]);

  // Update localStorage and fetch balance when session changes
  useEffect(() => {
    if (!initialized) return;

    if (session?.user?.id && session?.token) {
      localStorage.setItem('session', JSON.stringify(session));
      
      setLoading(true);
      getBalance(session.user.id, session.token)
        .then((data) => {
          setBalance(data.balance);
          setError(null);
        })
        .catch((err) => {
          console.error('Failed to load balance:', err);
          if (err.message.includes('Session expired') || err.message.includes('Please log in')) {
            localStorage.removeItem('session');
            setSession(null);
            setBalance(null);
          } else {
            setError('Failed to load user data');
          }
        })
        .finally(() => setLoading(false));
    } else {
      localStorage.removeItem('session');
      setLoading(false);
    }
  }, [session, initialized]);

  // Real-time balance polling every 2 seconds
  useEffect(() => {
    if (!session?.user?.id || !session?.token) return;

    const intervalId = setInterval(() => {
      getBalance(session.user.id, session.token)
        .then((data) => setBalance(data.balance))
        .catch((err) => console.error('Balance polling error:', err));
    }, 2000);

    return () => clearInterval(intervalId);
  }, [session]);

  const handleOrderComplete = (r) => {
    if (r && r.order) {
      setOrderNotification({
        id: r.order.id,
        title: r.reply,
      });
      setTimeout(() => setOrderNotification(null), 3000);
    }
    
    // Refresh balance immediately for any successful operation
    if (r && r.ok && session?.user?.id && session?.token) {
      getBalance(session.user.id, session.token)
        .then((data) => setBalance(data.balance))
        .catch((err) => {
          console.error('Failed to refresh balance:', err);
        });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('session');
    setSession(null);
    setBalance(null);
  };

  if (!session) {
    return <Login onLogin={setSession} />;
  }

  return (
    <div className="app-container">
      {/* Side Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-header">
          <h1>💳 PaymentAI</h1>
          <div className="subtitle">Smart Shopping Platform</div>
        </div>

        <div className="sidebar-user">
          <div className="user-name">{session.user.name}</div>
          <div className="user-balance">
            ${(balance ?? session.user.balance).toFixed(2)}
          </div>
        </div>

        <div className="sidebar-menu">
          <div
            className={`menu-item ${activeView === 'store' ? 'active' : ''}`}
            onClick={() => setActiveView('store')}
          >
            <span className="menu-item-icon">🛍️</span>
            <span>Store</span>
          </div>
          <div
            className={`menu-item ${activeView === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveView('chat')}
          >
            <span className="menu-item-icon">🤖</span>
            <span>AI Assistant</span>
          </div>
          <div
            className={`menu-item ${activeView === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveView('transactions')}
          >
            <span className="menu-item-icon">💸</span>
            <span>Transactions</span>
          </div>
          <div
            className={`menu-item ${activeView === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveView('activity')}
          >
            <span className="menu-item-icon">📊</span>
            <span>Activity</span>
          </div>
          <div
            className={`menu-item ${activeView === 'gateway' ? 'active' : ''}`}
            onClick={() => setActiveView('gateway')}
          >
            <span className="menu-item-icon">🔐</span>
            <span>Gateway</span>
          </div>
        </div>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-btn">
            🚪 Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        {loading && !initialized ? (
          <div className="loading">Initializing...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : (
          <>
            {orderNotification && (
              <div className="success-message">
                ✅ {orderNotification.title}
              </div>
            )}

            {activeView === 'store' && <Shop token={session.token} />}
            {activeView === 'chat' && <Chat token={session.token} onReply={handleOrderComplete} />}
            {activeView === 'transactions' && <Transactions userId={session.user.id} token={session.token} />}
            {activeView === 'activity' && <Activities userId={session.user.id} token={session.token} />}
            {activeView === 'gateway' && (
              <>
                <div className="page-header">
                  <h2 className="page-title">🔐 Payment Gateway</h2>
                  <p className="page-subtitle">Monitor payment pipeline and transactions</p>
                </div>
                <GatewayPipeline token={session.token} />
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
