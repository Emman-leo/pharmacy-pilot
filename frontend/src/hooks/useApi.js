const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getHeaders() {
  const token = localStorage.getItem('pharmacy_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export function useApi() {
  const request = async (method, path, body) => {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: getHeaders(),
      ...(body && { body: JSON.stringify(body) }),
    });
    
    // Handle empty responses or non-JSON content
    const text = await res.text().catch(() => '');
    let data = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (e) {
        // If it's not JSON, return the raw text for error messages
        data = { error: text };
      }
    }
    
    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem('pharmacy_token');
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      }
      const err = new Error(data.error || res.statusText);
      err.data = data;
      throw err;
    }
    return data;
  };

  return {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    put: (path, body) => request('PUT', path, body),
    delete: (path) => request('DELETE', path),
  };
}
