/**
 * Yotta Core — Shared API Client
 * 
 * Uporaba:
 *   import api from './api-client.js';
 *   const artikli = await api.get('/admin/api/poslovanje/artikli');
 *   await api.post('/admin/api/poslovanje/narocila', { ... });
 *   await api.patch('/admin/api/poslovanje/odlocitve/3', { status: 'odobreno' });
 */

const YOTTA_CORE_URL = process.env.YOTTA_CORE_URL || 'http://localhost:3100';
let authToken = null;

/**
 * Prijavi se v Yotta Core in shrani token
 * @param {string} password - Geslo za dostop
 */
export async function login(password) {
  const res = await fetch(`${YOTTA_CORE_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: password || process.env.AITECH_CONTROL_PASSWORD || 'admin123' }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const data = await res.json();
  authToken = data.token;
  return data;
}

/**
 * GET zahteva proti Yotta Core API
 */
export async function get(path) {
  const res = await fetch(`${YOTTA_CORE_URL}${path}`, {
    headers: makeHeaders(),
  });
  if (res.status === 401) throw new Error('Unauthorized — call login() first');
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

/**
 * POST zahteva proti Yotta Core API
 */
export async function post(path, body) {
  const res = await fetch(`${YOTTA_CORE_URL}${path}`, {
    method: 'POST',
    headers: makeHeaders(),
    body: JSON.stringify(body),
  });
  if (res.status === 401) throw new Error('Unauthorized — call login() first');
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json();
}

/**
 * PATCH zahteva proti Yotta Core API
 */
export async function patch(path, body) {
  const res = await fetch(`${YOTTA_CORE_URL}${path}`, {
    method: 'PATCH',
    headers: makeHeaders(),
    body: JSON.stringify(body),
  });
  if (res.status === 401) throw new Error('Unauthorized — call login() first');
  if (!res.ok) throw new Error(`PATCH ${path} failed: ${res.status}`);
  return res.json();
}

/**
 * DELETE zahteva proti Yotta Core API
 */
export async function del(path) {
  const res = await fetch(`${YOTTA_CORE_URL}${path}`, {
    method: 'DELETE',
    headers: makeHeaders(),
  });
  if (res.status === 401) throw new Error('Unauthorized — call login() first');
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
  return res.json();
}

function makeHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers['x-admin-token'] = authToken;
  return headers;
}

export default { login, get, post, patch, del };
