import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext.jsx';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) {
      setSocket((prev) => {
        prev?.disconnect();
        return null;
      });
      setConnected(false);
      return;
    }

    const s = io({
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    setSocket(s);

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.disconnect();
      setConnected(false);
      setSocket(null);
    };
  }, [token]);

  const value = useMemo(
    () => ({
      socket,
      connected,
    }),
    [socket, connected]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}
