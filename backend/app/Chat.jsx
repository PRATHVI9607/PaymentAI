// src/components/Chat.jsx
import React, { useState, useEffect, useRef } from 'react';
import { chatWithAgent, getUserActivities } from '../api';
import Message from './Message';

function Chat({ currentUser }) {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (currentUser) {
      setChatHistory([
        { sender: 'AI', text: `Welcome, ${currentUser.name}! Your current balance is $${currentUser.balance?.toFixed(2) || 'N/A'}. How can I help you today?` }
      ]);
      // Optionally load recent activities here
      // getUserActivities(currentUser.id).then(activities => {
      //   // Process and add to chat history if desired
      // }).catch(err => console.error("Failed to load activities:", err));
    }
  }, [currentUser]);

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const handleSendMessage = async () => {
    if (!message.trim() || loading) return;

    const userMessage = { sender: 'You', text: message };
    setChatHistory((prev) => [...prev, userMessage]);
    setMessage('');
    setLoading(true);
    setError(null);

    try {
      const data = await chatWithAgent(message);
      setChatHistory((prev) => [...prev, { sender: 'AI', text: data.reply }]);
    } catch (err) {
      const errorMsg = err.detail || 'Failed to get response from AI.';
      setError(errorMsg);
      setChatHistory((prev) => [...prev, { sender: 'AI', text: `Error: ${errorMsg}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <h3>AI Shopping Assistant</h3>
        <p>Current Balance: <strong>${currentUser.balance?.toFixed(2) || 'N/A'}</strong></p>
      </div>
      <div className="chat-messages">
        {chatHistory.map((msg, index) => (
          <Message key={index} sender={msg.sender} text={msg.text} />
        ))}
        {loading && <Message sender="AI" text="Thinking..." />}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input-area">
        <input
          type="text"
          placeholder="Ask me anything..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          disabled={loading}
        />
        <button onClick={handleSendMessage} disabled={loading}>Send</button>
      </div>
      {error && <p className="error-message">{error}</p>}
    </div>
  );
}

export default Chat;