import { Room, Client } from '@colyseus/core';
import { DecodedIdToken } from 'firebase-admin/lib/auth/token-verifier';
import '@babylonjs/loaders/glTF/2.0/glTFLoader';

import { Player, RoomState } from './schema/RoomState';
import { auth } from '../config/firebase';
import { World } from '@/game/main';
import { InputManager } from '@/game/input';
import { MessageType } from '@/types/types';
import { IMessageInput } from '@/types/interfaces';
import { Monitor } from '@/monitor/monitor';

export class GameRoom extends Room<RoomState> {
  maxClients = 2;
  inputs: Record<string, InputManager> = {};
  world: World;
  monitor: Monitor;

  async onCreate(_options: any) {
    this.world = await World.create(this);
    this.monitor = new Monitor(this);
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
    this.monitor.addClient(client.sessionId);
    console.log(client.sessionId, 'joined!');

    if (this.state.players.size === this.maxClients) {
      this.state.status = 'ready';
      this.monitor.start(true);
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
    this.monitor.stop();
    this.world.destroy();
    console.log('Room', this.roomId, 'disposed');
  }

  setMessageListeners() {
    this.onMessage<IMessageInput>(MessageType.INPUT, (client, message: IMessageInput) => {
      if (this.state.status === 'matching') return;

      this.monitor.clientPing(client.sessionId);
      this.inputs[client.sessionId].queue(message, this.monitor.getAvgPing(client.sessionId));
    });
  }
  broadcastEvent<T>(type: MessageType, message: T, originatorId: string) {
    this.broadcast(type, message, { except: this.clients.find((c) => c.sessionId === originatorId) });
  }
  sendEvent<T>(type: MessageType, message: T, id: string) {
    this.clients.find((c) => c.sessionId === id)?.send(type, message);
  }
}
