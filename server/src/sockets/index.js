import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import Call from '../models/Call.js';

async function userChats(userId) {
  const list = await Chat.find({ participants: userId }).select('_id participants').lean();
  return list;
}

function relayToUser(io, toUserId, event, payload) {
  io.to(`user:${toUserId}`).emit(event, payload);
}

export function registerSocketHandlers(io) {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('Unauthorized'));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = String(payload.sub);
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    socket.join(`user:${userId}`);

    await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });

    const chats = await userChats(userId);
    for (const c of chats) {
      socket.join(`chat:${c._id}`);
      socket.to(`chat:${c._id}`).emit('presence', { userId, online: true, lastSeen: new Date() });
    }

    socket.on('join_chat', async ({ chatId }, cb) => {
      try {
        const chat = await Chat.findOne({ _id: chatId, participants: userId });
        if (!chat) return cb?.({ error: 'Not allowed' });
        socket.join(`chat:${chatId}`);
        cb?.({ ok: true });
      } catch (e) {
        cb?.({ error: e.message });
      }
    });

    socket.on('leave_chat', ({ chatId }) => {
      socket.leave(`chat:${chatId}`);
    });

    socket.on('typing_start', ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit('typing', { chatId, userId, typing: true });
    });

    socket.on('typing_stop', ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit('typing', { chatId, userId, typing: false });
    });

    socket.on('message_delivered', async ({ messageId, chatId }) => {
      try {
        const msg = await Message.findOne({ _id: messageId, chat: chatId });
        if (!msg) return;
        const uid = userId;
        if (String(msg.sender) === uid) return;
        if (!msg.status.deliveredTo.some((id) => String(id) === uid)) {
          msg.status.deliveredTo.push(uid);
          await msg.save();
        }
        io.to(`chat:${chatId}`).emit('message_status', {
          messageId,
          chatId,
          deliveredTo: msg.status.deliveredTo,
          readBy: msg.status.readBy,
        });
      } catch (e) {
        console.error(e);
      }
    });

    socket.on('message_read', async ({ messageId, chatId }) => {
      try {
        const msg = await Message.findOne({ _id: messageId, chat: chatId });
        if (!msg) return;
        const uid = userId;
        if (String(msg.sender) === uid) return;
        if (!msg.status.readBy.some((id) => String(id) === uid)) {
          msg.status.readBy.push(uid);
          if (!msg.status.deliveredTo.some((id) => String(id) === uid)) {
            msg.status.deliveredTo.push(uid);
          }
          await msg.save();
        }
        io.to(`chat:${chatId}`).emit('message_status', {
          messageId,
          chatId,
          deliveredTo: msg.status.deliveredTo,
          readBy: msg.status.readBy,
        });
      } catch (e) {
        console.error(e);
      }
    });

    socket.on('mark_chat_read', async ({ chatId }) => {
      try {
        const chat = await Chat.findOne({ _id: chatId, participants: userId });
        if (!chat) return;
        const others = await Message.find({
          chat: chatId,
          sender: { $ne: userId },
          'status.readBy': { $ne: userId },
        });
        for (const msg of others) {
          if (!msg.status.readBy.some((id) => String(id) === userId)) {
            msg.status.readBy.push(userId);
          }
          if (!msg.status.deliveredTo.some((id) => String(id) === userId)) {
            msg.status.deliveredTo.push(userId);
          }
          await msg.save();
          io.to(`chat:${chatId}`).emit('message_status', {
            messageId: msg._id,
            chatId,
            deliveredTo: msg.status.deliveredTo,
            readBy: msg.status.readBy,
          });
        }
      } catch (e) {
        console.error(e);
      }
    });

    // —— WebRTC signaling (relay) ——
    socket.on('call_initiate', async ({ toUserId, chatId, type, callId }, cb) => {
      try {
        if (!toUserId || !callId) return cb?.({ error: 'Invalid payload' });

        // ── Block check (both directions) ──
        const [caller, peer] = await Promise.all([
          User.findById(userId).select('blockedUsers').lean(),
          User.findById(toUserId).select('blockedUsers').lean(),
        ]);
        if (!peer) return cb?.({ error: 'User not found' });

        const callerBlockedPeer = caller?.blockedUsers?.map(String).includes(String(toUserId));
        const peerBlockedCaller = peer?.blockedUsers?.map(String).includes(String(userId));
        if (callerBlockedPeer || peerBlockedCaller) {
          return cb?.({ error: 'Cannot call this user' });
        }

        let callDoc = null;
        if (chatId) {
          callDoc = await Call.create({
            chat: chatId,
            caller: userId,
            callee: toUserId,
            type: type === 'audio' ? 'audio' : 'video',
            status: 'ringing',
          });
        }

        relayToUser(io, toUserId, 'call_incoming', {
          callId,
          fromUserId: userId,
          chatId,
          type: type === 'audio' ? 'audio' : 'video',
          dbCallId: callDoc?._id,
        });
        io.to(`user:${toUserId}`).emit('notification', {
          kind: 'call',
          title: 'Incoming call',
          body: 'Someone is calling you',
          callId,
          fromUserId: userId,
        });
        cb?.({ ok: true, dbCallId: callDoc?._id });
      } catch (e) {
        console.error(e);
        cb?.({ error: e.message });
      }
    });

    socket.on('call_accept', ({ toUserId, callId }) => {
      relayToUser(io, toUserId, 'call_accepted', { callId, fromUserId: userId });
    });

    socket.on('call_reject', async ({ toUserId, callId, dbCallId }) => {
      relayToUser(io, toUserId, 'call_rejected', { callId, fromUserId: userId });
      if (dbCallId) {
        await Call.findByIdAndUpdate(dbCallId, { status: 'rejected', endedAt: new Date() });
      }
    });

    socket.on('call_offer', ({ toUserId, callId, sdp }) => {
      relayToUser(io, toUserId, 'call_offer', { callId, sdp, fromUserId: userId });
    });

    socket.on('call_answer', ({ toUserId, callId, sdp }) => {
      relayToUser(io, toUserId, 'call_answer', { callId, sdp, fromUserId: userId });
    });

    socket.on('ice_candidate', ({ toUserId, callId, candidate }) => {
      relayToUser(io, toUserId, 'ice_candidate', { callId, candidate, fromUserId: userId });
    });

    socket.on('call_end', async ({ toUserId, callId, dbCallId }) => {
      relayToUser(io, toUserId, 'call_ended', { callId, fromUserId: userId });
      if (dbCallId) {
        await Call.findByIdAndUpdate(dbCallId, {
          status: 'ended',
          endedAt: new Date(),
        });
      }
    });

    socket.on('call_connected', async ({ dbCallId }) => {
      if (dbCallId) {
        await Call.findByIdAndUpdate(dbCallId, {
          status: 'accepted',
          startedAt: new Date(),
        });
      }
    });

    socket.on('disconnect', async () => {
      await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
      for (const c of chats) {
        socket.to(`chat:${c._id}`).emit('presence', {
          userId,
          online: false,
          lastSeen: new Date(),
        });
      }
    });
  });
}
