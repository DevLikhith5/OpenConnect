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

export default function Register() {
  const { signup, loginWithGoogle } = useAuth();
  const { dark } = useTheme();
  const nav = useNavigate();

  const [name, setName] = useState('');
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
      await signup(name, email, password);
      nav('/', { replace: true });
    } catch (e2) {
      setErr(e2.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  async function onGoogleCredential(credential) {
    setErr('');
    setGoogleLoading(true);
    try {
      await loginWithGoogle(credential);
      nav('/', { replace: true });
    } catch (e) {
      setErr(e.message || 'Google sign-up failed');
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
          <h1 className="auth-hero">Create your account and start connecting.</h1>
          <p className="auth-copy">
            Join private chats, group conversations, and voice calls in one focused place.
          </p>
        </aside>

        <section className="auth-panel auth-panel-form">
          <header className="auth-form-header">
            <div>
              <p className="auth-kicker">Account Setup</p>
              <h2 className="auth-title">Create account</h2>
            </div>
          </header>

          {err && <div className="auth-alert">{err}</div>}

          <form onSubmit={onSubmit} className="auth-form">
            <div className="auth-field">
              <label htmlFor="register-name" className="auth-label">
                Full Name
              </label>
              <input
                id="register-name"
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="auth-input"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="register-email" className="auth-label">
                Email Address
              </label>
              <input
                id="register-email"
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
              <label htmlFor="register-password" className="auth-label">
                Password
              </label>
              <div className="auth-password-wrap">
                <input
                  id="register-password"
                  type={showPass ? 'text' : 'password'}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
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
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          {HAS_GOOGLE_AUTH && (
            <>
              <div className="auth-divider">or continue with</div>
              <GoogleSignInButton
                clientId={GOOGLE_CLIENT_ID}
                buttonText="signup_with"
                dark={dark}
                disabled={loading || googleLoading}
                onCredential={onGoogleCredential}
                onError={(e) => setErr(e.message || 'Google sign-up failed')}
              />
            </>
          )}

          <p className="auth-footer-text">
            Already have an account?{' '}
            <Link to="/login" className="auth-inline-link">
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
