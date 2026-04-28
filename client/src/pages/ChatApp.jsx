import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useCrypto } from '../context/CryptoContext.jsx';
import { decryptText, encryptText } from '../utils/crypto.js';
import CallView from '../components/CallView.jsx';
import ChatWindow from '../components/ChatWindow.jsx';
import NewChatModal from '../components/NewChatModal.jsx';
import NewGroupModal from '../components/NewGroupModal.jsx';
import Sidebar from '../components/Sidebar.jsx';
import SettingsPanel from '../components/SettingsPanel.jsx';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function ChatApp() {
  const { user, logout, setUser } = useAuth();
  const { socket, connected } = useSocket();
  const { dark } = useTheme();
  const { getSharedKey } = useCrypto();

  // chatId → shared AES-GCM key (null = not a direct E2EE chat)
  const [sharedKey, setSharedKey] = useState(null);
  const sharedKeyRef = useRef(null);
  sharedKeyRef.current = sharedKey;

  const [chats, setChats] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatSearch, setChatSearch] = useState('');
  const [typingMap, setTypingMap] = useState({});
  const [toasts, setToasts] = useState([]);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [mobileSidebar, setMobileSidebar] = useState(true);
  const [activeView, setActiveView] = useState('chat');

  const [incoming, setIncoming] = useState(null);
  const [activeCall, setActiveCall] = useState(null);

  const typingTimer = useRef(null);
  const selectedIdRef = useRef(null);

  const selectedId = selected?._id;
  selectedIdRef.current = selectedId;
  const selectedRef = useRef(null);
  selectedRef.current = selected;

  const loadChats = useCallback(async () => {
    try {
      const data = await api('/api/chats');
      const rawChats = data.chats || [];
      
      const decryptedChats = await Promise.all(
        rawChats.map(async (c) => {
          if (c.lastMessage && c.lastMessage.isEncrypted && c.lastMessage.content) {
            if (!c.isGroup) {
              const peerId = c.participants?.find((p) => String(p._id) !== String(user?.id))?._id;
              if (peerId) {
                const key = await getSharedKey(c._id, peerId);
                if (key) {
                  const plain = await decryptText(key, c.lastMessage.content);
                  return {
                    ...c,
                    lastMessage: {
                      ...c.lastMessage,
                      content: plain ?? '🔒 (cannot decrypt)',
                    },
                  };
                }
              }
            }
          }
          return c;
        })
      );
      
      setChats(decryptedChats);
    } catch (e) {
      console.error(e);
    }
  }, [getSharedKey, user?.id]);

  const loadMessages = useCallback(async (chatId) => {
    try {
      const data = await api(`/api/chats/${chatId}/messages?limit=50`);
      const raw = data.messages || [];
      // Decrypt any E2EE messages
      const key = sharedKeyRef.current;
      const decrypted = await Promise.all(
        raw.map(async (m) => {
          if (m.isEncrypted && m.content && key) {
            const plain = await decryptText(key, m.content);
            return { ...m, content: plain ?? '🔒 (cannot decrypt)' };
          }
          return m;
        })
      );
      setMessages(decrypted);
    } catch (e) {
      console.error(e);
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  useEffect(() => {
    if (!socket) return undefined;

    const onRefresh = () => loadChats();
    const onChatUpdated = () => loadChats();

    const onNewMsg = async ({ message }) => {
      const cid = message.chat;
      if (String(cid) === String(selectedIdRef.current)) {
        let msg = message;
        if (message.isEncrypted && message.content && sharedKeyRef.current) {
          const plain = await decryptText(sharedKeyRef.current, message.content);
          msg = { ...message, content: plain ?? '🔒 (cannot decrypt)' };
        }
        setMessages((prev) => {
          if (prev.some((m) => String(m._id) === String(msg._id))) return prev;
          return [...prev, msg];
        });
        socket.emit('message_delivered', { messageId: message._id, chatId: cid });
        socket.emit('mark_chat_read', { chatId: cid });
      }
      loadChats();
    };

    const onMsgDeleted = ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => String(m._id) !== String(messageId)));
    };

    const onMsgEdited = async ({ messageId, content, editedAt, isEncrypted }) => {
      let finalContent = content;
      const key = sharedKeyRef.current;
      
      if (isEncrypted && key) {
        const plain = await decryptText(key, content);
        finalContent = plain ?? '🔒 (cannot decrypt)';
      }

      setMessages((prev) =>
        prev.map((m) =>
          String(m._id) === String(messageId) ? { ...m, content: finalContent, editedAt } : m
        )
      );
    };

    const onChatCleared = ({ chatId }) => {
      if (String(chatId) === String(selectedIdRef.current)) setMessages([]);
    };

    const onTyping = ({ chatId, userId, typing }) => {
      if (String(userId) === String(user?.id)) return;
      setTypingMap((prev) => {
        const key = String(chatId);
        const names = { ...prev };
        const list = names[key] || [];
        const cur = selectedRef.current;
        const u =
          cur && String(cur._id) === key
            ? cur.participants?.find((p) => String(p._id) === String(userId))
            : null;
        const name = u?.name || 'Someone';
        const uid = String(userId);
        if (typing) {
          if (!list.some((x) => String(x.id) === uid)) {
            names[key] = [...list, { id: uid, name }];
          }
        } else {
          names[key] = list.filter((x) => String(x.id) !== uid);
        }
        return names;
      });
    };

    const onStatus = ({ messageId, chatId, deliveredTo, readBy }) => {
      if (String(chatId) !== String(selectedIdRef.current)) return;
      setMessages((prev) =>
        prev.map((m) =>
          String(m._id) === String(messageId)
            ? { ...m, status: { deliveredTo: deliveredTo || [], readBy: readBy || [] } }
            : m
        )
      );
    };

    const onPresence = () => loadChats();

    const onNotif = (n) => {
      if (n.kind === 'message') {
        setToasts((t) => [...t, { id: Date.now(), ...n }]);
        setTimeout(() => {
          setToasts((t) => t.slice(1));
        }, 4000);
        if (Notification.permission === 'granted') {
          new Notification(n.title || 'Message', { body: n.body });
        }
      }
    };

    const onIncomingCall = (p) => {
      setIncoming({
        callId: p.callId,
        fromUserId: p.fromUserId,
        chatId: p.chatId,
        type: p.type || 'video',
        dbCallId: p.dbCallId,
      });
      // Don't push a toast — the incoming call modal already shows
      if (Notification.permission === 'granted') {
        new Notification('Incoming call', { body: 'Someone is calling you' });
      }
    };

    socket.on('chats_refresh', onRefresh);
    socket.on('chat_updated', onChatUpdated);
    socket.on('new_message', onNewMsg);
    socket.on('message_deleted', onMsgDeleted);
    socket.on('message_edited', onMsgEdited);
    socket.on('chat_cleared', onChatCleared);
    socket.on('typing', onTyping);
    socket.on('message_status', onStatus);
    socket.on('presence', onPresence);
    socket.on('notification', onNotif);
    socket.on('call_incoming', onIncomingCall);

    return () => {
      socket.off('chats_refresh', onRefresh);
      socket.off('chat_updated', onChatUpdated);
      socket.off('new_message', onNewMsg);
      socket.off('message_deleted', onMsgDeleted);
      socket.off('message_edited', onMsgEdited);
      socket.off('chat_cleared', onChatCleared);
      socket.off('typing', onTyping);
      socket.off('message_status', onStatus);
      socket.off('presence', onPresence);
      socket.off('notification', onNotif);
      socket.off('call_incoming', onIncomingCall);
    };
  }, [socket, user?.id, loadChats]);

  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!socket || !selectedId) return undefined;
    socket.emit('join_chat', { chatId: selectedId }, () => {});
    socket.emit('mark_chat_read', { chatId: selectedId });
    loadMessages(selectedId);
    return () => {
      socket.emit('leave_chat', { chatId: selectedId });
    };
  }, [socket, selectedId, loadMessages]);

  const selectChat = useCallback(
    async (c) => {
      setSelected(c);
      setActiveView('chat');
      setMobileSidebar(false);

      // Derive E2EE shared key for direct (non-group) chats
      if (!c.isGroup) {
        const peerId = c.participants?.find((p) => String(p._id) !== String(user?.id))?._id;
        const key = peerId ? await getSharedKey(c._id, peerId) : null;
        setSharedKey(key);
      } else {
        setSharedKey(null); // group chats — no E2EE yet
      }
    },
    [getSharedKey, user?.id]
  );

  const handleSend = useCallback(
    async (payload) => {
      if (!selectedId) return;
      const key = sharedKeyRef.current;
      try {
        if (payload.file) {
          const fd = new FormData();
          if (payload.text && key) {
            const ciphertext = await encryptText(key, payload.text);
            fd.append('content', ciphertext);
            fd.append('isEncrypted', 'true');
          } else if (payload.text) {
            fd.append('content', payload.text);
          }
          fd.append('file', payload.file);
          await api(`/api/chats/${selectedId}/messages`, { method: 'POST', body: fd });
        } else if (payload.text) {
          if (key) {
            const ciphertext = await encryptText(key, payload.text);
            await api(`/api/chats/${selectedId}/messages`, {
              method: 'POST',
              body: JSON.stringify({ content: ciphertext, isEncrypted: true }),
            });
          } else {
            await api(`/api/chats/${selectedId}/messages`, {
              method: 'POST',
              body: JSON.stringify({ content: payload.text }),
            });
          }
        }
      } catch (e) {
        alert(e.message || 'Send failed');
      }
    },
    [selectedId]
  );

  const handleSearchInChat = useCallback(
    async (q) => {
      if (!selectedId) return;
      if (!q) {
        loadMessages(selectedId);
        return;
      }
      try {
        const data = await api(`/api/chats/${selectedId}/messages/search?q=${encodeURIComponent(q)}`);
        setMessages(data.messages || []);
      } catch (e) {
        console.error(e);
      }
    },
    [selectedId, loadMessages]
  );

  const typingActivity = useCallback(() => {
    if (!socket || !selectedId) return;
    socket.emit('typing_start', { chatId: selectedId });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit('typing_stop', { chatId: selectedId });
    }, 1200);
  }, [socket, selectedId]);

  const handleDeleteMessage = useCallback(
    async (messageId) => {
      if (!selectedId) return;
      try {
        await api(`/api/chats/${selectedId}/messages/${messageId}`, { method: 'DELETE' });
        setMessages((prev) => prev.filter((m) => String(m._id) !== String(messageId)));
      } catch (e) {
        console.error('Delete failed', e);
      }
    },
    [selectedId]
  );

  const handleEditMessage = useCallback(
    async (messageId, newContent) => {
      if (!selectedId || !newContent.trim()) return;
      try {
        const key = sharedKeyRef.current;
        let finalContent = newContent.trim();
        let isEncrypted = false;
        
        if (key) {
          finalContent = await encryptText(key, finalContent);
          isEncrypted = true;
        }

        const res = await api(`/api/chats/${selectedId}/messages/${messageId}`, {
          method: 'PATCH',
          body: JSON.stringify({ content: finalContent, isEncrypted }),
        });
        
        let plain = res.content;
        if (res.isEncrypted && key) {
           plain = await decryptText(key, res.content) ?? '🔒 (cannot decrypt)';
        }

        setMessages((prev) =>
          prev.map((m) =>
            String(m._id) === String(messageId)
              ? { ...m, content: plain, editedAt: res.editedAt }
              : m
          )
        );
      } catch (e) {
        console.error('Edit failed', e);
      }
    },
    [selectedId]
  );

  const handleClearChat = useCallback(
    async () => {
      if (!selectedId) return;
      if (!window.confirm('Delete all messages in this chat? This cannot be undone.')) return;
      try {
        await api(`/api/chats/${selectedId}/messages`, { method: 'DELETE' });
        setMessages([]);
      } catch (e) {
        console.error('Clear chat failed', e);
        alert(e.message || 'Failed to clear chat');
      }
    },
    [selectedId]
  );

  const handleBlockUser = useCallback(
    async (peerId, currentlyBlocked) => {
      if (!peerId) return;
      try {
        if (currentlyBlocked) {
          await api(`/api/auth/users/${peerId}/block`, { method: 'DELETE' });
        } else {
          await api(`/api/auth/users/${peerId}/block`, { method: 'POST' });
        }
        // Refresh own user data so blockedUsers array is current
        const { user: fresh } = await api('/api/auth/me');
        setUser(fresh);
        loadChats();
      } catch (e) {
        console.error('Block failed', e);
        alert(e.message || 'Action failed');
      }
    },
    [loadChats]
  );

  const typingUsers = useMemo(() => typingMap[selectedId] || [], [typingMap, selectedId]);

  const startOutgoingCall = useCallback(
    (type) => {
      if (!socket || !selected) return;

      const others = selected.participants?.filter(
        (p) => String(p._id) !== String(user?.id)
      ) || [];
      if (others.length === 0) return;

      if (selected.isGroup) {
        alert('Group calls are not currently supported.');
        return;
      } else {
        // Direct 1-on-1 call
        const other = others[0];
        const callId = crypto.randomUUID();
        socket.emit(
          'call_initiate',
          { toUserId: other._id, chatId: selected._id, type, callId },
          (res) => {
            if (res?.error) {
              if (res.error === 'Cannot call this user') {
                alert('You cannot call this user because one of you has blocked the other.');
              } else {
                alert(res.error);
              }
              return;
            }
            setActiveCall({
              role: 'caller',
              callId,
              remoteUserId: other._id,
              peerName: other.name,
              callType: type,
              dbCallId: res?.dbCallId,
            });
          }
        );
      }
    },
    [socket, selected, user?.id]
  );

  const acceptIncoming = useCallback(() => {
    if (!socket || !incoming) return;
    const peer = chats
      .flatMap((c) => c.participants || [])
      .find((p) => String(p._id) === String(incoming.fromUserId));
    socket.emit('call_accept', {
      toUserId: incoming.fromUserId,
      callId: incoming.callId,
    });
    setActiveCall({
      role: 'callee',
      callId: incoming.callId,
      remoteUserId: incoming.fromUserId,
      peerName: peer?.name || 'Caller',
      callType: incoming.type,
      dbCallId: incoming.dbCallId,
    });
    setIncoming(null);
  }, [socket, incoming, chats]);

  const rejectIncoming = useCallback(() => {
    if (!socket || !incoming) return;
    socket.emit('call_reject', {
      toUserId: incoming.fromUserId,
      callId: incoming.callId,
      dbCallId: incoming.dbCallId,
    });
    setIncoming(null);
  }, [socket, incoming]);

  const endCall = useCallback(() => {
    setActiveCall(null);
    // Clear any call-related toasts that may still be showing
    setToasts((t) => t.filter((toast) => toast.kind !== 'call'));
  }, []);

  const pickUserNewChat = useCallback(
    async (u) => {
      try {
        const data = await api('/api/chats/direct', {
          method: 'POST',
          body: JSON.stringify({ userId: u._id }),
        });
        setNewChatOpen(false);
        await loadChats();
        selectChat(data.chat);
      } catch (e) {
        alert(e.message || 'Failed');
      }
    },
    [loadChats, selectChat]
  );

  return (
    <div className="workspace-shell flex h-[100dvh]">
      <div
        className={`${
          mobileSidebar ? 'flex' : 'hidden'
        } absolute inset-0 z-10 md:relative md:z-0 md:flex md:min-w-[320px]`}
      >
        <Sidebar
          chats={chats}
          selectedId={selectedId}
          onSelect={selectChat}
          onNewChat={() => {
            setActiveView('chat');
            setNewChatOpen(true);
          }}
          onNewGroup={() => {
            setActiveView('chat');
            setNewGroupOpen(true);
          }}
          search={chatSearch}
          onSearchChange={setChatSearch}
          onOpenSettings={() => {
            setActiveView('settings');
            setMobileSidebar(false);
          }}
          settingsActive={activeView === 'settings'}
        />
      </div>

      <div className={`workspace-chat-main flex min-h-0 min-w-0 flex-1 flex-col ${mobileSidebar ? 'hidden md:flex' : 'flex'}`}>
        {(selected || activeView === 'settings') && (
          <button
            type="button"
            className="neu-button-sm flex items-center gap-2 border-b border-border px-4 py-2 text-sm md:hidden"
            onClick={() => setMobileSidebar(true)}
          >
            <ArrowLeftIcon className="h-4 w-4" />
            {activeView === 'settings' ? 'Chats' : 'Chats'}
          </button>
        )}
        {activeView === 'settings' ? (
          <SettingsPanel onLogout={logout} />
        ) : (
          <ChatWindow
            chat={selected}
            messages={messages}
            user={user}
            typingUsers={typingUsers}
            onSend={handleSend}
            onSearchQuery={handleSearchInChat}
            onCallVideo={() => startOutgoingCall('video')}
            onCallAudio={() => startOutgoingCall('audio')}
            dark={dark}
            socket={socket}
            onTypingActivity={typingActivity}
            onDeleteMessage={handleDeleteMessage}
            onEditMessage={handleEditMessage}
            onClearChat={handleClearChat}
            onBlockUser={handleBlockUser}
            isE2EE={!!sharedKey}
          />
        )}
      </div>

      <NewChatModal open={newChatOpen} onClose={() => setNewChatOpen(false)} onPickUser={pickUserNewChat} />
      <NewGroupModal
        open={newGroupOpen}
        onClose={() => setNewGroupOpen(false)}
        onCreated={(chat) => {
          setActiveView('chat');
          loadChats();
          selectChat(chat);
        }}
      />

      {incoming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="neu-card w-full max-w-sm p-6 text-center">
            <p className="text-lg font-semibold text-foreground">Incoming {incoming.type} call</p>
            <p className="mt-2 text-sm text-muted-foreground">From a contact</p>
            <div className="mt-6 flex justify-center gap-4">
              <button
                type="button"
                onClick={rejectIncoming}
                className="ws-btn-secondary bg-destructive text-destructive-foreground"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={acceptIncoming}
                className="ws-btn-primary"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {activeCall && socket && (
        <CallView
          socket={socket}
          callId={activeCall.callId}
          remoteUserId={activeCall.remoteUserId}
          isCaller={activeCall.role === 'caller'}
          callType={activeCall.callType}
          dbCallId={activeCall.dbCallId}
          peerName={activeCall.peerName}
          onEnd={endCall}
        />
      )}

      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto max-w-xs neu-card px-4 py-3 text-sm"
          >
            <p className="font-medium text-foreground">{t.title}</p>
            {t.body && <p className="text-muted-foreground">{t.body}</p>}
          </div>
        ))}
      </div>

      {!connected && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-destructive/90 px-3 py-2 text-center text-sm text-destructive-foreground">
          Reconnecting...
        </div>
      )}
    </div>
  );
}
