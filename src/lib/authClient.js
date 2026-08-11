const AUTH_TOKEN_KEYS = ["lab_auth_token", "lab_token", "auth_token"];
const ACCOUNT_STORAGE_KEYS = ["phaseone_account", "customer_email"];

export function getClientAuthToken() {
  if (typeof window === "undefined") return "";

  for (const key of AUTH_TOKEN_KEYS) {
    const token = window.localStorage.getItem(key);
    if (token) return token;

    const sessionToken = window.sessionStorage.getItem(key);
    if (sessionToken) return sessionToken;
  }

  return "";
}

export function clearClientAuthSession() {
  if (typeof window === "undefined") return;

  for (const key of [...AUTH_TOKEN_KEYS, ...ACCOUNT_STORAGE_KEYS]) {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  }

  for (const cookieName of AUTH_TOKEN_KEYS) {
    document.cookie = `${cookieName}=; path=/; max-age=0; SameSite=Lax`;
  }
}

export async function requestClientLogout() {
  const token = getClientAuthToken();

  // Make every logout button respond immediately, even if WordPress is down.
  clearClientAuthSession();

  try {
    return await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      keepalive: true,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: "{}",
    });
  } finally {
    clearClientAuthSession();
  }
}
