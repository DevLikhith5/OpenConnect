import mongoose from 'mongoose';

const callSchema = new mongoose.Schema(
  {
    chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat' },
    caller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    callee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['audio', 'video'], default: 'video' },
    status: {
      type: String,
      enum: ['ringing', 'accepted', 'rejected', 'ended', 'missed'],
      default: 'ringing',
    },
    startedAt: { type: Date },
    endedAt: { type: Date },
    durationSeconds: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('Call', callSchema);
