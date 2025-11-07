// src/components/Message.jsx
import React from 'react';

function Message({ sender, text }) {
  return (
    <div className={`chat-message ${sender.toLowerCase()}`}>
      <strong>{sender}:</strong> {text}
    </div>
  );
}

export default Message;