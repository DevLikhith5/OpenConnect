import mongoose from "mongoose";
import Chat from "./src/models/Chat.js";
import Message from "./src/models/Message.js";
import User from "./src/models/User.js";

async function run() {
  await mongoose.connect("mongodb://127.0.0.1:27017/chatapp");
  const chats = await Chat.find()
      .populate('participants', 'name email avatar lastSeen isOnline')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'name avatar' },
      })
      .sort({ lastMessageAt: -1 })
      .lean();
  console.log(JSON.stringify(chats.map(c => ({ _id: c._id, name: c.name, lastMessage: c.lastMessage })), null, 2));
  process.exit(0);
}
run();
