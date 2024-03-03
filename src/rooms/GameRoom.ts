import { Room, Client } from '@colyseus/core';
import { DecodedIdToken } from 'firebase-admin/lib/auth/token-verifier';
import '@babylonjs/loaders/glTF/2.0/glTFLoader';

import { Player, RoomState } from './schema/RoomState';
import { auth } from '../config/firebase';
import { World } from '@/game/main';
import { InputManager } from '@/game/input';
import { GameInputType, MessageType } from '@/types/types';
import { ClientStat } from './ClientStat';

export class GameRoom extends Room<RoomState> {
  maxClients = 2;
  inputs: Record<string, InputManager> = {};
  world: World;
  clientStats: Record<string, ClientStat> = {};
  statHandle: NodeJS.Timeout;

  async onCreate(_options: any) {
    this.world = await World.create(this);
    this.setSimulationInterval(() => this.update());
    this.setState(new RoomState());
    this.setMessageListeners();
    this.setPatchRate(16.6);

    console.log('Room', this.roomId, 'created!');
  }
  async onAuth(_client: any, options: { accessToken: string }) {
    return await auth.verifyIdToken(options.accessToken);
  }
  async onJoin(client: Client, _options: any, authData: DecodedIdToken) {
    const tank = await this.world.createTank(client.sessionId);
    const player = new Player(client.sessionId, authData.uid, tank);
    tank.state = player;

    this.state.players.set(client.sessionId, player);
    this.inputs[client.sessionId] = new InputManager();
    this.clientStats[client.sessionId] = new ClientStat(client.sessionId);
    console.log(client.sessionId, 'joined!');

    if (this.state.players.size === this.maxClients) {
      this.state.status = 'ready';

      // #Debug Start
      this.statHandle = setInterval(
        () =>
          console.log(
            Object.entries(this.clientStats)
              .map(([id, stat]) => `${id}: ${stat.avgPing}`)
              .join(', ')
          ),
        1000
      );
      // #Debug End
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
    clearTimeout(this.statHandle);
    this.world.destroy();
    console.log('Room', this.roomId, 'disposed');
  }

  setMessageListeners() {
    this.onMessage(MessageType.INPUT, (client, message: Partial<Record<GameInputType, boolean>>) => {
      if (this.state.status === 'matching') return;

      this.clientStats[client.sessionId].ping();
      this.inputs[client.sessionId].set(message);
    });
  }
  update() {
    Object.keys(this.world.players).forEach((key) =>
      this.state.players.get(key)?.update(this.world.players[key])
    );
  }
  broadcastEvent<T>(type: MessageType, message: T, originatorId: string) {
    this.broadcast(type, message, { except: this.clients.find((c) => c.sessionId === originatorId) });
  }
  sendEvent<T>(type: MessageType, message: T, id: string) {
    this.clients.find((c) => c.sessionId === id)?.send(type, message);
  }
}
