import 'dotenv/config';
import { createServer } from 'node:http';
import { createApp } from './app.js';
import { attachSocketServer } from './modules/websocket/socket.js';
import { env } from './config/env.js';

const app = createApp();
const httpServer = createServer(app);
attachSocketServer(httpServer);

httpServer.listen(env.PORT, '0.0.0.0', () => {
  console.log(`Server listening on 0.0.0.0:${env.PORT}`);
});
