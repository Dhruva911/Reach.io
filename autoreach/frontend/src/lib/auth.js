'use client';

export function saveToken(token) {
  localStorage.setItem('reach_token', token);
}

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('reach_token');
}

export function clearToken() {
  localStorage.removeItem('reach_token');
  localStorage.removeItem('reach_user');
}

export function saveUser(user) {
  localStorage.setItem('reach_user', JSON.stringify(user));
}

export function getUser() {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem('reach_user') || 'null');
  } catch {
    return null;
  }
}

export function isLoggedIn() {
  return !!getToken();
}
