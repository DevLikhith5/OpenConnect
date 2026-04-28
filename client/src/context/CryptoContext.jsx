import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import {
  deriveSharedKey,
  importPeerPublicKey,
  loadOrGenerateKeyPair,
} from '../utils/crypto.js';

const CryptoContext = createContext(null);

export function CryptoProvider({ children, userId }) {
  const [ready, setReady] = useState(false);
  const privateKeyRef = useRef(null);
  // chatId → CryptoKey (AES-GCM shared secret)
  const sharedKeysRef = useRef({});

  // On mount (and whenever the logged-in userId changes): initialise key pair
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    (async () => {
      try {
        const { publicKeyB64, privateKey } = await loadOrGenerateKeyPair();
        if (cancelled) return;

        privateKeyRef.current = privateKey;

        // Upload public key to server (idempotent — server just overwrites)
        await api('/api/auth/me/public-key', {
          method: 'PUT',
          body: JSON.stringify({ publicKey: publicKeyB64 }),
        }).catch(() => {}); // non-fatal

        setReady(true);
      } catch (err) {
        console.error('[E2EE] Key init failed:', err);
      }
    })();

    return () => { cancelled = true; };
  }, [userId]);

  /**
   * Get (or derive & cache) the shared AES key for a given direct chat.
   * Returns null for group chats or when the peer has no public key.
   */
  const getSharedKey = useCallback(async (chatId, peerUserId) => {
    if (!chatId || !peerUserId || !privateKeyRef.current) return null;

    if (sharedKeysRef.current[chatId]) return sharedKeysRef.current[chatId];

    try {
      const data = await api(`/api/auth/users/${peerUserId}/public-key`);
      if (!data?.publicKey) return null;

      const peerKey   = await importPeerPublicKey(data.publicKey);
      const sharedKey = await deriveSharedKey(privateKeyRef.current, peerKey);
      sharedKeysRef.current[chatId] = sharedKey;
      return sharedKey;
    } catch (err) {
      console.error('[E2EE] Key derivation failed:', err);
      return null;
    }
  }, []);

  /** Clear cached shared key when switching away from a chat (optional). */
  const clearSharedKey = useCallback((chatId) => {
    delete sharedKeysRef.current[chatId];
  }, []);

  return (
    <CryptoContext.Provider value={{ ready, getSharedKey, clearSharedKey }}>
      {children}
    </CryptoContext.Provider>
  );
}

export function useCrypto() {
  const ctx = useContext(CryptoContext);
  if (!ctx) throw new Error('useCrypto must be used inside <CryptoProvider>');
  return ctx;
}
