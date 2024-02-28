import { listen } from '@colyseus/tools';
import XMLHttpRequest from 'xhr2';

global.XMLHttpRequest = XMLHttpRequest;

import app from './app.config';
listen(app, 2567);
