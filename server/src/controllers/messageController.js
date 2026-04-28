import Chat from '../models/Chat.js';
import Message from '../models/Message.js';

export async function sendMessage(req, res) {
  try {
    const { chatId } = req.params;
    const { content, type } = req.body;

    const chat = await Chat.findOne({ _id: chatId, participants: req.userId });
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    let msgType = type === 'image' || type === 'file' ? type : 'text';
    let mediaUrl = '';
    let fileName = '';
    let mimeType = '';
    let text = (content || '').trim();

    if (req.file) {
      // Cloudinary: req.file.path is the CDN URL (starts with https://)
      // Local disk:  use a /uploads/ relative path — Vite proxy forwards it to Express
      const isCloudinaryUrl = req.file.path && req.file.path.startsWith('http');
      mediaUrl = isCloudinaryUrl
        ? req.file.path
        : `/uploads/${req.file.filename}`;
      fileName = req.file.originalname || req.file.filename || 'file';
      mimeType = req.file.mimetype || 'application/octet-stream';
      if (mimeType.startsWith('image/')) msgType = 'image';
      else msgType = 'file';
    }

    if (msgType === 'text' && !text) {
      return res.status(400).json({ error: 'Message content required' });
    }
    if ((msgType === 'image' || msgType === 'file') && !req.file) {
      return res.status(400).json({ error: 'File required' });
    }

    const message = await Message.create({
      chat: chatId,
      sender: req.userId,
      type: msgType,
      content: text,
      isEncrypted: req.body.isEncrypted === 'true' || req.body.isEncrypted === true,
      mediaUrl,
      fileName,
      mimeType,
      status: { deliveredTo: [], readBy: [] },
    });

    chat.lastMessage = message._id;
    chat.lastMessageAt = new Date();
    await chat.save();

    const populated = await Message.findById(message._id).populate('sender', 'name avatar').lean();

    const io = req.app.get('io');
    if (io) {
      io.to(`chat:${chatId}`).emit('new_message', { message: populated });
      const preview =
        populated.type === 'text'
          ? populated.content?.slice(0, 120) || ''
          : populated.type === 'image'
            ? '📷 Image'
            : '📎 File';
      chat.participants.forEach((pid) => {
        io.to(`user:${pid}`).emit('chat_updated', { chatId, lastMessageAt: chat.lastMessageAt });
        if (String(pid) !== String(req.userId)) {
          io.to(`user:${pid}`).emit('notification', {
            kind: 'message',
            chatId,
            title: populated.sender?.name || 'New message',
            body: preview,
          });
        }
      });
    }

    res.status(201).json({ message: populated });
  } catch (e) {
    console.error('[sendMessage] Error:', e.name, e.message, e.stack?.split('\n').slice(0,3).join(' | '));
    res.status(500).json({ error: e.message || 'Failed to send message' });
  }
}

export async function deleteMessage(req, res) {
  try {
    const { chatId, messageId } = req.params;

    const message = await Message.findOne({ _id: messageId, chat: chatId });
    if (!message) return res.status(404).json({ error: 'Message not found' });
    if (String(message.sender) !== String(req.userId))
      return res.status(403).json({ error: 'Not your message' });

    await message.deleteOne();

    const io = req.app.get('io');
    if (io) {
      io.to(`chat:${chatId}`).emit('message_deleted', { messageId, chatId });
    }

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to delete message' });
  }
}

export async function editMessage(req, res) {
  try {
    const { chatId, messageId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim())
      return res.status(400).json({ error: 'Content is required' });

    const message = await Message.findOne({ _id: messageId, chat: chatId });
    if (!message) return res.status(404).json({ error: 'Message not found' });
    if (String(message.sender) !== String(req.userId))
      return res.status(403).json({ error: 'Not your message' });
    if (message.type !== 'text')
      return res.status(400).json({ error: 'Can only edit text messages' });

    message.content = content.trim();
    message.editedAt = new Date();
    await message.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`chat:${chatId}`).emit('message_edited', {
        messageId,
        chatId,
        content: message.content,
        editedAt: message.editedAt,
        isEncrypted: message.isEncrypted,
      });
    }

    res.json({ ok: true, content: message.content, editedAt: message.editedAt, isEncrypted: message.isEncrypted });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to edit message' });
  }
}

export async function clearChat(req, res) {
  try {
    const { chatId } = req.params;

    const chat = await Chat.findOne({ _id: chatId, participants: req.userId });
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    await Message.deleteMany({ chat: chatId });

    // Reset last message on chat
    chat.lastMessage = null;
    chat.lastMessageAt = null;
    await chat.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`chat:${chatId}`).emit('chat_cleared', { chatId });
    }

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to clear chat' });
  }
}
