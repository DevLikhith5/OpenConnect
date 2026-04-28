import mongoose from "mongoose";
import Message from "./src/models/Message.js";

async function run() {
  await mongoose.connect("mongodb://127.0.0.1:27017/chatapp");
  const msg1 = await Message.findById('69f07e2d8de571966c9d20fd').lean();
  const msg2 = await Message.findById('69f07bfd4d459dd8c9070d12').lean();
  console.log("msg1:", msg1);
  console.log("msg2:", msg2);
  process.exit(0);
}
run();
