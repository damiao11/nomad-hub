const http = require('http');
const { Server } = require('socket.io');
const { API_ORIGINS } = require('./config/constants');
const { registerGroupSocketHandlers } = require('./socket/groupSocket');

const createServer = (app) => {
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: API_ORIGINS,
      methods: ['GET', 'POST'],
    },
  });

  registerGroupSocketHandlers(io);

  return { server, io };
};

module.exports = {
  createServer,
};
