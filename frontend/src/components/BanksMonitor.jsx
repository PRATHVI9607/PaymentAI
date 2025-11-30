import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function BanksMonitor({ token }) {
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  useEffect(() => {
    fetchBanksData();
    // Refresh every 1 second for real-time updates
    const interval = setInterval(fetchBanksData, 1000);
    return () => clearInterval(interval);
  }, [token]);

  const fetchBanksData = async () => {
    try {
      const response = await axios.get(`${API_URL}/banks`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBanks(response.data || []);
      setError(null);
      setLoading(false);
      setLastUpdate(Date.now());
    } catch (error) {
      console.error('Failed to fetch banks data:', error);
      setError(error.response?.data?.detail || error.message);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading banks data...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
        <div>Failed to load banks data</div>
        <div style={{ fontSize: '0.9rem', marginTop: '0.5rem', color: 'var(--text-light)' }}>{error}</div>
      </div>
    );
  }

  if (!banks || banks.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-light)' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🏦</div>
        <div>No banks available</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '1rem', textAlign: 'right', fontSize: '0.875rem', color: 'var(--text-light)' }}>
        Last updated: {new Date(lastUpdate).toLocaleTimeString()}
      </div>
      <div className="bank-monitor">
        {banks.map((bank, index) => (
          <div key={bank.id || index} className="bank-card">
            <div className="bank-header">
              <div className="bank-icon">🏦</div>
              <div>
                <div className="bank-name">{bank.name}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-light)' }}>
                  {bank.accounts?.length || 0} Accounts • Total: ${bank.total_balance?.toFixed(2) || '0.00'}
                </div>
              </div>
            </div>

          <div className="bank-accounts">
            {bank.accounts && bank.accounts.length > 0 ? (
              bank.accounts.map((account) => (
                <div key={account.id} className="account-item">
                  <div>
                    <div className="account-name">{account.user_name}</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-light)' }}>
                      {account.account_id}
                    </div>
                  </div>
                  <div className="account-balance">
                    ${account.balance.toFixed(2)}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-light)', padding: '1rem' }}>
                No accounts found
              </div>
            )}
          </div>

          {bank.current_transaction && (
            <div className="account-status" style={{ 
              background: bank.current_transaction.status === 'processing' 
                ? 'linear-gradient(135deg, rgba(74, 144, 226, 0.1), rgba(127, 179, 232, 0.1))' 
                : 'linear-gradient(135deg, rgba(72, 187, 120, 0.1), rgba(56, 161, 105, 0.1))',
              animation: bank.current_transaction.status === 'processing' ? 'pulse 2s ease-in-out infinite' : 'none'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem' }}>
                  {bank.current_transaction.status === 'processing' ? '⚡' : '✅'}
                </span>
                <div>
                  <strong>Recent Transaction:</strong> {bank.current_transaction.type}
                  <div style={{ marginTop: '0.25rem', fontSize: '0.875rem' }}>
                    Amount: ${bank.current_transaction.amount.toFixed(2)} • 
                    Status: <span className={`status-badge ${bank.current_transaction.status}`}>
                      {bank.current_transaction.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
    </div>
  );
}
