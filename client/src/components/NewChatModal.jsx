import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { XMarkIcon, MagnifyingGlassIcon, UserPlusIcon } from '@heroicons/react/24/outline';

const AVATAR_COLORS = [
  'bg-orange-600',
  'bg-blue-600',
  'bg-emerald-600',
  'bg-cyan-600',
  'bg-rose-600',
  'bg-violet-600',
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

export default function NewChatModal({ open, onClose, onPickUser }) {
  const [q, setQ] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (q.trim()) params.set('q', q.trim());
        const data = await api(`/api/chats/users?${params}`);
        if (!cancelled) setUsers(data.users || []);
      } catch {
        if (!cancelled) setUsers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, q]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/70 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="relative animate-scale-in w-full max-w-md overflow-hidden neu-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div>
            <h2 className="font-bold text-foreground">New Chat</h2>
            <p className="text-xs text-muted-foreground">Find someone to message</p>
          </div>
          <button type="button" onClick={onClose} className="ws-icon-btn">
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-border/60">
          <div className="neu-inset flex items-center gap-2 px-3 py-2.5">
            <MagnifyingGlassIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or email…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* User list */}
        <ul className="max-h-72 overflow-y-auto msg-scroll">
          {loading && (
            <li className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Searching…
            </li>
          )}
          {!loading && users.length === 0 && (
            <li className="flex flex-col items-center gap-2 p-8 text-center">
              <UserPlusIcon className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No users found</p>
            </li>
          )}
          {!loading &&
            users.map((u) => {
              const color = avatarColor(u.name);
              const initials = getInitials(u.name);
              return (
                <li key={u._id}>
                  <button
                    type="button"
                    onClick={() => onPickUser(u)}
                    className="flex w-full items-center gap-3 px-5 py-3 transition hover:bg-accent/60"
                  >
                    {u.avatar ? (
                      <img
                        src={u.avatar}
                        alt={u.name}
                        className="workspace-avatar-square h-10 w-10 shrink-0 object-cover"
                      />
                    ) : (
                      <div
                        className={`workspace-avatar-square flex h-10 w-10 shrink-0 items-center justify-center ${color} text-sm font-bold text-white`}
                      >
                        {initials}
                      </div>
                    )}
                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate text-sm font-semibold text-foreground">{u.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    {u.isOnline && (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 online-dot" />
                        Online
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
        </ul>
      </div>
    </div>
  );
}
