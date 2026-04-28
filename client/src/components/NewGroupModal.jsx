import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { XMarkIcon, MagnifyingGlassIcon, UserGroupIcon } from '@heroicons/react/24/outline';

export default function NewGroupModal({ open, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [q, setQ] = useState('');
  const [users, setUsers] = useState([]);
  const [picked, setPicked] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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
    return () => {
      cancelled = true;
    };
  }, [open, q]);

  function toggle(u) {
    setPicked((prev) => {
      const id = String(u._id);
      if (prev.some((p) => String(p._id) === id)) return prev.filter((p) => String(p._id) !== id);
      return [...prev, u];
    });
  }

  async function create() {
    if (!name.trim() || picked.length === 0) return;
    setSaving(true);
    try {
      const data = await api('/api/chats/group', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          participantIds: picked.map((p) => p._id),
        }),
      });
      onCreated(data.chat);
      setName('');
      setPicked([]);
      onClose();
    } catch (e) {
      alert(e.message || 'Failed');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="neu-card max-h-[85vh] w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <UserGroupIcon className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-foreground">New group</h2>
          </div>
          <button type="button" onClick={onClose} className="ws-icon-btn">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3 p-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Group name"
            className="neu-input w-full"
          />
          <div className="neu-inset flex items-center gap-2 px-3 py-2">
            <MagnifyingGlassIcon className="h-5 w-5 text-muted-foreground" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Add people"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <ul className="max-h-48 overflow-y-auto border-t border-border">
          {loading && <li className="p-4 text-center text-sm text-muted-foreground">Loading…</li>}
          {!loading &&
            users.map((u) => {
              const sel = picked.some((p) => String(p._id) === String(u._id));
              return (
                <li key={u._id}>
                  <button
                    type="button"
                    onClick={() => toggle(u)}
                    className={`flex w-full items-center gap-3 px-4 py-2 text-left transition ${
                      sel ? 'bg-secondary' : 'hover:bg-muted'
                    }`}
                  >
                    <input type="checkbox" readOnly checked={sel} />
                    <span>{u.name}</span>
                  </button>
                </li>
              );
            })}
        </ul>
        <div className="flex justify-end gap-3 border-t border-border p-4">
          <button type="button" onClick={onClose} className="neu-button">
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || !name.trim() || picked.length === 0}
            onClick={create}
            className="neu-button-primary"
          >
            {saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
