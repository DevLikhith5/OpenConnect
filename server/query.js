import mongoose from "mongoose";
import Chat from "./src/models/Chat.js";
import Message from "./src/models/Message.js";

async function run() {
  await mongoose.connect("mongodb://127.0.0.1:27017/chatapp");
  const chats = await Chat.find().populate("lastMessage").lean();
  console.log(JSON.stringify(chats, null, 2));
  process.exit(0);
}
run();
