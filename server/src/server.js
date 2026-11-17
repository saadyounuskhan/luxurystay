import http from 'http';
import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { logger } from './config/logger.js';
import { initSocket } from './sockets/index.js';
import { scheduleNightAudit } from './services/nightAudit.service.js';

await connectDB();

const server = http.createServer(app);
initSocket(server);
scheduleNightAudit();

server.listen(env.port, () => {
  logger.info(`LuxuryStay API running on http://localhost:${env.port}/api/v1`);
});
