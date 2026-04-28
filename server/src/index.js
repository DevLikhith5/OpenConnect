import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import { connectDB } from './config/db.js';
import { createRedisClients } from './config/redis.js';
import authRoutes from './routes/authRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import callRoutes from './routes/callRoutes.js';
import { registerSocketHandlers } from './sockets/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4000;

const app = express();
const server = http.createServer(app);

const corsOrigin = process.env.CLIENT_URL || 'http://localhost:5173';

const io = new Server(server, {
  cors: { origin: corsOrigin, credentials: true },
});

const redis = createRedisClients();
if (redis?.adapter) {
  io.adapter(redis.adapter);
  console.log('Socket.IO using Redis adapter');
}

app.set('io', io);
registerSocketHandlers(io);

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '2mb' }));

const uploadsPath = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsPath));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/calls', callRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error('Missing MONGODB_URI');
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  console.error('Missing JWT_SECRET');
  process.exit(1);
}

await connectDB(mongoUri);
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
