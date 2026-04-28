import http from 'http';

const req = http.request({
  hostname: 'localhost',
  port: 4000,
  path: '/api/chats',
  method: 'GET',
  headers: {
    // Need a valid token or just bypass auth for the test by modifying listChats?
    // Wait, let's just query the db again but print EXACTLY what would be sent.
  }
});
