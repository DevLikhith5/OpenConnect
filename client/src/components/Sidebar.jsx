import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';
import {
  PlusIcon,
  UsersIcon,
  MagnifyingGlassIcon,
  Cog6ToothIcon,
  ChatBubbleLeftRightIcon,
  PhoneIcon,
  PhoneArrowUpRightIcon,
  PhoneArrowDownLeftIcon,
  PhoneXMarkIcon,
  VideoCameraIcon,
} from '@heroicons/react/24/outline';

/* ── helpers ─────────────────────────────────────────── */
function formatTime(d) {
  if (!d) return '';
  const date = new Date(d);
  const now = new Date();
  const sameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  if (sameDay) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  'bg-orange-600', 'bg-blue-600', 'bg-emerald-600',
  'bg-cyan-600', 'bg-rose-600', 'bg-violet-600',
];
function avatarColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function formatDuration(secs) {
  if (!secs) return '';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/**
 * AvatarImg — shows a photo if `src` is valid, otherwise falls back to
 * a coloured-initials square. The onError handler catches broken URLs
 * (e.g. old absolute filesystem paths stored before the server-side fix).
 */
function AvatarImg({ src, name, size = 'h-11 w-11', textSize = 'text-sm', extra = '' }) {
  const [broken, setBroken] = useState(false);
  const color = avatarColor(name || '');
  const initials = getInitials(name);

  // Reset broken state when the src URL changes (e.g. after a fresh upload)
  useEffect(() => { setBroken(false); }, [src]);

  if (src && !broken) {
    return (
      <img
        src={src}
        alt={name || 'avatar'}
        className={`workspace-avatar-square shrink-0 object-cover ${size} ${extra}`}
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <div
      className={`workspace-avatar-square flex shrink-0 items-center justify-center ${color} ${textSize} font-bold text-white ${size} ${extra}`}
    >
      {initials}
    </div>
  );
}

/* ── CallRow ─────────────────────────────────────────── */
function CallRow({ call, myId }) {
  const isCaller = String(call.caller?._id) === String(myId);
  const peer = isCaller ? call.callee : call.caller;
  const peerName = peer?.name || 'Unknown';
  const color = avatarColor(peerName);
  const initials = getInitials(peerName);

  const isVideo = call.type === 'video';
  const Icon = isVideo ? VideoCameraIcon : PhoneIcon;

  let statusColor = 'text-emerald-400';
  let DirIcon = isCaller ? PhoneArrowUpRightIcon : PhoneArrowDownLeftIcon;
  if (call.status === 'missed' || call.status === 'rejected') {
    statusColor = 'text-red-400';
    DirIcon = PhoneXMarkIcon;
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-accent/40">
      <div className={`workspace-avatar-square flex h-11 w-11 shrink-0 items-center justify-center ${color} text-sm font-bold text-white`}>
        {initials}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-semibold leading-none text-foreground">{peerName}</span>
          <span className="shrink-0 text-[10px] leading-none text-muted-foreground">{formatTime(call.createdAt)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <DirIcon className={`h-3 w-3 shrink-0 ${statusColor}`} />
          <span className="text-[11px] leading-none text-muted-foreground capitalize">
            {isVideo ? 'Video' : 'Audio'} · {call.status}
            {call.durationSeconds ? ` · ${formatDuration(call.durationSeconds)}` : ''}
          </span>
        </div>
      </div>
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground/50" />
    </div>
  );
}

/* ── Sidebar ─────────────────────────────────────────── */
export default function Sidebar({
  chats,
  selectedId,
  onSelect,
  onNewChat,
  onNewGroup,
  search,
  onSearchChange,
  onOpenSettings,
  settingsActive = false,
}) {
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('chats'); // 'chats' | 'calls'
  const [callHistory, setCallHistory] = useState([]);
  const [callsLoading, setCallsLoading] = useState(false);

  const filtered = useMemo(() => {
    const s = (search || '').toLowerCase();
    if (!s) return chats;
    return chats.filter((c) => (c.displayName || c.name || '').toLowerCase().includes(s));
  }, [chats, search]);

  const loadCalls = useCallback(async () => {
    setCallsLoading(true);
    try {
      const data = await api('/api/calls');
      setCallHistory(data.calls || []);
    } catch (e) {
      console.error(e);
    } finally {
      setCallsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'calls') loadCalls();
  }, [tab, loadCalls]);

  const userInitials = getInitials(user?.name);
  const userColor = avatarColor(user?.name || '');

  return (
    <aside className="workspace-sidebar flex h-full w-full flex-col md:w-[320px]">

      {/* ── Top header bar (WhatsApp-style) ── */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-base font-bold tracking-tight text-foreground">OpenConnect</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onNewChat}
            className="ws-icon-btn"
            title="New chat"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onNewGroup}
            className="ws-icon-btn"
            title="New group"
          >
            <UsersIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex border-b border-border/60">
        <button
          type="button"
          onClick={() => setTab('chats')}
          className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-semibold uppercase tracking-wider transition ${
            tab === 'chats'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ChatBubbleLeftRightIcon className="h-4 w-4" />
          Chats
        </button>
        <button
          type="button"
          onClick={() => setTab('calls')}
          className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-semibold uppercase tracking-wider transition ${
            tab === 'calls'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <PhoneIcon className="h-4 w-4" />
          Calls
        </button>
      </div>

      {/* ── CHATS tab ── */}
      {tab === 'chats' && (
        <>
          <div className="border-b border-border/60 px-4 py-3">
            <div className="neu-inset flex items-center gap-2 px-3 py-2">
              <MagnifyingGlassIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                type="search"
                value={q}
                onChange={(e) => { setQ(e.target.value); onSearchChange(e.target.value); }}
                placeholder="Search conversations..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <ul className="msg-scroll flex-1 overflow-y-auto px-2 pb-2">
            {filtered.map((c) => {
              const active = selectedId === c._id && !settingsActive;
              const displayName = c.displayName || c.name || 'Chat';
              const other = !c.isGroup && c.participants?.find((p) => String(p._id) !== String(user?.id));
              const online = c.isGroup ? null : other?.isOnline;
              const initials = getInitials(displayName);
              const color = avatarColor(displayName);
              const unread = c.unreadCount > 0;

              return (
                <li key={c._id}>
                  <button
                    type="button"
                    onClick={() => onSelect(c)}
                    className={`workspace-chat-item group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-all duration-150 ${
                      active ? 'workspace-chat-item-active' : 'workspace-chat-item-idle'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <AvatarImg
                        src={c.isGroup ? c.avatar : other?.avatar}
                        name={displayName}
                        size="h-11 w-11"
                        extra={active ? 'ring-2 ring-primary/40' : ''}
                      />
                      {online && (
                        <span className="online-dot absolute -bottom-0.5 -right-0.5 inline-block h-3 w-3 rounded-full border-2 border-sidebar bg-emerald-400 shadow-lg" />
                      )}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className={`truncate text-sm font-semibold leading-none ${active ? 'text-primary' : 'text-foreground'}`}>
                          {displayName}
                        </span>
                        <span className="shrink-0 text-[10px] leading-none text-muted-foreground">
                          {formatTime(c.lastMessageAt || c.updatedAt)}
                        </span>
                      </div>
                      <p className="truncate text-[11px] leading-none text-muted-foreground">
                        {c.lastMessage?.isEncrypted
                          ? (c.lastMessage?.content && c.lastMessage?.content !== '🔒 (cannot decrypt)'
                              ? c.lastMessage.content
                              : 'Encrypted message')
                          : c.lastMessage?.type === 'image'
                            ? '📷 Photo'
                            : c.lastMessage?.type === 'file'
                              ? '📎 File'
                              : c.lastMessage?.content || 'No messages yet'}
                      </p>
                    </div>

                    {unread && !active && (
                      <span className="flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center border border-primary bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                        {c.unreadCount > 9 ? '9+' : c.unreadCount}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}

            {filtered.length === 0 && (
              <li className="flex flex-col items-center gap-3 px-4 py-12 text-center">
                <div className="workspace-avatar-square flex h-12 w-12 items-center justify-center border border-border bg-secondary">
                  <UsersIcon className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No conversations yet</p>
                <button type="button" onClick={onNewChat} className="ws-btn-primary px-4 py-2 text-xs">
                  Start chatting
                </button>
              </li>
            )}
          </ul>
        </>
      )}

      {/* ── CALLS tab ── */}
      {tab === 'calls' && (
        <div className="msg-scroll flex-1 overflow-y-auto">
          {callsLoading && (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              Loading…
            </div>
          )}
          {!callsLoading && callHistory.length === 0 && (
            <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
              <div className="workspace-avatar-square flex h-12 w-12 items-center justify-center border border-border bg-secondary">
                <PhoneIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No call history yet</p>
            </div>
          )}
          {!callsLoading && callHistory.map((call) => (
            <CallRow key={call._id} call={call} myId={user?.id} />
          ))}
        </div>
      )}

      {/* ── User chip — pinned to bottom ── */}
      <div className="border-t border-border">
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-accent/50"
        >
          <AvatarImg
            src={user?.avatar}
            name={user?.name}
            size="h-9 w-9"
            textSize="text-sm"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{user?.name}</p>
            <p className="truncate text-[11px] text-muted-foreground">{user?.email}</p>
          </div>
          <Cog6ToothIcon className={`ml-auto h-3.5 w-3.5 shrink-0 transition ${settingsActive ? 'text-primary' : 'text-muted-foreground/50'}`} />
        </button>
      </div>
    </aside>
  );
}
