const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

export async function request(path, options = {}) {
  const headers = {
    ...options.headers,
  };

  const method = (options.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    let csrfToken = getCookie('csrftoken');
    if (!csrfToken) {
      try {
        const csrfRes = await fetch(`${API_BASE}/api/csrf/`, { credentials: 'include' });
        const csrfData = await csrfRes.json();
        csrfToken = csrfData.csrfToken;
      } catch (err) {
        console.error('Failed to pre-fetch CSRF token:', err);
      }
    }
    if (csrfToken) {
      headers['X-CSRFToken'] = csrfToken;
    }
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    let errMsg = `Request failed with status ${response.status}`;
    try {
      const errData = await response.json();
      errMsg = errData.detail || errData.error || errData.message || JSON.stringify(errData);
    } catch (_) {}
    throw new Error(errMsg);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}
