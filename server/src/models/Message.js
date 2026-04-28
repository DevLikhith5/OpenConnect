import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['text', 'image', 'file', 'poll'], default: 'text' },
    content: { type: String, default: '' },
    isEncrypted: { type: Boolean, default: false },
    editedAt: { type: Date, default: null },
    mediaUrl: { type: String, default: '' },
    fileName: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    status: {
      deliveredTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    },
    poll: {
      question: { type: String, default: '' },
      options: [
        {
          text: { type: String, required: true },
          votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        }
      ]
    }
  },
  { timestamps: true }
);

messageSchema.index({ chat: 1, createdAt: -1 });
messageSchema.index({ content: 'text' });

export default mongoose.model('Message', messageSchema);
