import mongoose from "mongoose";
import Chat from "./src/models/Chat.js";
import Message from "./src/models/Message.js";

async function run() {
  await mongoose.connect("mongodb://127.0.0.1:27017/chatapp");
  const chats = await Chat.find().lean();
  console.log("CHATS:");
  chats.forEach(c => console.log(c._id, "lastMessage:", c.lastMessage));
  const count = await Message.countDocuments();
  console.log("MESSAGE COUNT:", count);
  process.exit(0);
}
run();
