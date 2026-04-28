import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import OpenConnectLogo from './OpenConnectLogo.jsx';
import {
  ArrowRightOnRectangleIcon,
  CameraIcon,
  CheckIcon,
  MoonIcon,
  SunIcon,
  UserCircleIcon,
  NoSymbolIcon,
} from '@heroicons/react/24/outline';
import { api } from '../api/client.js';

const AVATAR_COLORS = [
  'bg-orange-600', 'bg-blue-600', 'bg-emerald-600',
  'bg-cyan-600',  'bg-rose-600',  'bg-violet-600',
];
function avatarColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/** Renders the avatar photo or falls back to initials if the URL is broken */
function AvatarImg({ src, fallbackName, className }) {
  const [broken, setBroken] = useState(false);
  const color = avatarColor(fallbackName || '');
  const initials = getInitials(fallbackName);

  // Reset when src changes (e.g. fresh upload provides a new valid URL)
  useEffect(() => { setBroken(false); }, [src]);

  if (src && !broken) {
    return (
      <img
        src={src}
        alt={fallbackName || 'Avatar'}
        className={className}
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <div className={`flex items-center justify-center ${color} text-2xl font-bold text-white ${className}`}>
      {initials}
    </div>
  );
}

export default function SettingsPanel({ onLogout }) {
  const { user, updateProfile, uploadAvatar, setUser } = useAuth();
  const { dark, setTheme } = useTheme();

  const [profileName, setProfileName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Avatar upload state
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Blocked users
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);

  useEffect(() => {
    setProfileName(user?.name || '');
  }, [user?.name]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingBlocked(true);
      try {
        const { blockedUsers } = await api('/api/auth/me/blocked');
        if (!cancelled) setBlockedUsers(blockedUsers || []);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoadingBlocked(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.blockedUsers?.length]); // Refetch if blockedUsers count changes

  // ── File handling ──
  function processFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setSaveMessage('Please select an image file.');
      return;
    }
    setAvatarFile(file);
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
    setSaveMessage('');
  }

  function onFileInput(e) {
    processFile(e.target.files?.[0]);
    e.target.value = '';
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    processFile(e.dataTransfer.files?.[0]);
  }

  const onDragOver = useCallback((e) => { e.preventDefault(); setDragging(true); }, []);
  const onDragLeave = useCallback(() => setDragging(false), []);

  // ── Unblock ──
  async function handleUnblock(userId) {
    try {
      await api(`/api/auth/users/${userId}/block`, { method: 'DELETE' });
      setBlockedUsers((prev) => prev.filter((u) => u._id !== userId));
      // Refresh own user data so AuthContext's user.blockedUsers is current
      const { user: fresh } = await api('/api/auth/me');
      setUser(fresh);
    } catch (e) {
      alert('Failed to unblock user');
    }
  }

  // ── Save ──
  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSaveMessage('');
    try {
      // 1. Upload avatar if a new file was selected
      if (avatarFile) {
        setUploading(true);
        await uploadAvatar(avatarFile);
        setUploading(false);
        setAvatarFile(null);
        setAvatarPreview(null);
      }
      // 2. Save name (avatar already updated via uploadAvatar)
      await updateProfile({ name: profileName.trim() });
      setSaveMessage('Profile saved ✓');
    } catch (err) {
      setUploading(false);
      setSaveMessage(err.message || 'Could not save settings');
    } finally {
      setSaving(false);
    }
  }

  const displayAvatar = avatarPreview || user?.avatar;
  const initials = getInitials(user?.name);
  const color = avatarColor(user?.name || '');

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-transparent">
      {/* ── Header ── */}
      <header className="workspace-chat-header flex items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Settings
          </p>
          <h2 className="text-base font-semibold text-foreground">Preferences</h2>
        </div>
        <OpenConnectLogo size={38} className="workspace-avatar-square border border-primary bg-card" />
      </header>

      <div className="msg-scroll flex-1 overflow-y-auto p-4">
        <div className="mx-auto w-full max-w-2xl space-y-4">

          {/* ── Profile Card ── */}
          <section className="border border-border bg-card p-5">
            <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Profile
            </h3>

            {/* Avatar Upload Zone */}
            <div className="mb-5 flex flex-col items-center gap-3">
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                className={`group relative flex h-28 w-28 cursor-pointer items-center justify-center overflow-hidden border-2 transition-all duration-200 ${
                  dragging
                    ? 'border-primary bg-primary/10 scale-105'
                    : 'border-border hover:border-primary/60 hover:bg-accent/30'
                }`}
                title="Click or drop an image to update your avatar"
              >
                {displayAvatar ? (
                  <AvatarImg
                    src={displayAvatar}
                    fallbackName={user?.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className={`flex h-full w-full items-center justify-center ${color} text-2xl font-bold text-white`}>
                    {initials}
                  </div>
                )}

                {/* Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-background/70 opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100">
                  <CameraIcon className="h-6 w-6 text-foreground" />
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-foreground">
                    {dragging ? 'Drop it!' : 'Upload'}
                  </span>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onFileInput}
              />

              <p className="text-center text-[11px] text-muted-foreground">
                Click or drag &amp; drop a photo · max 5 MB
              </p>

              {avatarFile && (
                <p className="flex items-center gap-1 text-[11px] font-medium text-primary">
                  <CheckIcon className="h-3.5 w-3.5" />
                  {avatarFile.name} ready — save to upload
                </p>
              )}
            </div>

            {/* Name + save */}
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Display Name
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="neu-input"
                  placeholder="Your name"
                />
              </div>

              <div className="border border-border bg-secondary/40 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Email
                </p>
                <p className="mt-0.5 text-sm text-foreground">{user?.email}</p>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="ws-btn-primary w-full"
              >
                {uploading ? 'Uploading avatar…' : saving ? 'Saving…' : 'Save Profile'}
              </button>

              {saveMessage && (
                <p className={`text-xs ${saveMessage.includes('✓') ? 'text-emerald-500' : 'text-destructive'}`}>
                  {saveMessage}
                </p>
              )}
            </form>
          </section>

          {/* ── Theme ── */}
          <section className="border border-border bg-card p-4">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Theme
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex items-center justify-center gap-2 ${!dark ? 'ws-btn-primary' : 'ws-btn-secondary'}`}
              >
                <SunIcon className="h-4 w-4" />
                Light
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex items-center justify-center gap-2 ${dark ? 'ws-btn-primary' : 'ws-btn-secondary'}`}
              >
                <MoonIcon className="h-4 w-4" />
                Dark
              </button>
            </div>
          </section>

          {/* ── Blocked Users ── */}
          <section className="border border-border bg-card p-4">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Blocked Users
            </h3>
            {loadingBlocked ? (
              <p className="text-xs text-muted-foreground">Loading...</p>
            ) : blockedUsers.length === 0 ? (
              <p className="text-xs text-muted-foreground">No blocked users.</p>
            ) : (
              <ul className="space-y-2">
                {blockedUsers.map((bu) => (
                  <li key={bu._id} className="flex items-center justify-between border border-border bg-secondary/40 px-3 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <AvatarImg src={bu.avatar} fallbackName={bu.name} className="h-6 w-6 object-cover" />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-foreground">{bu.name}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnblock(bu._id)}
                      className="ml-3 shrink-0 rounded bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary transition hover:bg-primary/20"
                    >
                      Unblock
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ── Account ── */}
          <section className="border border-border bg-card p-4">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Account
            </h3>
            <div className="flex items-center gap-3 border border-border bg-secondary/40 px-3 py-2.5 mb-3">
              {displayAvatar ? (
                <AvatarImg src={displayAvatar} fallbackName={user?.name} className="h-9 w-9 object-cover" />
              ) : (
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center ${color} text-xs font-bold text-white`}>
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{user?.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="flex w-full items-center justify-center gap-2 border border-destructive/60 bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-destructive transition hover:bg-destructive/20"
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4" />
              Log Out
            </button>
          </section>

        </div>
      </div>
    </div>
  );
}
