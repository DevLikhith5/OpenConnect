import mongoose from 'mongoose';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import User from '../models/User.js';

function sortedParticipantStrings(ids) {
  return [...ids].map((x) => String(x._id ?? x)).sort();
}

function participantIdsMatch(participants, pairSorted) {
  const sa = sortedParticipantStrings(participants);
  return sa.length === pairSorted.length && sa.every((v, i) => v === pairSorted[i]);
}

export async function listChats(req, res) {
  try {
    const chats = await Chat.find({ participants: req.userId })
      .populate('participants', 'name email avatar lastSeen isOnline')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'name avatar' },
      })
      .sort({ lastMessageAt: -1 })
      .lean();

    const out = chats.map((c) => {
      let displayName = c.name;
      if (!c.isGroup) {
        const other = c.participants.find((p) => String(p._id) !== String(req.userId));
        displayName = other?.name || 'Chat';
      }
      return { ...c, displayName };
    });
    res.json({ chats: out });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load chats' });
  }
}

export async function getOrCreateDirect(req, res) {
  try {
    const { userId: otherId } = req.body;
    if (!otherId || !mongoose.Types.ObjectId.isValid(otherId)) {
      return res.status(400).json({ error: 'Valid userId required' });
    }
    if (String(otherId) === String(req.userId)) {
      return res.status(400).json({ error: 'Cannot chat with yourself' });
    }
    const other = await User.findById(otherId);
    if (!other) return res.status(404).json({ error: 'User not found' });

    const pairSorted = [String(req.userId), String(otherId)].sort();
    const allDirect = await Chat.find({ isGroup: false, participants: req.userId }).populate(
      'participants',
      '_id'
    );
    let chat = allDirect.find((c) => participantIdsMatch(c.participants, pairSorted));

    if (!chat) {
      chat = await Chat.create({
        isGroup: false,
        participants: [req.userId, otherId],
        lastMessageAt: new Date(),
      });
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${otherId}`).emit('chats_refresh');
      }
    } else {
      chat = await Chat.findById(chat._id)
        .populate('participants', 'name email avatar lastSeen isOnline')
        .populate({
          path: 'lastMessage',
          populate: { path: 'sender', select: 'name avatar' },
        });
      const otherP = chat.participants.find((p) => String(p._id) !== String(req.userId));
      return res.json({
        chat: {
          ...chat.toObject(),
          displayName: otherP?.name || 'Chat',
        },
      });
    }

    const full = await Chat.findById(chat._id)
      .populate('participants', 'name email avatar lastSeen isOnline')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'name avatar' },
      });
    res.json({
      chat: {
        ...full.toObject(),
        displayName: other.name,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to open chat' });
  }
}

export async function createGroup(req, res) {
  try {
    const { name, participantIds } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Group name required' });
    const ids = [...new Set([...(participantIds || []), req.userId].map(String))];
    if (ids.length < 2) {
      return res.status(400).json({ error: 'Add at least one other member' });
    }
    const users = await User.find({ _id: { $in: ids } });
    if (users.length !== ids.length) return res.status(400).json({ error: 'Invalid participants' });

    const chat = await Chat.create({
      isGroup: true,
      name: name.trim(),
      participants: ids,
      admins: [req.userId],
      lastMessageAt: new Date(),
    });
    const full = await Chat.findById(chat._id)
      .populate('participants', 'name email avatar lastSeen isOnline')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'name avatar' },
      });
    const io = req.app.get('io');
    if (io) {
      for (const pid of ids) {
        if (String(pid) !== String(req.userId)) {
          io.to(`user:${pid}`).emit('chats_refresh');
        }
      }
    }
    res.status(201).json({ chat: { ...full.toObject(), displayName: full.name } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create group' });
  }
}

export async function listUsers(req, res) {
  try {
    const q = (req.query.q || '').trim();
    const filter = { _id: { $ne: req.userId } };
    if (q) {
      filter.$or = [
        { name: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
        { email: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
      ];
    }
    const users = await User.find(filter).select('name email avatar lastSeen isOnline').limit(50).lean();
    res.json({ users });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to list users' });
  }
}

export async function getMessages(req, res) {
  try {
    const { chatId } = req.params;
    const before = req.query.before;
    const limit = Math.min(parseInt(req.query.limit, 10) || 40, 100);

    const chat = await Chat.findOne({ _id: chatId, participants: req.userId });
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    const query = { chat: chatId };
    if (before && mongoose.Types.ObjectId.isValid(before)) {
      query._id = { $lt: new mongoose.Types.ObjectId(before) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('sender', 'name avatar')
      .lean();

    res.json({ messages: messages.reverse() });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load messages' });
  }
}

export async function searchMessages(req, res) {
  try {
    const { chatId } = req.params;
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ messages: [] });

    const chat = await Chat.findOne({ _id: chatId, participants: req.userId });
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    let messages;
    try {
      messages = await Message.find({
        chat: chatId,
        $text: { $search: q },
      })
        .sort({ score: { $meta: 'textScore' } })
        .limit(50)
        .populate('sender', 'name avatar')
        .lean();
    } catch {
      const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      messages = await Message.find({
        chat: chatId,
        content: new RegExp(esc, 'i'),
      })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('sender', 'name avatar')
        .lean();
    }

    res.json({ messages });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Search failed' });
  }
}
