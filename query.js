import mongoose from "mongoose";
import Chat from "./server/src/models/Chat.js";
import Message from "./server/src/models/Message.js";

async function run() {
  await mongoose.connect("mongodb://localhost:27017/openconnect");
  const chats = await Chat.find().populate("lastMessage").lean();
  console.log(JSON.stringify(chats, null, 2));
  process.exit(0);
}
run();
