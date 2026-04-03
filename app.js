require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const ensureAdminUser = require('./utils/ensureAdmin');

const app = express();

const startServer = async () => {
  await connectDB();
  await ensureAdminUser();

  // Middleware
  app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
  }));
  app.use(express.json());

  // Routes
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/admin', require('./routes/adminRoutes'));
  app.use('/api/driver', require('./routes/driver'));
  app.use('/api/rides', require('./routes/rides'));
  app.use('/api/vehicles', require('./routes/vehicles'));

  // Health check
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`TukTuk backend running on http://localhost:${PORT}`);
  });
};

startServer().catch((err) => {
  console.error('Server initialization error:', err);
  process.exit(1);
});
