import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';

const googleClient = process.env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
  : null;

function signToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function serializeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    lastSeen: user.lastSeen,
    isOnline: user.isOnline,
    blockedUsers: user.blockedUsers || [],
  };
}

async function verifyGoogleCredential(credential) {
  if (!googleClient || !process.env.GOOGLE_CLIENT_ID) {
    throw new Error('Google login is not configured on the server');
  }

  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();

  if (!payload?.email || payload.email_verified !== true) {
    throw new Error('Google account email is not verified');
  }

  return payload;
}

export async function signup(req, res) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: 'Email already registered' });
    const hash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password: hash });
    const token = signToken(user._id.toString());
    res.status(201).json({ token, user: serializeUser(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Signup failed' });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = signToken(user._id.toString());
    res.json({ token, user: serializeUser(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Login failed' });
  }
}

export async function googleAuth(req, res) {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'Google credential is required' });
    }

    const payload = await verifyGoogleCredential(credential);
    const email = payload.email.toLowerCase();

    let user = await User.findOne({ email });
    if (!user) {
      const generatedPassword = await bcrypt.hash(
        `google:${payload.sub || email}:${Date.now()}`,
        12
      );
      user = await User.create({
        name: payload.name || email.split('@')[0],
        email,
        password: generatedPassword,
        avatar: payload.picture || '',
      });
    } else if (!user.avatar && payload.picture) {
      user.avatar = payload.picture;
      await user.save();
    }

    const token = signToken(user._id.toString());
    res.json({ token, user: serializeUser(user) });
  } catch (e) {
    console.error(e);
    if (e.message === 'Google login is not configured on the server') {
      return res.status(503).json({ error: 'Google login is not configured' });
    }
    if (e.message === 'Google account email is not verified') {
      return res.status(401).json({ error: e.message });
    }
    return res.status(401).json({ error: 'Google authentication failed' });
  }
}

export async function me(req, res) {
  res.json({ user: serializeUser(req.user) });
}

export async function updateProfile(req, res) {
  try {
    const { name, avatar } = req.body;
    if (name) req.user.name = name;
    if (avatar !== undefined) req.user.avatar = avatar;
    await req.user.save();
    res.json({ user: serializeUser(req.user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Update failed' });
  }
}

export async function uploadAvatar(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    // Cloudinary gives a full HTTPS URL in req.file.path;
    // local disk storage gives an absolute filesystem path — convert it to a
    // web-accessible relative URL that the Express /uploads static handler serves.
    const avatarUrl = req.file.path?.startsWith('http')
      ? req.file.path
      : `/uploads/${req.file.filename}`;
    req.user.avatar = avatarUrl;
    await req.user.save();
    res.json({ user: serializeUser(req.user), url: avatarUrl });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Avatar upload failed' });
  }
}

// ── E2EE key exchange ──────────────────────────────────────────────────────

export async function uploadPublicKey(req, res) {
  try {
    const { publicKey } = req.body;
    if (!publicKey || typeof publicKey !== 'string') {
      return res.status(400).json({ error: 'publicKey (base64 string) is required' });
    }
    req.user.publicKey = publicKey;
    await req.user.save();
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to store public key' });
  }
}

export async function getUserPublicKey(req, res) {
  try {
    const user = await User.findById(req.params.userId).select('publicKey').lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ publicKey: user.publicKey || null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch public key' });
  }
}

// ── Block / Unblock ────────────────────────────────────────────────────────

export async function blockUser(req, res) {
  try {
    const targetId = req.params.userId;
    if (String(targetId) === String(req.userId))
      return res.status(400).json({ error: 'Cannot block yourself' });

    if (!req.user.blockedUsers.map(String).includes(String(targetId))) {
      req.user.blockedUsers.push(targetId);
      await req.user.save();
    }
    res.json({ ok: true, blocked: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Block failed' });
  }
}

export async function unblockUser(req, res) {
  try {
    const targetId = req.params.userId;
    req.user.blockedUsers = req.user.blockedUsers.filter(
      (id) => String(id) !== String(targetId)
    );
    await req.user.save();
    res.json({ ok: true, blocked: false });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Unblock failed' });
  }
}

export async function getBlockedUsers(req, res) {
  try {
    const user = await User.findById(req.userId).populate('blockedUsers', 'name email avatar').lean();
    res.json({ blockedUsers: user?.blockedUsers || [] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch blocked users' });
  }
}
