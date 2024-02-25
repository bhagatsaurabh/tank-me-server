import { Room, Client } from '@colyseus/core';
import { DecodedIdToken } from 'firebase-admin/lib/auth/token-verifier';

import { Player, RoomState } from './schema/RoomState';
import { auth } from '../config/firebase';
import { World } from '@/game/main';
import { InputManager } from '@/game/input';
import { GameInputType } from '@/types/types';

export class Desert extends Room<RoomState> {
  maxClients = 2;
  inputs: Record<string, InputManager> = {};
  world: World;

  async onCreate(_options: any) {
    this.world = await World.create(this.inputs, this.state);
    this.setSimulationInterval(() => this.update());
    this.setState(new RoomState());
    this.setMessageListeners();

    console.log('room', this.roomId, 'created!');
  }
  async onAuth(_client: any, options: { accessToken: string }) {
    return await auth.verifyIdToken(options.accessToken);
  }
  async onJoin(client: Client, _options: any, authData: DecodedIdToken) {
    const tank = await this.world.createTank(client.sessionId);
    const player = new Player(client.sessionId, authData.uid, tank);
    this.state.players.set(client.sessionId, player);
    this.inputs[client.sessionId] = new InputManager();
    console.log(client.sessionId, 'joined!');

    if (this.state.players.size === this.maxClients) {
      this.state.status = 'ready';
    }
  }
  onLeave(client: Client, _consented: boolean) {
    if (this.world.players[client.sessionId]) {
      this.world.removeTank(client.sessionId);
    }
    if (this.state.players.has(client.sessionId)) {
      this.state.players.delete(client.sessionId);
      console.log(client.sessionId, 'left!');
    }
  }
  onDispose() {
    console.log('room', this.roomId, 'disposing...');
    this.world.destroy();
  }

  setMessageListeners() {
    this.onMessage('input', (client, message: Record<GameInputType, boolean>) => {
      if (this.state.status === 'matching') return;

      this.inputs[client.sessionId].set(message);
    });
  }
  update() {
    Object.keys(this.world.players).forEach((key) => {
      this.state.players.get(key).update(this.world.players[key]);
    });
  }
}
