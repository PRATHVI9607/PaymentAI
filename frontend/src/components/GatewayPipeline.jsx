import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function GatewayPipeline({ token }) {
  const [pipelineStatus, setPipelineStatus] = useState({
    sender_bank: { status: 'idle', name: 'Sender Bank' },
    gateway: { status: 'idle', name: 'Payment Gateway' },
    receiver_bank: { status: 'idle', name: 'Receiver Bank' }
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPipelineStatus();
    const interval = setInterval(fetchPipelineStatus, 2000);
    return () => clearInterval(interval);
  }, [token]);

  const fetchPipelineStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/gateway/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.pipeline) {
        setPipelineStatus(response.data.pipeline);
      }
      if (response.data.recent_transactions) {
        setRecentTransactions(response.data.recent_transactions.slice(0, 5));
      }
      setError(null);
    } catch (error) {
      console.error('Failed to fetch pipeline status:', error);
      setError(error.response?.data?.detail || error.message);
    }
  };

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
        <div>Failed to load gateway status</div>
        <div style={{ fontSize: '0.9rem', marginTop: '0.5rem', color: 'var(--text-light)' }}>{error}</div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'processing':
        return 'processing';
      case 'success':
        return 'success';
      case 'idle':
      default:
        return 'pending';
    }
  };

  return (
    <div className="gateway-pipeline">
      <div className="pipeline-title">💳 Payment Gateway Pipeline</div>
      
      <div className="pipeline-flow">
        <div className="pipeline-stage">
          <div className="pipeline-stage-icon">🏦</div>
          <div className="pipeline-stage-title">{pipelineStatus.sender_bank.name}</div>
          <div className="pipeline-stage-status">
            <span className={`status-badge ${getStatusColor(pipelineStatus.sender_bank.status)}`}>
              {pipelineStatus.sender_bank.status}
            </span>
          </div>
        </div>

        <div className="pipeline-arrow">→</div>

        <div className="pipeline-stage">
          <div className="pipeline-stage-icon">🔐</div>
          <div className="pipeline-stage-title">{pipelineStatus.gateway.name}</div>
          <div className="pipeline-stage-status">
            <span className={`status-badge ${getStatusColor(pipelineStatus.gateway.status)}`}>
              {pipelineStatus.gateway.status}
            </span>
          </div>
        </div>

        <div className="pipeline-arrow">→</div>

        <div className="pipeline-stage">
          <div className="pipeline-stage-icon">🏦</div>
          <div className="pipeline-stage-title">{pipelineStatus.receiver_bank.name}</div>
          <div className="pipeline-stage-status">
            <span className={`status-badge ${getStatusColor(pipelineStatus.receiver_bank.status)}`}>
              {pipelineStatus.receiver_bank.status}
            </span>
          </div>
        </div>
      </div>

      {recentTransactions.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--text-dark)' }}>Recent Pipeline Activity</h3>
          <div className="transaction-list" style={{ maxHeight: '200px' }}>
            {recentTransactions.map((tx, index) => (
              <div key={tx.id || index} className="transaction-item">
                <div className="transaction-details">
                  <div className="transaction-type">{tx.type}</div>
                  <div className="transaction-date">{new Date(tx.timestamp * 1000).toLocaleString()}</div>
                </div>
                <div className={`transaction-amount ${tx.amount > 0 ? 'positive' : 'negative'}`}>
                  ${Math.abs(tx.amount).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
