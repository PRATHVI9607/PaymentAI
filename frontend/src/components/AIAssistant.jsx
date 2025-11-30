import React, { useState } from 'react';
import { agentChat } from '../api';

export default function AIAssistant({ token, onReply }) {
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
      // Trigger callback for any successful response (orders, transfers, etc.)
      if (r.ok) {
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
    <div className="assistant-section card">
      <div className="assistant-header">
        <h3>AI Shopping Assistant</h3>
        <div className="assistant-badge">Smart Help</div>
      </div>
      <div className="assistant-description">
        Your personal AI assistant can help you find products, compare prices, and make purchases across all stores.
      </div>
      <div className="chat-container">
        <div className="chat-log">
          {log.length === 0 ? (
            <div className="chat-welcome">
              <h4>Hello! How can I help you today?</h4>
              <ul className="example-commands">
                <li>Find me a keyboard with rating above 4.5</li>
                <li>I need a wireless mouse under $50</li>
                <li>Show me the best monitor available</li>
                <li>What's my current balance?</li>
              </ul>
            </div>
          ) : (
            log.map((e, i) => (
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
            ))
          )}
        </div>
        <div className="input-group">
          <input
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about our products..."
            disabled={loading}
          />
          <button onClick={send} disabled={loading} className="primary">
            {loading ? 'Thinking...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}