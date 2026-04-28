import { useEffect, useRef, useState } from 'react';
import MessageInput from './MessageInput.jsx';
import {
  MagnifyingGlassIcon,
  PhoneIcon,
  VideoCameraIcon,
  XMarkIcon,
  TrashIcon,
  LockClosedIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  NoSymbolIcon,
} from '@heroicons/react/24/outline';
import OpenConnectLogo from './OpenConnectLogo.jsx';

function formatMsgTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateDivider(d) {
  const date = new Date(d);
  const now = new Date();
  const diffDays = Math.floor((now - date) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

function StatusTicks({ mine, status, participants, myId }) {
  if (!mine) return null;
  const others = participants?.filter((p) => p._id !== myId) || [];
  const delivered = status?.deliveredTo?.some((id) => id !== myId);
  const read = status?.readBy?.some((id) => others.some((o) => o._id === id));
  if (read)
    return (
      <span className="text-[10px] font-bold" style={{ color: 'hsl(22 100% 70%)' }}>
        ✓✓
      </span>
    );
  if (delivered)
    return (
      <span className="text-[10px] opacity-70">✓✓</span>
    );
  return <span className="text-[10px] opacity-50">✓</span>;
}

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

export default function ChatWindow({
  chat,
  messages,
  user,
  typingUsers,
  onSend,
  onSearchQuery,
  onCallVideo,
  onCallAudio,
  dark,
  socket,
  onTypingActivity,
  onDeleteMessage,
  onEditMessage,
  onClearChat,
  onBlockUser,
  isE2EE = false,
  pendingUploads = [],
  onOpenInfo,
  onVotePoll,
}) {
  const bottomRef = useRef(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [menuMsgId, setMenuMsgId] = useState(null);
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);

  const isBlocked = user?.blockedUsers?.map(String).includes(
    chat && !chat.isGroup ? String(chat.participants?.find((p) => String(p._id) !== String(user?.id))?._id) : null
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers, pendingUploads]);

  useEffect(() => {
    if (!searchOpen || !chat?._id) return;
    const t = setTimeout(() => onSearchQuery?.(searchQ.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQ, searchOpen, chat?._id, onSearchQuery]);

  if (!chat) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-transparent">
        <div className="relative animate-scale-in flex flex-col items-center gap-4">
          <OpenConnectLogo size={80} className="workspace-empty-mark" />
          <div className="text-center">
            <h2 className="text-xl font-bold text-foreground">OpenConnect</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Select a conversation to start messaging
            </p>
          </div>
        </div>
      </div>
    );
  }

  const displayName = chat.displayName || chat.name || 'Chat';
  const other = !chat.isGroup && chat.participants?.find((p) => String(p._id) !== String(user?.id));
  const color = avatarColor(displayName);
  const initials = getInitials(displayName);

  // Group messages by date for dividers
  const grouped = [];
  let lastDate = '';
  messages.forEach((m) => {
    const d = new Date(m.createdAt).toDateString();
    if (d !== lastDate) {
      grouped.push({ type: 'divider', date: m.createdAt, key: d });
      lastDate = d;
    }
    grouped.push({ type: 'msg', data: m });
  });

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-transparent">
      {/* ── Header ── */}
      <header className="workspace-chat-header flex items-center gap-3 px-4 py-3">
        <div 
          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer hover:opacity-80 transition"
          onClick={onOpenInfo}
          role="button"
          tabIndex={0}
        >
          {(chat.isGroup ? chat.avatar : other?.avatar) ? (
            <img
              src={chat.isGroup ? chat.avatar : other.avatar}
              alt={displayName}
              className="workspace-avatar-square h-10 w-10 shrink-0 object-cover"
            />
          ) : (
            <div
              className={`workspace-avatar-square flex h-10 w-10 shrink-0 items-center justify-center ${color} text-sm font-bold text-white`}
            >
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-bold text-foreground">{displayName}</h2>
            <p className="flex items-center gap-1.5 truncate text-[11px] text-muted-foreground">
              {isE2EE && (
                <span className="inline-flex items-center gap-1 text-emerald-400">
                  <LockClosedIcon className="h-3 w-3" />
                  End-to-end encrypted
                </span>
              )}
              {!isE2EE && (
                chat.isGroup ? (
                  `${chat.participants?.length || 0} members`
                ) : other?.isOnline ? (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 online-dot inline-block" />
                    Online
                  </>
                ) : other?.lastSeen ? (
                  `Last seen ${new Date(other.lastSeen).toLocaleString()}`
                ) : (
                  'Offline'
                )
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 relative">
          <button
            type="button"
            onClick={() => setSearchOpen((o) => !o)}
            className="ws-icon-btn"
            title="Search"
          >
            {searchOpen ? (
              <XMarkIcon className="h-4 w-4" />
            ) : (
              <MagnifyingGlassIcon className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            onClick={onCallAudio}
            disabled={isBlocked || chat.isGroup}
            className="ws-icon-btn disabled:opacity-30 disabled:cursor-not-allowed"
            title={chat.isGroup ? 'Group calls are not supported' : isBlocked ? 'Cannot call — user is blocked' : 'Voice call'}
          >
            <PhoneIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onCallVideo}
            disabled={isBlocked || chat.isGroup}
            className="ws-icon-btn disabled:opacity-30 disabled:cursor-not-allowed"
            title={chat.isGroup ? 'Group calls are not supported' : isBlocked ? 'Cannot call — user is blocked' : 'Video call'}
          >
            <VideoCameraIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setHeaderMenuOpen((o) => !o)}
            className="ws-icon-btn"
            title="Options"
          >
            <EllipsisVerticalIcon className="h-4 w-4" />
          </button>

          {headerMenuOpen && (
            <div className="absolute top-10 right-0 z-50 animate-scale-in overflow-hidden rounded border border-border bg-card shadow-xl" style={{ minWidth: 160 }}>
              <button
                type="button"
                onClick={() => {
                  setHeaderMenuOpen(false);
                  onClearChat?.();
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                <TrashIcon className="h-4 w-4 shrink-0" />
                Clear chat
              </button>
              {!chat.isGroup && other && (
                <button
                  type="button"
                  onClick={() => {
                    setHeaderMenuOpen(false);
                    onBlockUser?.(other._id, isBlocked);
                  }}
                  className="flex w-full items-center gap-3 border-t border-border px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <NoSymbolIcon className="h-4 w-4 shrink-0" />
                  {isBlocked ? 'Unblock user' : 'Block user'}
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ── Search bar ── */}
      {searchOpen && (
        <div className="workspace-search-row px-4 py-2.5">
          <div className="neu-inset flex items-center gap-2 px-3 py-2">
            <MagnifyingGlassIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              type="search"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search in conversation…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {searchQ && (
              <button
                type="button"
                onClick={() => { setSearchQ(''); onSearchQuery?.(''); }}
                className="text-muted-foreground hover:text-foreground transition"
              >
                <XMarkIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Messages ── */}
      <div className="msg-scroll flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto flex max-w-3xl flex-col gap-1">
          {grouped.map((item) => {
            if (item.type === 'divider') {
              return (
                <div key={item.key} className="flex items-center gap-3 py-3">
                  <div className="h-px flex-1 bg-border/50" />
                  <span className="workspace-date-chip">
                    {formatDateDivider(item.date)}
                  </span>
                  <div className="h-px flex-1 bg-border/50" />
                </div>
              );
            }

            const m = item.data;
            const mine = String(m.sender?._id || m.sender) === String(user?.id);
            const senderName = m.sender?.name || '';
            const senderColor = avatarColor(senderName);

            return (
              <div
                key={m._id}
                className={`msg-row flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
                onMouseEnter={e => e.currentTarget.querySelector('.msg-actions')?.style.setProperty('opacity','1')}
                onMouseLeave={e => { if (menuMsgId !== m._id) e.currentTarget.querySelector('.msg-actions')?.style.setProperty('opacity','0'); }}
              >
                {/* Other's avatar (group) */}
                {!mine && chat.isGroup && (
                  m.sender?.avatar ? (
                    <img
                      src={m.sender.avatar}
                      alt={senderName}
                      className="workspace-avatar-square mb-0.5 h-7 w-7 shrink-0 object-cover"
                    />
                  ) : (
                    <div
                      className={`workspace-avatar-square mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center ${senderColor} text-[10px] font-bold text-white`}
                    >
                      {getInitials(senderName)}
                    </div>
                  )
                )}

                <div className={`flex max-w-[72%] flex-col ${mine ? 'items-end' : 'items-start'}`}>
                  {/* Sender name in group */}
                  {chat.isGroup && !mine && (
                    <span className="mb-1 pl-1 text-[11px] font-semibold text-primary">
                      {senderName}
                    </span>
                  )}

                  {m.type === 'image' && m.mediaUrl ? (
                    // ── Image bubble — no background, image fills edge-to-edge ──
                    <div className="relative overflow-hidden rounded-sm border border-border/40 shadow-md" style={{ minWidth: 160, maxWidth: 280 }}>
                      <a href={m.mediaUrl} target="_blank" rel="noreferrer" className="block">
                        <img
                          src={m.mediaUrl}
                          alt="Image"
                          className="block max-h-72 w-full object-cover"
                        />
                      </a>
                      {/* Time overlay */}
                      <div className="absolute bottom-1.5 right-2 flex items-center gap-1 rounded-full bg-black/50 px-1.5 py-0.5 text-[10px] text-white/90 backdrop-blur-sm">
                        <span>{formatMsgTime(m.createdAt)}</span>
                        <StatusTicks mine={mine} status={m.status} participants={chat.participants} myId={user?.id} />
                      </div>
                    </div>
                  ) : (
                    // ── Text / File bubble ──
                    <div
                      className={`workspace-bubble relative px-3 py-2 flex flex-col min-w-[75px] ${
                        mine ? 'workspace-bubble-mine' : 'workspace-bubble-theirs'
                      }`}
                    >
                      {/* File attachment */}
                      {m.type === 'file' && m.mediaUrl && (
                        <a
                          href={m.mediaUrl}
                          target="_blank"
                          rel="noreferrer"
                          download={m.fileName}
                          className="mb-1 flex items-center gap-2.5 rounded border border-white/20 bg-black/10 px-3 py-2 text-sm transition hover:bg-black/20"
                        >
                          <span className="text-lg">📎</span>
                          <span className="truncate font-medium">{m.fileName || 'File'}</span>
                        </a>
                      )}

                      {/* Content */}
                      {m.type === 'poll' && m.poll ? (
                        <div className="flex flex-col min-w-[200px] mb-1">
                          <p className="font-bold text-sm leading-relaxed mb-3">{m.content || m.poll.question}</p>
                          <div className="space-y-2">
                            {m.poll.options.map((opt, i) => {
                              const totalVotes = m.poll.options.reduce((acc, o) => acc + o.votes.length, 0);
                              const myVote = opt.votes.some(v => String(v) === String(user?.id));
                              const pct = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
                              return (
                                <div key={i} onClick={() => onVotePoll?.(m._id, i)} className={`relative overflow-hidden rounded-md border p-2 cursor-pointer transition ${myVote ? 'border-primary/50 bg-primary/20' : mine ? 'border-white/20 bg-black/10 hover:bg-black/20' : 'border-border bg-background hover:bg-accent/50'}`}>
                                  <div className={`absolute left-0 top-0 bottom-0 ${myVote ? 'bg-primary/30' : mine ? 'bg-white/10' : 'bg-primary/10'}`} style={{ width: `${pct}%`, transition: 'width 0.3s ease' }} />
                                  <div className="relative z-10 flex items-center justify-between gap-3 text-sm">
                                    <span className="font-medium truncate flex-1">{opt.text}</span>
                                    {totalVotes > 0 && <span className="text-xs opacity-80 shrink-0">{pct}% ({opt.votes.length})</span>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <p className="text-[10px] mt-2 opacity-60">Total votes: {m.poll.options.reduce((acc, o) => acc + o.votes.length, 0)}</p>
                        </div>
                      ) : editingMsgId === m._id ? (
                        <div className="mt-1 flex flex-col gap-2">
                          <input
                            type="text"
                            autoFocus
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                onEditMessage?.(m._id, editContent);
                                setEditingMsgId(null);
                              } else if (e.key === 'Escape') {
                                setEditingMsgId(null);
                              }
                            }}
                            className="w-full rounded border border-white/20 bg-black/10 px-2 py-1 text-sm text-white outline-none focus:border-white/40"
                          />
                          <p className="text-[10px] text-white/50">Press Enter to save, Esc to cancel</p>
                        </div>
                      ) : m.content ? (
                        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                          {m.content}
                          {m.editedAt && (
                            <span className="ml-1 text-[10px] italic opacity-60">(edited)</span>
                          )}
                        </p>
                      ) : null}

                      {/* Time + status */}
                      <div
                        className={`self-end mt-1 flex items-center gap-1 text-[10px] ${
                          mine ? 'text-white/70' : 'text-muted-foreground'
                        }`}
                        style={{ lineHeight: 1 }}
                      >
                        <span>{formatMsgTime(m.createdAt)}</span>
                        <StatusTicks mine={mine} status={m.status} participants={chat.participants} myId={user?.id} />
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Message Menu (own messages only) ── */}
                {mine && (
                  <div
                    className="msg-actions relative mb-0.5 shrink-0"
                    style={{ opacity: menuMsgId === m._id ? 1 : 0, transition: 'opacity 0.15s' }}
                  >
                    <button
                      type="button"
                      onClick={() => setMenuMsgId(menuMsgId === m._id ? null : m._id)}
                      className="flex h-7 w-7 items-center justify-center rounded border border-border bg-card text-muted-foreground shadow-sm transition hover:text-foreground hover:border-border/80"
                      title="Options"
                    >
                      <EllipsisVerticalIcon className="h-4 w-4" />
                    </button>

                    {menuMsgId === m._id && (
                      <div
                        className="absolute bottom-8 right-0 z-50 animate-scale-in overflow-hidden rounded border border-border bg-card shadow-xl"
                        style={{ minWidth: 160 }}
                      >
                        {m.type === 'text' && (
                          <button
                            type="button"
                            onClick={() => {
                              setMenuMsgId(null);
                              setEditingMsgId(m._id);
                              setEditContent(m.content);
                            }}
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
                          >
                            <PencilIcon className="h-4 w-4 shrink-0" />
                            Edit
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setMenuMsgId(null);
                            onDeleteMessage?.(m._id);
                          }}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <TrashIcon className="h-4 w-4 shrink-0" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Pending Uploads Skeleton */}
          {pendingUploads?.map((up) => (
            <div key={up.id} className="msg-row flex items-end gap-2 justify-end animate-fade-in-up">
              <div className="flex max-w-[72%] flex-col items-end">
                {up.type === 'image' ? (
                  <div className="relative overflow-hidden rounded-sm border border-border/40 shadow-md" style={{ minWidth: 160, maxWidth: 280 }}>
                    <img src={up.localUrl} alt="Uploading..." className="block max-h-72 w-full object-cover opacity-50 blur-[2px]" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent shadow-md" />
                    </div>
                  </div>
                ) : (
                  <div className="workspace-bubble relative px-3 py-2 flex flex-col min-w-[75px] workspace-bubble-mine opacity-70">
                    <div className="mb-1 flex items-center gap-2.5 rounded border border-white/20 bg-black/10 px-3 py-2 text-sm">
                      <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/50 border-t-transparent" />
                      <span className="truncate font-medium">{up.fileName || 'Uploading...'}</span>
                    </div>
                    <span className="self-end mt-1 text-[10px] text-white/70 italic" style={{ lineHeight: 1 }}>Uploading...</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {typingUsers?.length > 0 && (
            <div className="flex items-end gap-2 animate-fade-in-up">
              <div className="workspace-bubble workspace-bubble-theirs flex items-center gap-1.5 px-4 py-3">
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
              </div>
              <span className="text-[11px] text-muted-foreground">
                {typingUsers.map((t) => t.name).join(', ')} typing…
              </span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Input ── */}
      {isBlocked ? (
        <div className="flex justify-center border-t border-border bg-card px-4 py-4">
          <p className="text-sm font-medium text-destructive">You have blocked this user.</p>
        </div>
      ) : (
        <MessageInput
          onSend={onSend}
          disabled={!socket?.connected}
          dark={dark}
          onAfterChange={onTypingActivity}
        />
      )}
    </div>
  );
}
