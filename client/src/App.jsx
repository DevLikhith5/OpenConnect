import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import { CryptoProvider } from './context/CryptoContext.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ChatApp from './pages/ChatApp.jsx';

function PrivateRoute({ children }) {
  const { token, loading, user } = useAuth();
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!token) return <Navigate to="/login" replace />;
  return (
    <CryptoProvider userId={user?.id}>
      {children}
    </CryptoProvider>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <SocketProvider>
              <ChatApp />
            </SocketProvider>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}
