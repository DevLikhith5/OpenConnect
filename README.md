# OpenConnect 🚀

OpenConnect is a premium, high-performance real-time messaging platform built for security and seamless communication. It features End-to-End Encryption (E2EE) for private chats, high-quality WebRTC voice/video calls, and a sleek, modern UI.

![NeuroChat Preview](https://github.com/DevLikhith5/OpenConnect/raw/main/client/public/favicon.svg)

## ✨ Features

- **🔒 End-to-End Encryption (E2EE)**: Private 1-on-1 chats are secured using AES-GCM encryption. Keys are derived locally, ensuring that even the server cannot read your messages.
- **📞 WebRTC Calls**: Crystal clear audio and video calls directly between peers.
- **💬 Real-time Messaging**: Instant message delivery with typing indicators, read receipts (ticks), and message status updates.
- **👥 Group Chats**: Create groups, manage participants, and chat in real-time.
- **🌓 Dark Mode**: Full theme support with a premium, modern aesthetic.
- **🛡️ Secure Auth**: Integration with Google OAuth for easy login and JWT-based session management.
- **📸 Media Sharing**: Upload images and files with ease. Integrated with Cloudinary for robust media storage.
- **🚫 User Management**: Block/Unblock users and manage your privacy.
- **🟢 Presence**: Real-time online/offline status and "last seen" tracking.

## 🛠️ Tech Stack

**Frontend:**
- React (Vite)
- Tailwind CSS
- Headless UI & Heroicons
- Socket.io Client
- Web Crypto API (for E2EE)

**Backend:**
- Node.js & Express
- MongoDB (Mongoose)
- Socket.io (Real-time signaling)
- Redis (Optional Socket.io adapter)
- Multer & Cloudinary (Media handling)

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- MongoDB
- Redis (Optional, for scaling)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/DevLikhith5/OpenConnect.git
   cd OpenConnect
   ```

2. **Install dependencies:**
   ```bash
   npm run install:all
   ```

3. **Environment Setup:**
   Create a `.env` file in the `server` directory and `client` directory based on the `.env.example` files provided.

   **Server `.env`:**
   ```env
   PORT=4000
   MONGODB_URI=your_mongodb_uri
   JWT_SECRET=your_secret
   CLIENT_URL=http://localhost:5174
   # Optional: Cloudinary Config
   CLOUDINARY_CLOUD_NAME=...
   CLOUDINARY_API_KEY=...
   CLOUDINARY_API_SECRET=...
   ```

4. **Run the application:**
   ```bash
   npm run dev
   ```

### Using Docker

You can also run the entire stack using Docker:

```bash
docker-compose up -d
```

## 📜 License

This project is licensed under the MIT License.

---
Built with ❤️ by [Likhith](https://github.com/DevLikhith5)
