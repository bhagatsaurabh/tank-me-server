import config from '@colyseus/tools';
import { monitor } from '@colyseus/monitor';
import { playground } from '@colyseus/playground';
import { join, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { static as static_ } from 'express';
import HavokPhysics, { type HavokPhysicsWithBindings } from '@babylonjs/havok';

import { GameRoom } from './rooms/GameRoom';
import { Lobby } from './rooms/Lobby';

// export let havokBinary: Buffer = null;
export let physicsEngine: HavokPhysicsWithBindings;

export default config({
  initializeGameServer: (gameServer) => {
    gameServer.define('lobby', Lobby);
    gameServer.define('desert', GameRoom).enableRealtimeListing();
  },

  initializeExpress: (app) => {
    if (process.env.NODE_ENV !== 'production') {
      app.use('/', playground);
    }
    app.use('/assets', static_('public'));
    /* Read more: https://docs.colyseus.io/tools/monitor/#restrict-access-to-the-panel-using-a-password */
    app.use('/colyseus', monitor());
  },

  beforeListen: () => {
    // Load HavokPhysics binary
    const havokBinary = readFileSync(
      join(
        dirname(fileURLToPath(import.meta.url)),
        '../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm'
      )
    );
    HavokPhysics({ wasmBinary: havokBinary }).then((engine) => (physicsEngine = engine));
  }
});
