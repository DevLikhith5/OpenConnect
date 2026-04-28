import { Router } from 'express';
import * as chat from '../controllers/chatController.js';
import * as msg from '../controllers/messageController.js';
import * as calls from '../controllers/callController.js';
import { authRequired, attachUser } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const r = Router();

r.use(authRequired, attachUser);

r.get('/', chat.listChats);
r.get('/users', chat.listUsers);
r.post('/direct', chat.getOrCreateDirect);
r.post('/group', chat.createGroup);
r.get('/:chatId/messages/search', chat.searchMessages);
r.get('/:chatId/messages', chat.getMessages);
r.post('/:chatId/messages', upload.single('file'), msg.sendMessage);
r.delete('/:chatId/messages/:messageId', msg.deleteMessage);
r.patch('/:chatId/messages/:messageId', msg.editMessage);
r.delete('/:chatId/messages', msg.clearChat);

export default r;
