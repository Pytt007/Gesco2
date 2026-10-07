import type { IncomingMessage, ServerResponse } from 'node:http';
import { nodeAuthHandler } from '../../../server/authProxy.js';

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return nodeAuthHandler(req, res, process.env);
}
