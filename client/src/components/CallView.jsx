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
  remoteUserId,
  isCaller,
  callType,
  dbCallId,
  peerName,
  onEnd,
}) {
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  const [remoteStream, setRemoteStream] = useState(null);
  const [status, setStatus] = useState(isCaller ? 'ringing' : 'connecting');
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(callType === 'audio');

  const pendingIce = useRef([]);

  useEffect(() => {
    if (!socket || !callId || !remoteUserId) return undefined;

    let cancelled = false;
    const cleanups = [];

    const flushIce = async (pc) => {
      const q = [...pendingIce.current];
      pendingIce.current = [];
      for (const c of q) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(c));
        } catch (e) {
          console.warn('ICE', e);
        }
      }
    };

    const pendingOfferRef = { current: null };

    const onEnded = ({ callId: cid }) => {
      if (cid === callId) onEndRef.current('remote_hangup');
    };
    socket.on('call_ended', onEnded);
    cleanups.push(() => socket.off('call_ended', onEnded));

    if (!isCaller) {
      const onOfferEarly = (payload) => {
        const { callId: cid, sdp, fromUserId } = payload;
        if (cid !== callId || String(fromUserId) !== String(remoteUserId) || !sdp) return;
        if (!pcRef.current) {
          pendingOfferRef.current = payload;
          return;
        }
        (async () => {
          try {
            const pc = pcRef.current;
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            await flushIce(pc);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('call_answer', { toUserId: remoteUserId, callId, sdp: answer });
            setStatus('live');
            if (dbCallId) socket.emit('call_connected', { dbCallId });
          } catch (e) {
            console.error(e);
          }
        })();
      };
      socket.on('call_offer', onOfferEarly);
      cleanups.push(() => socket.off('call_offer', onOfferEarly));
    }

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
          stream.getVideoTracks().forEach((t) => {
            t.enabled = !videoOff;
          });
        }
        if (localVideo.current) localVideo.current.srcObject = stream;

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        const pc = new RTCPeerConnection({ iceServers: ICE });
        pcRef.current = pc;

        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        pc.onicecandidate = (e) => {
          if (e.candidate) {
            socket.emit('ice_candidate', {
              toUserId: remoteUserId,
              callId,
              candidate: e.candidate.toJSON(),
            });
          }
        };

        pc.ontrack = (e) => {
          const [s] = e.streams;
          if (s) setRemoteStream(s);
        };

        const onRemoteIce = async ({ callId: cid, candidate, fromUserId }) => {
          if (cid !== callId || String(fromUserId) !== String(remoteUserId) || !candidate) return;
          if (!pcRef.current) return;
          const p = pcRef.current;
          if (!p.remoteDescription) {
            pendingIce.current.push(candidate);
            return;
          }
          try {
            await p.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.warn(e);
          }
        };
        socket.on('ice_candidate', onRemoteIce);
        cleanups.push(() => socket.off('ice_candidate', onRemoteIce));

        if (isCaller) {
          const onAccepted = async (p) => {
            if (p?.callId !== callId || cancelled) return;
            setStatus('connecting');
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socket.emit('call_offer', { toUserId: remoteUserId, callId, sdp: offer });
            } catch (e) {
              console.error(e);
            }
          };
          socket.on('call_accepted', onAccepted);
          cleanups.push(() => socket.off('call_accepted', onAccepted));

          const onAnswer = async ({ callId: cid, sdp, fromUserId }) => {
            if (cid !== callId || String(fromUserId) !== String(remoteUserId) || !sdp) return;
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(sdp));
              await flushIce(pc);
              setStatus('live');
              if (dbCallId) socket.emit('call_connected', { dbCallId });
            } catch (e) {
              console.error(e);
            }
          };
          socket.on('call_answer', onAnswer);
          cleanups.push(() => socket.off('call_answer', onAnswer));

          const onRejected = ({ callId: cid }) => {
            if (cid === callId) onEndRef.current('rejected');
          };
          socket.on('call_rejected', onRejected);
          cleanups.push(() => socket.off('call_rejected', onRejected));
        } else if (pendingOfferRef.current) {
          const payload = pendingOfferRef.current;
          pendingOfferRef.current = null;
          const { sdp, fromUserId } = payload;
          if (String(fromUserId) === String(remoteUserId) && sdp) {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(sdp));
              await flushIce(pc);
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              socket.emit('call_answer', { toUserId: remoteUserId, callId, sdp: answer });
              setStatus('live');
              if (dbCallId) socket.emit('call_connected', { dbCallId });
            } catch (e) {
              console.error(e);
            }
          }
        }
      } catch (e) {
        console.error(e);
        onEndRef.current('error');
      }
    })();

    return () => {
      cancelled = true;
      cleanups.forEach((fn) => fn());
      pendingIce.current = [];
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      setRemoteStream(null);
    };
  }, [socket, callId, remoteUserId, isCaller, callType, dbCallId]);

  useEffect(() => {
    const s = localStreamRef.current;
    if (!s) return;
    s.getAudioTracks().forEach((t) => {
      t.enabled = !muted;
    });
  }, [muted]);

  useEffect(() => {
    const s = localStreamRef.current;
    if (!s || callType !== 'video') return;
    s.getVideoTracks().forEach((t) => {
      t.enabled = !videoOff;
    });
  }, [videoOff, callType]);

  useEffect(() => {
    if (remoteVideo.current && remoteStream) {
      remoteVideo.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  function hangup() {
    socket?.emit('call_end', { toUserId: remoteUserId, callId, dbCallId });
    onEndRef.current('local_hangup');
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* ── Remote video — full screen ── */}
      {callType === 'video' && (
        <video
          ref={remoteVideo}
          autoPlay
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {/* ── Audio call avatar ── */}
      {callType === 'audio' && (
        <div className="flex h-full flex-col items-center justify-center gap-4 bg-background">
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-primary/10 text-5xl font-bold text-primary ring-4 ring-primary/30">
            {peerName?.slice(0, 1)?.toUpperCase() || '?'}
          </div>
          <p className="text-xl font-semibold text-foreground">{peerName}</p>
          <p className="text-sm capitalize text-muted-foreground">{status}</p>
        </div>
      )}

      {/* ── Local self-view PiP ── */}
      {callType === 'video' && (
        <video
          ref={localVideo}
          autoPlay
          playsInline
          muted
          className="absolute bottom-24 right-4 h-36 w-28 rounded-xl border-2 border-white/20 object-cover shadow-2xl md:bottom-28 md:h-44 md:w-36"
        />
      )}

      {/* ── Floating controls bar ── */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-5 bg-black/50 px-6 py-5 backdrop-blur-md">
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