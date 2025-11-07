import React, { useState, useEffect } from 'react';
import { products, agentChat, getUserTransactions, getUserActivities, getBalance } from './api';
import Login from './components/Login';
import './App.css';

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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Chat({ token, onReply }) {
  const [msg, setMsg] = useState('');
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!msg.trim()) return;
    setLoading(true);
    try {
      const r = await agentChat(msg, token);
      setLog((l) => [...l, { in: msg, out: r }]);
      setMsg('');
      if (r.ok && r.order) {
        onReply && onReply(r);
      }
    } catch (err) {
      setLog((l) => [...l, { in: msg, error: err.message }]);
    } finally {
      setLoading(false);
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      send();
    }
  };

  return (
    <div className="card chat-container">
      <h3>AI Shopping Assistant</h3>
      <div className="chat-log">
        {log.map((e, i) => (
          <div key={i} className="message">
            <div className="message-user">
              <strong>You:</strong> {e.in}
            </div>
            <div className="message-agent">
              {e.error ? (
                <span className="error">{e.error}</span>
              ) : (
                <>
                  <strong>Assistant:</strong>{' '}
                  {e.out.ok ? (
                    e.out.reply
                  ) : (
                    <span className="error">{e.out.reason}</span>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="input-group">
        <input
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Try: buy me a wireless mouse"
          disabled={loading}
        />
        <button onClick={send} disabled={loading}>
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}

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

  if (error) return <div className="error card">{error}</div>;
  if (loading) return <div className="loading">Loading transactions...</div>;

  return (
    <div className="card">
      <h3>Recent Transactions</h3>
      <ul className="transaction-list">
        {transactions.map((tx) => (
          <li key={tx.id} className="transaction-item">
            {tx.from === userId ? (
              <div className="transaction-amount sent">
                Sent ${tx.amount.toFixed(2)} to {tx.to_user}
              </div>
            ) : (
              <div className="transaction-amount received">
                Received ${tx.amount.toFixed(2)} from {tx.from_user}
              </div>
            )}
            <div className="activity-timestamp">
              {new Date(tx.ts * 1000).toLocaleString()}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

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

  if (error) return <div className="error card">{error}</div>;
  if (loading) return <div className="loading">Loading activities...</div>;

  return (
    <div className="card">
      <h3>Activity Log</h3>
      <ul className="activity-list">
        {activities.length === 0 ? (
          <li className="activity-item">No activities found</li>
        ) : (
          activities.map((activity) => (
            <li key={activity.id} className="activity-item">
              <div>{getActivityMessage(activity)}</div>
              <div className="activity-timestamp">
                {new Date(activity.timestamp * 1000).toLocaleString()}
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [session, setSession] = useState(null);
  
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
  const [orderNotification, setOrderNotification] = useState(null);
  const [activeTab, setActiveTab] = useState('shop');
  const [balance, setBalance] = useState(null);
  const [error, setError] = useState(null);

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
    if (!initialized) {
      return; // Wait for initialization
    }

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

  const handleOrderComplete = (r) => {
    if (r && r.order) {
      setOrderNotification({
        id: r.order.id,
        title: r.reply,
      });
      setTimeout(() => setOrderNotification(null), 5000);
      // Refresh balance
      getBalance(session.user.id, session.token)
        .then((data) => {
          setBalance(data.balance);
          setError(null);
        })
        .catch((err) => {
          console.error('Failed to refresh balance:', err);
        });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('session');
    setSession(null);
    setBalance(null);
    setError(null);
    setActiveTab('shop');
  };

  return (
    <div className="container">
      <div className="header">
        <h1>AI Shopping Assistant</h1>
      </div>

      {loading ? (
        <div className="loading card">Loading...</div>
      ) : error ? (
        <div className="error card">
          {error}
          <button onClick={handleLogout} style={{ marginTop: '1rem' }}>
            Logout
          </button>
        </div>
      ) : !session ? (
        <Login onLogin={(r) => setSession(r)} />
      ) : (
        <>
          <div className="user-info">
            <div>
              Welcome back, <strong>{session.user.name}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div className="balance">
                Balance: ${(balance ?? session.user.balance).toFixed(2)}
              </div>
              <button onClick={handleLogout} className="secondary">
                Logout
              </button>
            </div>
          </div>

          {orderNotification && (
            <div className="order-success">{orderNotification.title}</div>
          )}

          <div className="tabs">
            <button
              className={`tab ${activeTab === 'shop' ? 'active' : ''}`}
              onClick={() => setActiveTab('shop')}
            >
              Shop
            </button>
            <button
              className={`tab ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              Chat Assistant
            </button>
            <button
              className={`tab ${activeTab === 'transactions' ? 'active' : ''}`}
              onClick={() => setActiveTab('transactions')}
            >
              Transactions
            </button>
            <button
              className={`tab ${activeTab === 'activity' ? 'active' : ''}`}
              onClick={() => setActiveTab('activity')}
            >
              Activity
            </button>
          </div>

          <div className={`main-content ${activeTab !== 'shop' ? 'no-sidebar' : ''}`}>
            {activeTab === 'shop' && session?.token && (
              <>
                <div className="sidebar">
                  <Shop token={session.token} />
                </div>
                <div className="content">
                  <Chat token={session.token} onReply={handleOrderComplete} />
                </div>
              </>
            )}
            {activeTab === 'chat' && (
              <div className="content">
                <Chat token={session.token} onReply={handleOrderComplete} />
              </div>
            )}
            {activeTab === 'transactions' && (
              <div className="content">
                <Transactions userId={session.user.id} token={session.token} />
              </div>
            )}
            {activeTab === 'activity' && (
              <div className="content">
                <Activities userId={session.user.id} token={session.token} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}