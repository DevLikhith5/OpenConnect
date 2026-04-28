/**
 * E2EE utilities — built on the browser's native Web Crypto API.
 * Scheme: ECDH P-256 key exchange → AES-256-GCM message encryption.
 *
 * Storage contract:
 *   localStorage['e2ee_private_jwk']  — JWK of the private key (never leaves device)
 *   localStorage['e2ee_public_b64']   — base64(raw public key) — also uploaded to server
 */

const ECDH_PARAMS = { name: 'ECDH', namedCurve: 'P-256' };
const AES_PARAMS  = { name: 'AES-GCM', length: 256 };
const IV_LENGTH   = 12; // bytes for AES-GCM

// ── Helpers ────────────────────────────────────────────────────────────────

function toB64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function fromB64(b64) {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

// ── Key generation & persistence ───────────────────────────────────────────

/** Generate a fresh ECDH key pair and persist to localStorage. */
export async function generateAndStoreKeyPair(userId) {
  const pair = await crypto.subtle.generateKey(ECDH_PARAMS, true, ['deriveKey', 'deriveBits']);

  const privateJwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  const publicRaw  = await crypto.subtle.exportKey('raw',  pair.publicKey);

  localStorage.setItem(`e2ee_private_jwk_${userId}`, JSON.stringify(privateJwk));
  localStorage.setItem(`e2ee_public_b64_${userId}`,  toB64(publicRaw));

  return { publicKeyB64: toB64(publicRaw), pair };
}

/** Load the stored key pair from localStorage, or generate one if absent. */
export async function loadOrGenerateKeyPair(userId) {
  if (!userId) throw new Error("userId is required for E2EE key management");

  const privateKeyName = `e2ee_private_jwk_${userId}`;
  const publicKeyName = `e2ee_public_b64_${userId}`;

  let storedJwk    = localStorage.getItem(privateKeyName);
  let storedPubB64 = localStorage.getItem(publicKeyName);

  // Migrate legacy keys if present
  if (!storedJwk || !storedPubB64) {
    const legacyJwk = localStorage.getItem('e2ee_private_jwk');
    const legacyPub = localStorage.getItem('e2ee_public_b64');
    if (legacyJwk && legacyPub) {
      localStorage.setItem(privateKeyName, legacyJwk);
      localStorage.setItem(publicKeyName, legacyPub);
      storedJwk = legacyJwk;
      storedPubB64 = legacyPub;
    }
  }

  if (storedJwk && storedPubB64) {
    try {
      const privateKey = await crypto.subtle.importKey(
        'jwk',
        JSON.parse(storedJwk),
        ECDH_PARAMS,
        false,
        ['deriveKey', 'deriveBits']
      );
      return { publicKeyB64: storedPubB64, privateKey };
    } catch {
      // Corrupted — regenerate
    }
  }

  const { publicKeyB64, pair } = await generateAndStoreKeyPair(userId);
  return { publicKeyB64, privateKey: pair.privateKey };
}

// ── Peer key import ────────────────────────────────────────────────────────

/** Import a peer's base64 public key for use with ECDH. */
export async function importPeerPublicKey(b64) {
  const raw = fromB64(b64);
  return crypto.subtle.importKey('raw', raw, ECDH_PARAMS, false, []);
}

// ── Shared-secret key derivation ───────────────────────────────────────────

/**
 * Derive a shared AES-256-GCM key from our private key and the peer's public key.
 * The result is cached by chatId in the CryptoContext so this only runs once per chat.
 */
export async function deriveSharedKey(myPrivateKey, peerPublicKey) {
  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: peerPublicKey },
    myPrivateKey,
    AES_PARAMS,
    false,
    ['encrypt', 'decrypt']
  );
}

// ── Encrypt / Decrypt ──────────────────────────────────────────────────────

/**
 * Encrypt a plaintext string.
 * Returns a base64 string of [12-byte IV || ciphertext].
 */
export async function encryptText(sharedKey, plaintext) {
  const iv      = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);
  const cipher  = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, sharedKey, encoded);

  const combined = new Uint8Array(IV_LENGTH + cipher.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipher), IV_LENGTH);
  return toB64(combined.buffer);
}

/**
 * Decrypt a base64 ciphertext produced by encryptText.
 * Returns the original plaintext string, or null on failure.
 */
export async function decryptText(sharedKey, b64) {
  try {
    const combined  = fromB64(b64);
    const iv        = combined.slice(0, IV_LENGTH);
    const cipher    = combined.slice(IV_LENGTH);
    const plainBuf  = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, sharedKey, cipher);
    return new TextDecoder().decode(plainBuf);
  } catch {
    return null; // wrong key or corrupted
  }
}
