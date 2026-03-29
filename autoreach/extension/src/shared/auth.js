/**
 * Auth helpers — JWT token storage and user session management.
 */

export async function saveToken(token) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ authToken: token }, resolve);
  });
}

export async function getToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['authToken'], (r) => resolve(r.authToken || null));
  });
}

export async function clearToken() {
  return new Promise((resolve) => {
    chrome.storage.local.remove(['authToken', 'currentUser'], resolve);
  });
}

export async function saveUser(user) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ currentUser: user }, resolve);
  });
}

export async function getUser() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['currentUser'], (r) => resolve(r.currentUser || null));
  });
}

export async function isLoggedIn() {
  const token = await getToken();
  return !!token;
}

export async function logout() {
  await clearToken();
}
