import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema(
  {
    isGroup: { type: Boolean, default: false },
    name: { type: String, trim: true, default: '' },
    avatar: { type: String, default: '' },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

chatSchema.index({ participants: 1 });
chatSchema.index({ lastMessageAt: -1 });

export default mongoose.model('Chat', chatSchema);
