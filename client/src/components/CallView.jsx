import { useEffect, useRef, useState } from 'react';
import {
  MicrophoneIcon,
  VideoCameraIcon,
  PhoneArrowDownLeftIcon,
  SpeakerWaveIcon,
  VideoCameraSlashIcon,
} from '@heroicons/react/24/outline';

const ICE = [{ urls: 'stun:stun.l.google.com:19302' }];

export default function CallView({
  socket,
  callId,
  peers, // array of users { _id, name }
  isCaller,
  callType,
  dbCallId,
  onEnd,
}) {
  const localVideo = useRef(null);
  const localStreamRef = useRef(null);
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  const [remoteStreams, setRemoteStreams] = useState({}); // { [userId]: MediaStream }
  const [status, setStatus] = useState(isCaller ? 'ringing' : 'connecting');
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(callType === 'audio');

  const pcs = useRef(new Map()); // userId -> RTCPeerConnection
  const pendingIce = useRef(new Map()); // userId -> IceCandidate[]

  useEffect(() => {
    if (!socket || !callId) return undefined;

    let cancelled = false;
    const cleanups = [];

    const flushIce = async (uid, pc) => {
      const q = pendingIce.current.get(uid) || [];
      pendingIce.current.set(uid, []);
      for (const c of q) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(c));
        } catch (e) {
          console.warn('ICE', e);
        }
      }
    };

    const createPC = (uid) => {
      if (pcs.current.has(uid)) return pcs.current.get(uid);
      const pc = new RTCPeerConnection({ iceServers: ICE });
      pcs.current.set(uid, pc);

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current));
      }

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit('ice_candidate', {
            toUserId: uid,
            callId,
            candidate: e.candidate.toJSON(),
          });
        }
      };

      pc.ontrack = (e) => {
        const [s] = e.streams;
        if (s) {
          setRemoteStreams((prev) => ({ ...prev, [uid]: s }));
          setStatus('live');
          if (dbCallId) socket.emit('call_connected', { dbCallId });
        }
      };

      return pc;
    };

    const removePC = (uid) => {
      const pc = pcs.current.get(uid);
      if (pc) {
        pc.close();
        pcs.current.delete(uid);
      }
      setRemoteStreams((prev) => {
        const next = { ...prev };
        delete next[uid];
        return next;
      });
      pendingIce.current.delete(uid);
    };

    // ── Start Media & Join Room ──
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: callType === 'video',
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        if (callType === 'video') {
          stream.getVideoTracks().forEach((t) => { t.enabled = !videoOff; });
        }
        if (localVideo.current) localVideo.current.srcObject = stream;

        // Join STUN mesh room
        socket.emit('join_call_room', { callId });
        
        // Let peers know we accepted (for legacy 1on1 callers)
        if (!isCaller) {
          peers.forEach(p => socket.emit('call_accept', { toUserId: p._id, callId }));
        }

      } catch (e) {
        console.error(e);
        onEndRef.current('error');
      }
    })();

    // ── Handlers ──
    const onUserJoined = async ({ userId }) => {
      if (cancelled) return;
      try {
        const pc = createPC(userId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('call_offer', { toUserId: userId, callId, sdp: offer });
      } catch (e) { console.error(e); }
    };
    socket.on('user_joined_call', onUserJoined);
    cleanups.push(() => socket.off('user_joined_call', onUserJoined));

    const onUserLeft = ({ userId }) => {
      removePC(userId);
    };
    socket.on('user_left_call', onUserLeft);
    cleanups.push(() => socket.off('user_left_call', onUserLeft));

    const onOffer = async ({ sdp, fromUserId, callId: cid }) => {
      if (cid !== callId || cancelled) return;
      try {
        const pc = createPC(fromUserId);
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        await flushIce(fromUserId, pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('call_answer', { toUserId: fromUserId, callId, sdp: answer });
      } catch (e) { console.error(e); }
    };
    socket.on('call_offer', onOffer);
    cleanups.push(() => socket.off('call_offer', onOffer));

    const onAnswer = async ({ sdp, fromUserId, callId: cid }) => {
      if (cid !== callId || cancelled) return;
      try {
        const pc = pcs.current.get(fromUserId);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          await flushIce(fromUserId, pc);
        }
      } catch (e) { console.error(e); }
    };
    socket.on('call_answer', onAnswer);
    cleanups.push(() => socket.off('call_answer', onAnswer));

    const onIce = async ({ candidate, fromUserId, callId: cid }) => {
      if (cid !== callId || cancelled || !candidate) return;
      const pc = pcs.current.get(fromUserId);
      if (pc && pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) { console.warn(e); }
      } else {
        const q = pendingIce.current.get(fromUserId) || [];
        q.push(candidate);
        pendingIce.current.set(fromUserId, q);
      }
    };
    socket.on('ice_candidate', onIce);
    cleanups.push(() => socket.off('ice_candidate', onIce));

    const onEnded = ({ callId: cid, fromUserId }) => {
      if (cid === callId) {
        removePC(fromUserId);
        // If it was a 1-on-1 call, end it for me too
        if (peers.length <= 1) {
          onEndRef.current('remote_hangup');
        }
      }
    };
    socket.on('call_ended', onEnded);
    cleanups.push(() => socket.off('call_ended', onEnded));

    const onRejected = ({ callId: cid, fromUserId }) => {
      if (cid === callId) {
        if (peers.length <= 1) onEndRef.current('rejected');
      }
    };
    socket.on('call_rejected', onRejected);
    cleanups.push(() => socket.off('call_rejected', onRejected));

    return () => {
      cancelled = true;
      socket.emit('leave_call_room', { callId });
      cleanups.forEach((fn) => fn());
      pcs.current.forEach((pc) => pc.close());
      pcs.current.clear();
      pendingIce.current.clear();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      setRemoteStreams({});
    };
  }, [socket, callId, isCaller, callType, dbCallId, peers]);

  useEffect(() => {
    const s = localStreamRef.current;
    if (!s) return;
    s.getAudioTracks().forEach((t) => { t.enabled = !muted; });
  }, [muted]);

  useEffect(() => {
    const s = localStreamRef.current;
    if (!s || callType !== 'video') return;
    s.getVideoTracks().forEach((t) => { t.enabled = !videoOff; });
  }, [videoOff, callType]);

  function hangup() {
    socket?.emit('leave_call_room', { callId });
    peers.forEach(p => socket.emit('call_end', { toUserId: p._id, callId, dbCallId }));
    onEndRef.current('local_hangup');
  }

  // Calculate layout for mesh
  const activeStreams = Object.entries(remoteStreams);
  const streamCount = activeStreams.length;
  
  let gridClass = "grid h-full w-full gap-2 p-4";
  if (streamCount === 1) gridClass = "h-full w-full"; // full screen
  else if (streamCount === 2) gridClass += " grid-cols-1 md:grid-cols-2";
  else if (streamCount <= 4) gridClass += " grid-cols-2 grid-rows-2";
  else gridClass += " grid-cols-2 md:grid-cols-3 grid-rows-3";

  return (
    <div className="fixed inset-0 z-50 bg-black">
      
      {/* ── Remote Videos / Avatars ── */}
      <div className={gridClass}>
        {streamCount === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 bg-background w-full">
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-primary/10 text-5xl font-bold text-primary ring-4 ring-primary/30">
              {peers.length > 1 ? '👥' : (peers[0]?.name?.slice(0, 1)?.toUpperCase() || '?')}
            </div>
            <p className="text-xl font-semibold text-foreground">
              {peers.length > 1 ? 'Group Call' : peers[0]?.name}
            </p>
            <p className="text-sm capitalize text-muted-foreground">{status}</p>
          </div>
        )}

        {activeStreams.map(([uid, stream]) => {
          const p = peers.find(peer => String(peer._id) === String(uid));
          const name = p ? p.name : 'Unknown';
          return (
            <div key={uid} className="relative w-full h-full bg-black/80 flex items-center justify-center rounded-lg overflow-hidden">
              {callType === 'video' ? (
                <VideoPlayer stream={stream} />
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/20 text-3xl font-bold text-primary ring-2 ring-primary/50">
                    {name.slice(0, 1).toUpperCase()}
                  </div>
                  <span className="text-sm text-white font-medium">{name}</span>
                </div>
              )}
              {callType === 'video' && (
                 <div className="absolute bottom-4 left-4 bg-black/60 px-2 py-1 rounded text-xs text-white backdrop-blur-sm">
                   {name}
                 </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Local self-view PiP ── */}
      {callType === 'video' && (
        <video
          ref={localVideo}
          autoPlay
          playsInline
          muted
          className="absolute bottom-24 right-4 h-36 w-28 rounded-xl border-2 border-white/20 object-cover shadow-2xl md:bottom-28 md:h-44 md:w-36 z-50"
        />
      )}

      {/* ── Floating controls bar ── */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-5 bg-black/50 px-6 py-5 backdrop-blur-md z-50">
        <span className="mr-2 text-xs font-semibold uppercase tracking-widest text-white/60">{status}</span>
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${muted ? 'bg-red-500 text-white' : 'bg-white/15 text-white hover:bg-white/25'}`}
          title="Mute"
        >
          {muted ? (
            <MicrophoneIcon className="h-5 w-5" />
          ) : (
            <SpeakerWaveIcon className="h-5 w-5" />
          )}
        </button>
        {callType === 'video' && (
          <button
            type="button"
            onClick={() => setVideoOff((v) => !v)}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${videoOff ? 'bg-red-500 text-white' : 'bg-white/15 text-white hover:bg-white/25'}`}
            title="Camera"
          >
            {videoOff ? (
              <VideoCameraSlashIcon className="h-5 w-5" />
            ) : (
              <VideoCameraIcon className="h-5 w-5" />
            )}
          </button>
        )}
        <button
          type="button"
          onClick={hangup}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-all hover:bg-red-500"
          title="End call"
        >
          <PhoneArrowDownLeftIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

function VideoPlayer({ stream }) {
  const ref = useRef();
  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);
  return <video ref={ref} autoPlay playsInline className="absolute inset-0 h-full w-full object-cover" />;
}
