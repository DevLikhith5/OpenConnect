import { XMarkIcon, NoSymbolIcon, TrashIcon, UserGroupIcon, EnvelopeIcon, PhoneIcon, VideoCameraIcon } from '@heroicons/react/24/outline';
import OpenConnectLogo from './OpenConnectLogo.jsx';

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

export default function ChatInfoPanel({ chat, user, onClose, onBlockUser, onClearChat, onRemoveMember, onPromoteAdmin, onUploadGroupAvatar }) {
  if (!chat) return null;

  const isGroup = chat.isGroup;
  const displayName = chat.displayName || chat.name || 'Chat';
  const other = !isGroup && chat.participants?.find((p) => String(p._id) !== String(user?.id));
  const color = avatarColor(displayName);
  const initials = getInitials(displayName);
  const isBlocked = user?.blockedUsers?.map(String).includes(String(other?._id));
  const amIAdmin = isGroup && chat.admins?.map(String).includes(String(user?.id));

  // Determine avatar to show
  const avatarUrl = isGroup ? chat.avatar : other?.avatar;

  return (
    <div className="flex h-full flex-col bg-card shadow-[-10px_0_30px_rgba(0,0,0,0.1)]">
      <header className="flex h-[68px] items-center justify-start gap-4 border-b border-border bg-background px-4">
        <button onClick={onClose} className="ws-icon-btn">
          <XMarkIcon className="h-5 w-5" />
        </button>
        <h3 className="font-sora font-semibold text-foreground">Contact Info</h3>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center justify-center p-8 border-b border-border/50 bg-background relative group/avatar">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="h-32 w-32 rounded-full object-cover shadow-lg border-4 border-card" />
          ) : (
            <div className={`flex h-32 w-32 items-center justify-center rounded-full ${color} text-4xl font-bold text-white shadow-lg border-4 border-card`}>
              {initials}
            </div>
          )}

          {isGroup && amIAdmin && (
            <label className="absolute top-8 mt-1 flex h-30 w-32 items-center justify-center rounded-full bg-black/50 opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer border-4 border-transparent z-10" style={{ height: '128px' }}>
              <span className="text-white text-xs font-bold shadow-sm">Change Image</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                if (e.target.files?.[0]) onUploadGroupAvatar(e.target.files[0]);
              }} />
            </label>
          )}
          <h2 className="mt-5 font-sora text-2xl font-bold text-foreground text-center">{displayName}</h2>
          {!isGroup && other && (
            <p className="mt-1 text-sm font-medium text-muted-foreground">{other.email}</p>
          )}
          {isGroup && (
            <p className="mt-1 text-sm font-medium text-muted-foreground">Group • {chat.participants?.length || 0} members</p>
          )}

          {!isGroup && (
            <div className="flex items-center gap-6 mt-8">
              <button className="flex flex-col items-center gap-2 text-primary hover:opacity-80 transition">
                 <div className="h-12 w-12 flex items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 shadow-sm">
                   <PhoneIcon className="h-5 w-5" />
                 </div>
                 <span className="text-[11px] font-semibold tracking-wide uppercase">Audio</span>
              </button>
              <button className="flex flex-col items-center gap-2 text-primary hover:opacity-80 transition">
                 <div className="h-12 w-12 flex items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 shadow-sm">
                   <VideoCameraIcon className="h-5 w-5" />
                 </div>
                 <span className="text-[11px] font-semibold tracking-wide uppercase">Video</span>
              </button>
              <button className="flex flex-col items-center gap-2 text-primary hover:opacity-80 transition" onClick={onClose}>
                 <div className="h-12 w-12 flex items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 shadow-sm">
                   <EnvelopeIcon className="h-5 w-5" />
                 </div>
                 <span className="text-[11px] font-semibold tracking-wide uppercase">Message</span>
              </button>
            </div>
          )}
        </div>

        {isGroup && (
          <div className="p-4 border-b border-border/50 bg-background mt-2">
            <h4 className="text-[11px] font-bold text-primary uppercase tracking-widest mb-4 px-2">Participants</h4>
            <div className="space-y-1">
              {chat.participants?.map(p => {
                const isMe = String(p._id) === String(user?.id);
                const isAdmin = chat.admins?.map(String).includes(String(p._id));
                const pColor = avatarColor(p.name);
                const pInitials = getInitials(p.name);
                
                return (
                  <div key={p._id} className="flex items-center gap-3 group p-2 hover:bg-accent/50 rounded-lg transition-colors cursor-pointer relative">
                    {p.avatar ? (
                      <img src={p.avatar} alt={p.name} className="h-10 w-10 rounded-full object-cover border border-border" />
                    ) : (
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${pColor} text-sm font-bold text-white shadow-sm`}>
                        {pInitials}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{isMe ? 'You' : p.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate font-medium">{p.email}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 ml-auto">
                      {isAdmin && (
                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                          Admin
                        </span>
                      )}

                      {amIAdmin && !isMe && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-end gap-1.5">
                          {!isAdmin && (
                             <button onClick={(e) => { e.stopPropagation(); onPromoteAdmin(p._id); }} className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wide">Promote</button>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); onRemoveMember(p._id); }} className="text-[10px] font-bold text-destructive hover:underline uppercase tracking-wide">Remove</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="p-2 space-y-1 bg-background mt-2">
          {!isGroup && other && (
            <button
              onClick={() => onBlockUser?.(other._id, isBlocked)}
              className="flex w-full items-center gap-4 rounded-xl px-4 py-3.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <NoSymbolIcon className="h-5 w-5" />
              {isBlocked ? 'Unblock user' : 'Block user'}
            </button>
          )}
          <button
            onClick={() => onClearChat?.()}
            className="flex w-full items-center gap-4 rounded-xl px-4 py-3.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <TrashIcon className="h-5 w-5" />
            {isGroup ? 'Leave group' : 'Clear chat history'}
          </button>
        </div>
      </div>
    </div>
  );
}
