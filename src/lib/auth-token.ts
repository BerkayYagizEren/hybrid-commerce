/**
 * Web Crypto tabanlı, Edge Runtime ve Node.js ile %100 uyumlu oturum token yönetimi.
 * Harici bağımlılık gerektirmeden HMAC SHA-256 ile güvenli imzalama ve doğrulama yapar.
 */

export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  role: "CUSTOMER" | "VENDOR" | "ADMIN";
  roles: ("CUSTOMER" | "VENDOR" | "ADMIN")[];
  exp?: number;
}

export const SESSION_COOKIE_NAME = "hc_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 gün (saniye)

const SECRET_KEY = process.env.AUTH_SECRET || "hybrid-commerce-jwt-secret-key-32chars-minimum-2026!";

// Base64URL Yardımcıları (Edge ve Node uyumlu)
function toBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string): Uint8Array {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getCryptoKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return await crypto.subtle.importKey(
    "raw",
    encoder.encode(SECRET_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/**
 * Kullanıcı oturum payload'unu imzalı bir token haline getirir.
 */
export async function createSessionToken(user: Omit<SessionUser, "exp">): Promise<string> {
  const encoder = new TextEncoder();
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const payload: SessionUser = { ...user, exp };

  const payloadJson = JSON.stringify(payload);
  const payloadB64 = toBase64Url(encoder.encode(payloadJson).buffer);

  const key = await getCryptoKey();
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadB64));
  const sigB64 = toBase64Url(signature);

  return `${payloadB64}.${sigB64}`;
}

/**
 * Token'ın imzasını ve son kullanma tarihini doğrular, geçerliyse SessionUser döner.
 */
export async function verifySessionToken(token?: string | null): Promise<SessionUser | null> {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    return null;
  }

  const [payloadB64, sigB64] = token.split(".");
  if (!payloadB64 || !sigB64) {
    return null;
  }

  try {
    const key = await getCryptoKey();
    const encoder = new TextEncoder();
    const sigBytes = fromBase64Url(sigB64);

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes.buffer as ArrayBuffer,
      encoder.encode(payloadB64)
    );
    if (!isValid) {
      return null;
    }

    const payloadJson = new TextDecoder().decode(fromBase64Url(payloadB64));
    const user = JSON.parse(payloadJson) as SessionUser;

    // Süre kontrolü
    if (user.exp && user.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}
