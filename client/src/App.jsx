import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import { CryptoProvider } from './context/CryptoContext.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ChatApp from './pages/ChatApp.jsx';
import UnderConstruction from './pages/UnderConstruction.jsx';

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
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/app/*"
        element={
          <PrivateRoute>
            <SocketProvider>
              <ChatApp />
            </SocketProvider>
          </PrivateRoute>
        }
      />
      {/* Route all unknown pages to Under Construction */}
      <Route path="*" element={<UnderConstruction />} />
    </Routes>
  );
}
