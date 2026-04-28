import mongoose from "mongoose";
import Chat from "./src/models/Chat.js";
import Message from "./src/models/Message.js";

async function run() {
  await mongoose.connect("mongodb://127.0.0.1:27017/chatapp");
  const chats = await Chat.find({ isGroup: false })
      .populate('participants', 'name email avatar lastSeen isOnline')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'name avatar' },
      })
      .sort({ lastMessageAt: -1 })
      .lean();
  
  chats.forEach(c => {
    const type = c.lastMessage ? typeof c.lastMessage : 'null';
    const isArray = Array.isArray(c.lastMessage);
    const hasContent = c.lastMessage && c.lastMessage.content;
    console.log(c._id, 'type:', type, 'isArray:', isArray, 'content:', hasContent ? hasContent.substring(0, 10) : hasContent);
  });
  process.exit(0);
}
run();
