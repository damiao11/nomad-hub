const parseOrigins = (value) => {
  if (!value) {
    return ['http://localhost:3000'];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item !== '');
};

const API_ORIGINS = parseOrigins(process.env.API_ORIGINS);

const SERVER_HOST = process.env.SERVER_HOST || '0.0.0.0';
const SERVER_PORT = Number(process.env.PORT || process.env.SERVER_PORT || 4000);

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nomad_db',
};

module.exports = {
  API_ORIGINS,
  SERVER_HOST,
  SERVER_PORT,
  DB_CONFIG,
};
