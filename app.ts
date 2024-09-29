import 'tsconfig-paths/register';
import dotenv from 'dotenv';
dotenv.config();

import Server from './src/models/server';
const server = new Server();
server.listen();
