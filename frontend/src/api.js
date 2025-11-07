const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Common fetch options for all requests
const fetchOptions = {
  mode: 'cors',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
};

// Helper to handle API errors
async function handleResponse(response) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      detail: `HTTP error! status: ${response.status}`
    }));
    
    // Handle authentication errors
    if (response.status === 401) {
      throw new Error(errorData.detail || 'Session expired - Please log in again');
    }
    
    throw new Error(errorData.detail || 'An error occurred while processing your request');
  }
  return response.json();
}

export async function login(phone) {
  try {
    const response = await fetch(`${API_URL}/login`, {
      ...fetchOptions,
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
    return handleResponse(response);
  } catch (error) {
    console.error('Login error:', error);
    throw new Error(error.message || 'Failed to login. Please try again.');
  }
}

export async function searchProducts(token, query, minRating = null, maxPrice = null) {
  try {
    if (!token) {
      throw new Error('No authentication token provided');
    }
    
    const params = new URLSearchParams({
      query: query
    });
    if (minRating !== null) params.append('min_rating', minRating);
    if (maxPrice !== null) params.append('max_price', maxPrice);
    
    const url = `${API_URL}/products/search?${params.toString()}`;
    console.log('Searching products:', url); // Debug log
    
    const response = await fetch(url, {
      ...fetchOptions,
      headers: {
        ...fetchOptions.headers,
        'Authorization': `Bearer ${token}`,
      },
    });
    return handleResponse(response);
  } catch (error) {
    console.error('Product search error:', error);
    throw new Error(`Failed to search products: ${error.message}`);
  }
}

export async function products(token, brand = null, category = null) {
  try {
    if (!token) {
      throw new Error('No authentication token provided');
    }
    
    const params = new URLSearchParams();
    if (brand) params.append('brand', brand);
    if (category) params.append('category', category);
    
    const url = `${API_URL}/products${params.toString() ? '?' + params.toString() : ''}`;
    console.log('Fetching products from:', url); // Debug log
    
    const response = await fetch(url, {
      ...fetchOptions,
      headers: {
        ...fetchOptions.headers,
        'Authorization': `Bearer ${token}`,
      },
    });

    // Debug log
    console.log('Products response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('Products API error:', errorData); // Debug log
      throw new Error(errorData?.detail || `HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Products data:', data); // Debug log
    return data;
  } catch (error) {
    console.error('Products error:', error);
    throw new Error(`Failed to load products: ${error.message}`);
  }
}

export async function agentChat(text, token) {
  try {
    const response = await fetch(`${API_URL}/agent/chat`, {
      ...fetchOptions,
      method: 'POST',
      headers: {
        ...fetchOptions.headers,
        'Authorization': `Bearer ${token}`, // This is still needed for AuthMiddleware
      },
      body: JSON.stringify({ message: text }),
    });
    return handleResponse(response);
  } catch (error) {
    console.error('Chat error:', error);
    throw new Error('Failed to send message. Please try again.');
  }
}

export async function getUserTransactions(userId, token) {
  try {
    const response = await fetch(`${API_URL}/transactions/${userId}`, {
      ...fetchOptions,
      headers: {
        ...fetchOptions.headers,
        'Authorization': `Bearer ${token}`,
      },
    });
    return handleResponse(response);
  } catch (error) {
    console.error('Transactions error:', error);
    throw new Error('Failed to load transactions. Please try again.');
  }
}

export async function getUserActivities(userId, token) {
  try {
    const response = await fetch(`${API_URL}/activities/${userId}`, {
      ...fetchOptions,
      headers: {
        ...fetchOptions.headers,
        'Authorization': `Bearer ${token}`,
      },
    });
    return handleResponse(response);
  } catch (error) {
    console.error('Activities error:', error);
    throw new Error('Failed to load activities. Please try again.');
  }
}

export async function getBalance(userId, token) {
  try {
    const response = await fetch(`${API_URL}/balances/${userId}`, {
      ...fetchOptions,
      headers: {
        ...fetchOptions.headers,
        'Authorization': `Bearer ${token}`,
      },
    });
    return handleResponse(response);
  } catch (error) {
    console.error('Balance error:', error);
    throw new Error('Failed to load balance. Please try again.');
  }
}