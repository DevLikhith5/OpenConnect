import { useEffect, useRef, useState } from 'react';
import EmojiPicker from 'emoji-picker-react';
import {
  PaperClipIcon,
  FaceSmileIcon,
  PaperAirplaneIcon,
  XMarkIcon,
  DocumentIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

export default function MessageInput({ onSend, disabled, dark, onAfterChange }) {
  const [text, setText] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [pollOpen, setPollOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const fileRef = useRef(null);
  const textareaRef = useRef(null);

  // Generate object URL for image previews, clean up on change
  useEffect(() => {
    if (!pendingFile) { setPreviewUrl(null); return; }
    if (pendingFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(pendingFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [pendingFile]);

  function submit(e) {
    e?.preventDefault();
    if (disabled) return;
    if (pendingFile) {
      onSend({ file: pendingFile });
      setPendingFile(null);
      return;
    }
    if (pollOpen) {
      const q = pollQuestion.trim();
      const opts = pollOptions.map((o) => o.trim()).filter(Boolean);
      if (!q || opts.length < 2) return;
      onSend({ text: q, type: 'poll', pollOptions: opts });
      setPollOpen(false);
      setPollQuestion('');
      setPollOptions(['', '']);
      return;
    }
    const t = text.trim();
    if (!t) return;
    onSend({ text: t });
    setText('');
    setEmojiOpen(false);
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = '42px';
    }
  }

  function onFile(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f || disabled) return;
    setPendingFile(f);
    setEmojiOpen(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit(e);
    }
  }

  function handleTextChange(e) {
    setText(e.target.value);
    // Auto-resize
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 128) + 'px';
    onAfterChange?.();
  }

  const canSend = !disabled && (text.trim() || pendingFile);

  return (
    <div className="workspace-composer relative px-4 py-3">
      {/* Emoji Picker */}
      {emojiOpen && (
        <div className="absolute bottom-full left-4 z-20 mb-2 animate-scale-in">
          <EmojiPicker
            theme={dark ? 'dark' : 'light'}
            onEmojiClick={(ev) => {
              setText((t) => t + ev.emoji);
              textareaRef.current?.focus();
            }}
            width={300}
            height={370}
            searchDisabled={false}
          />
        </div>
      )}

      {/* File preview */}
      {pendingFile && (
        <div className="mb-3">
          {previewUrl ? (
            /* Image preview */
            <div className="relative w-40 overflow-hidden rounded-sm border border-border/60 shadow-lg">
              <img
                src={previewUrl}
                alt="preview"
                className="block max-h-52 w-full object-cover"
              />
              {/* Gradient overlay with filename */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-4">
                <p className="truncate text-[10px] font-medium text-white/90">{pendingFile.name}</p>
              </div>
              {/* Dismiss */}
              <button
                type="button"
                onClick={() => setPendingFile(null)}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition hover:bg-black/80"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </div>
          ) : (
            /* Non-image file card */
            <div className="flex w-56 items-center gap-3 rounded-sm border border-border/60 bg-secondary px-3 py-2.5 shadow-sm">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary">
                <DocumentIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-foreground">{pendingFile.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {(pendingFile.size / 1024).toFixed(0)} KB
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPendingFile(null)}
                className="shrink-0 text-muted-foreground transition hover:text-foreground"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Poll Maker */}
      {pollOpen && (
        <div className="mb-3 rounded-lg border border-border/50 bg-secondary/30 p-4 shadow-sm animate-scale-in max-w-sm">
          <div className="flex items-center justify-between mb-3">
             <h4 className="text-sm font-bold text-foreground">Create Poll</h4>
             <button type="button" onClick={() => setPollOpen(false)} className="text-muted-foreground hover:text-foreground">
                <XMarkIcon className="h-4 w-4" />
             </button>
          </div>
          <input
            autoFocus
            type="text"
            placeholder="Ask a question..."
            value={pollQuestion}
            onChange={(e) => setPollQuestion(e.target.value)}
            className="w-full mb-3 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground outline-none focus:border-primary/50"
          />
          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
            {pollOptions.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={`Option ${i + 1}`}
                  value={opt}
                  onChange={(e) => {
                    const newOpts = [...pollOptions];
                    newOpts[i] = e.target.value;
                    if (i === pollOptions.length - 1 && e.target.value) newOpts.push('');
                    setPollOptions(newOpts);
                  }}
                  className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary/50"
                />
                {pollOptions.length > 2 && (
                  <button type="button" onClick={() => setPollOptions(pollOptions.filter((_, idx) => idx !== i))} className="text-destructive hover:opacity-80 p-1">
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <button type="button" onClick={submit} disabled={!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2} className="ws-btn-primary px-4 py-1.5 text-xs font-bold disabled:opacity-50">
               Send Poll
            </button>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="flex items-end gap-2">
        {/* Attach */}
        <input ref={fileRef} type="file" className="hidden" onChange={onFile} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
          className="ws-icon-btn h-[44px] w-[44px] shrink-0"
          title="Attach file"
        >
          <PaperClipIcon className="h-5 w-5" />
        </button>

        {/* Emoji */}
        <button
          type="button"
          onClick={() => setEmojiOpen((o) => !o)}
          disabled={disabled}
          className={`ws-icon-btn h-[44px] w-[44px] shrink-0 transition ${emojiOpen ? 'border-primary/60 text-primary' : ''}`}
          title="Emoji"
        >
          <FaceSmileIcon className="h-5 w-5" />
        </button>

        {/* Poll Toggle */}
        <button
          type="button"
          onClick={() => { setPollOpen((o) => !o); setEmojiOpen(false); setPendingFile(null); }}
          disabled={disabled}
          className={`ws-icon-btn h-[44px] w-[44px] shrink-0 transition ${pollOpen ? 'border-primary/60 text-primary bg-primary/5' : ''}`}
          title="Create Poll"
        >
          <ChartBarIcon className="h-5 w-5" />
        </button>

        {/* Textarea */}
        <div className="neu-inset flex-1 overflow-hidden">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? 'Reconnecting…' : 'Type a message…'}
            disabled={disabled || !!pendingFile}
            className="max-h-32 min-h-[42px] w-full resize-none bg-transparent px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-50"
            style={{ height: 42 }}
          />
        </div>

        {/* Send */}
        <button
          type="submit"
          disabled={!canSend}
          className={`workspace-avatar-square flex h-[44px] min-w-[44px] shrink-0 items-center justify-center transition-all duration-200 ${
            canSend
              ? 'ws-btn-primary p-0'
              : 'cursor-not-allowed border border-border/40 bg-secondary text-muted-foreground opacity-50'
          }`}
          title="Send"
        >
          <PaperAirplaneIcon className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
