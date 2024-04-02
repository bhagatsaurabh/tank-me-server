import { listen } from '@colyseus/tools';
import XMLHttpRequest from 'xhr2';

global.XMLHttpRequest = XMLHttpRequest;

import app from './app.config';
let port = 2567;
if (['string', 'number'].includes(typeof process.env.PORT)) {
  port = typeof process.env.PORT === 'number' ? process.env.PORT : parseInt(process.env.PORT);
}

export { port };

listen(app, port);
