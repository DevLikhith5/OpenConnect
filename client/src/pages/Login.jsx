import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import GoogleSignInButton from '../components/GoogleSignInButton.jsx';
import OpenConnectLogo from '../components/OpenConnectLogo.jsx';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const HAS_GOOGLE_AUTH = Boolean(GOOGLE_CLIENT_ID);

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const { dark } = useTheme();
  const nav = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      await login(email, password);
      nav('/app', { replace: true });
    } catch (e2) {
      setErr(e2.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function onGoogleCredential(credential) {
    setErr('');
    setGoogleLoading(true);
    try {
      await loginWithGoogle(credential);
      nav('/app', { replace: true });
    } catch (e) {
      setErr(e.message || 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-grid">
        <aside className="auth-panel auth-panel-brand">
          <OpenConnectLogo size={52} className="auth-brand-mark" />
          <p className="auth-kicker">OpenConnect</p>
          <h1 className="auth-hero">Secure conversations for everyone.</h1>
          <p className="auth-copy">
            Built for private communication, group chats, and low-friction collaboration for any
            community.
          </p>
        </aside>

        <section className="auth-panel auth-panel-form">
          <header className="auth-form-header">
            <div>
              <p className="auth-kicker">Account Access</p>
              <h2 className="auth-title">Sign in</h2>
            </div>
          </header>

          {err && <div className="auth-alert">{err}</div>}

          <form onSubmit={onSubmit} className="auth-form">
            <div className="auth-field">
              <label htmlFor="login-email" className="auth-label">
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="auth-input"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="login-password" className="auth-label">
                Password
              </label>
              <div className="auth-password-wrap">
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="auth-input auth-input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="auth-reveal-button"
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading || googleLoading} className="auth-btn-primary">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {HAS_GOOGLE_AUTH && (
            <>
              <div className="auth-divider">or continue with</div>
              <GoogleSignInButton
                clientId={GOOGLE_CLIENT_ID}
                buttonText="signin_with"
                dark={dark}
                disabled={loading || googleLoading}
                onCredential={onGoogleCredential}
                onError={(e) => setErr(e.message || 'Google sign-in failed')}
              />
            </>
          )}

          <p className="auth-footer-text">
            New to OpenConnect?{' '}
            <Link to="/register" className="auth-inline-link">
              Create account
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
