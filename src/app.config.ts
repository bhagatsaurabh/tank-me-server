import config from '@colyseus/tools';
import { monitor } from '@colyseus/monitor';
import { playground } from '@colyseus/playground';
import { join, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { static as static_ } from 'express';
import HavokPhysics, { type HavokPhysicsWithBindings } from '@babylonjs/havok';
import expressBasicAuth from 'express-basic-auth';

import { GameRoom } from './rooms/GameRoom';
import { Lobby } from './rooms/Lobby';

export let physicsEngine: HavokPhysicsWithBindings;

export default config({
  initializeGameServer: (gameServer) => {
    gameServer.define('lobby', Lobby);
    gameServer.define('desert', GameRoom).enableRealtimeListing();
    // gameServer.simulateLatency(200)
  },

  initializeExpress: (app) => {
    if (process.env.NODE_ENV !== 'production') {
      app.use('/', playground);
    }
    app.use('/assets', static_('assets'));
    const basicAuthMiddleware = expressBasicAuth({
      users: {
        admin: process.env.COLYSEUS_ADMIN_KEY
      },
      challenge: true
    });
    app.use('/colyseus', basicAuthMiddleware, monitor());
  },

  beforeListen: () => {
    // Load HavokPhysics binary
    const havokBinary = readFileSync(
      join(
        dirname(fileURLToPath(pathToFileURL(__filename).toString())),
        '../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm'
      )
    );
    HavokPhysics({ wasmBinary: havokBinary }).then((engine) => (physicsEngine = engine));
  }
});
