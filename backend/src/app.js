const express = require('express');
const cors = require('cors');
const { API_ORIGINS } = require('./config/constants');
const { registerAuthRoutes } = require('./routes/authRoutes');
const { registerSearchRoutes } = require('./routes/searchRoutes');
const { registerTripRoutes } = require('./routes/tripRoutes');

const createApp = () => {
  const app = express();

  app.use(cors({
    origin: API_ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  }));
  app.use(express.json({ limit: '300mb' }));
  app.use(express.urlencoded({ extended: true, limit: '300mb' }));

  registerAuthRoutes(app);
  registerSearchRoutes(app);
  registerTripRoutes(app);

  return app;
};

module.exports = {
  createApp,
};
