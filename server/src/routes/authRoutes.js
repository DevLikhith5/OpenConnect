import { Router } from 'express';
import * as auth from '../controllers/authController.js';
import { authRequired, attachUser } from '../middleware/auth.js';
import { avatarUpload } from '../config/cloudinary.js';

const r = Router();

r.post('/signup', auth.signup);
r.post('/login', auth.login);
r.post('/google', auth.googleAuth);
r.get('/me', authRequired, attachUser, auth.me);
r.patch('/me', authRequired, attachUser, auth.updateProfile);
r.put('/me/public-key', authRequired, attachUser, auth.uploadPublicKey);
r.get('/me/blocked', authRequired, attachUser, auth.getBlockedUsers);
r.get('/users/:userId/public-key', authRequired, auth.getUserPublicKey);
r.post('/users/:userId/block', authRequired, attachUser, auth.blockUser);
r.delete('/users/:userId/block', authRequired, attachUser, auth.unblockUser);
r.post('/avatar', authRequired, attachUser, avatarUpload.single('avatar'), auth.uploadAvatar);

export default r;

