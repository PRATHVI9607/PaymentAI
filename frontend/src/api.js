const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Common fetch options for all requests
const fetchOptions = {
  mode: 'cors',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  }
};

export async function login(phone) {
  const r = await fetch(`${API_URL}/login`, {
    ...fetchOptions,
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
  if (!r.ok) throw new Error('Login failed');
  return r.json();
}

export async function products() {
  const r = await fetch(`${API_URL}/products`);
  if (!r.ok) throw new Error('Failed to load products');
  return r.json();
}

export async function agentChat(token, text) {
  const r = await fetch(`${API_URL}/agent/chat`, {
    ...fetchOptions,
    method: 'POST',
    headers: {
      ...fetchOptions.headers,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ token, message: text }),
  });
  if (!r.ok) throw new Error('Chat failed');
  return r.json();
}

export async function getUserTransactions(userId) {
  const r = await fetch(`${API_URL}/transactions/${userId}`);
  if (!r.ok) throw new Error('Failed to load transactions');
  return r.json();
}

export async function getUserActivities(userId) {
  const r = await fetch(`${API_URL}/activities/${userId}`);
  if (!r.ok) throw new Error('Failed to load activities');
  return r.json();
}

export async function getBalance(userId) {
  const r = await fetch(`${API_URL}/balances/${userId}`);
  if (!r.ok) throw new Error('Failed to load balance');
  return r.json();
}
