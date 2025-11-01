import React, {useState, useEffect} from 'react'
import { login, products, agentChat, getUserTransactions, getUserActivities, getBalance } from './api'
import './App.css'

function Login({onLogin}) {
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')

  const handleLogin = async () => {
    try {
      const r = await login(phone)
      if (r && r.token) {
        onLogin(r)
      } else {
        setError('Invalid phone number')
      }
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="login-container card">
      <h3>Welcome to AI Shopping Assistant</h3>
      <p>Enter your phone number to continue</p>
      <p className="help-text">Try: +10000000001 to +10000000010</p>
      <div className="input-group">
        <input 
          value={phone} 
          onChange={e => setPhone(e.target.value)}
          placeholder="+10000000001"
        />
        <button onClick={handleLogin}>Login</button>
      </div>
      {error && <div className="error">{error}</div>}
    </div>
  )
}

function Shop({token}) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    products()
      .then(setItems)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="card">
      <h3>Available Products</h3>
      {loading ? (
        <p>Loading products...</p>
      ) : (
        <ul className="product-list">
          {items.map(p => (
            <li key={p.id} className="product-item">
              <span>{p.title}</span>
              <span className="price">${p.price.toFixed(2)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Chat({token, onReply}) {
  const [msg, setMsg] = useState('')
  const [log, setLog] = useState([])
  const [loading, setLoading] = useState(false)

  async function send() {
    if (!msg.trim()) return
    setLoading(true)
    try {
      const r = await agentChat(token, msg)
      setLog(l => [...l, {in: msg, out: r}])
      setMsg('')
      if (r.ok && r.order) {
        onReply && onReply(r)
      }
    } catch (err) {
      setLog(l => [...l, {in: msg, error: err.message}])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      send()
    }
  }

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
          onChange={e => setMsg(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Try: buy me a wireless mouse"
          disabled={loading}
        />
        <button onClick={send} disabled={loading}>
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  )
}

function Transactions({userId}) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getUserTransactions(userId)
      .then(setTransactions)
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) return <div className="loading">Loading transactions...</div>

  return (
    <div className="card">
      <h3>Recent Transactions</h3>
      <ul className="transaction-list">
        {transactions.map(tx => (
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
  )
}

function Activities({userId}) {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getUserActivities(userId)
      .then(setActivities)
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) return <div className="loading">Loading activities...</div>

  return (
    <div className="card">
      <h3>Activity Log</h3>
      <ul className="activity-list">
        {activities.map(activity => (
          <li key={activity.id} className="activity-item">
            {activity.type === 'transfer_sent' && (
              <div>Sent ${activity.amount.toFixed(2)} to {activity.to_user}</div>
            )}
            {activity.type === 'transfer_received' && (
              <div>Received ${activity.amount.toFixed(2)} from {activity.from_user}</div>
            )}
            {activity.type === 'purchase' && (
              <div>Purchased {activity.product_name} for ${activity.amount.toFixed(2)}</div>
            )}
            <div className="activity-timestamp">{new Date(activity.timestamp).toLocaleString()}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [orderNotification, setOrderNotification] = useState(null)
  const [activeTab, setActiveTab] = useState('shop')
  const [balance, setBalance] = useState(null)

  useEffect(() => {
    if (session) {
      getBalance(session.user.id).then(data => setBalance(data.balance))
    }
  }, [session])

  const handleOrderComplete = (r) => {
    if (r && r.order) {
      setOrderNotification({
        id: r.order.id,
        title: r.reply
      })
      setTimeout(() => setOrderNotification(null), 5000)
      // Refresh balance
      getBalance(session.user.id).then(data => setBalance(data.balance))
    }
  }

  return (
    <div className="container">
      <div className="header">
        <h1>AI Shopping Assistant</h1>
      </div>
      
      {!session && <Login onLogin={(r) => setSession(r)} />}
      
      {session && (
        <>
          <div className="user-info">
            <div>
              Welcome back, <strong>{session.user.name}</strong>
            </div>
            <div className="balance">
              Balance: ${(balance ?? session.user.balance).toFixed(2)}
            </div>
          </div>

          {orderNotification && (
            <div className="order-success">
              {orderNotification.title}
            </div>
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

          <div className={`main-content ${!activeTab.includes('shop') ? 'no-sidebar' : ''}`}>
            {activeTab === 'shop' && (
              <div className="sidebar">
                <Shop token={session.token} />
              </div>
            )}
            <div className="content">
              {activeTab === 'shop' && (
                <Chat 
                  token={session.token} 
                  onReply={handleOrderComplete}
                />
              )}
              {activeTab === 'chat' && (
                <Chat 
                  token={session.token} 
                  onReply={handleOrderComplete}
                />
              )}
              {activeTab === 'transactions' && (
                <Transactions userId={session.user.id} />
              )}
              {activeTab === 'activity' && (
                <Activities userId={session.user.id} />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
