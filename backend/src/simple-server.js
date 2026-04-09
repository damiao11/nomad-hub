const { createApp } = require('./app');
const { createServer } = require('./server');
const { SERVER_HOST, SERVER_PORT } = require('./config/constants');
const { ensureTripPhotoLongText } = require('./db/mysql');

const app = createApp();
const { server } = createServer(app);

server.listen(SERVER_PORT, SERVER_HOST, () => {
  console.log('---------------------------------------');
  console.log('✅ 纯净版后端已启动！');
  console.log(`🔗 本机: http://localhost:${SERVER_PORT}`);
  console.log(`🔗 局域网: http://192.168.137.1:${SERVER_PORT}`);
  console.log('🔌 Socket.IO 已启用: /socket.io');
  console.log('---------------------------------------');
});

ensureTripPhotoLongText();