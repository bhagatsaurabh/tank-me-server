import { Client, Room } from 'colyseus';
import { Nullable } from '@babylonjs/core';

import { Player, RoomState } from './schema/RoomState.js';
import { auth } from '../config/firebase.js';
import { World } from '../game/main.js';
import { InputManager } from '../game/input.js';
import { MatchStats, MessageType, PlayerStats } from '../types/types.js';
import { IMessageInput } from '../types/interfaces.js';
import { Monitor } from '../monitor/monitor.js';
import { calcPoints } from '../game/utils/utils.js';
import { updatePlayerStats } from '../database/driver.js';
import { DecodedIdToken } from 'firebase-admin/auth';

export class GameRoom extends Room<{ state: RoomState }> {
  maxClients = 2;
  matchDuration = 600000;
  inputs: Record<string, InputManager> = {};
  world!: World;
  monitor!: Monitor;
  isMatchEnded = false;
  stats: MatchStats = {};
  timerHandle: NodeJS.Timeout | null = null;

  async onCreate(_options: any) {
    this.world = await World.create(this);
    this.monitor = new Monitor(this);
    this.state = new RoomState();
    this.setMessageListeners();
    this.setSimulationInterval(() => {
      this.state.players.forEach((player: Player) => {
        if (this.world.lastProcessedInput[player.sid]) {
          player.update(this.world.players[player.sid], this.world.lastProcessedInput[player.sid]);
        }
      });
    }, 16.66);

    console.log('Room', this.roomId, 'created!');
  }
  async onAuth(_client: any, options: { accessToken: string }) {
    const idToken = await auth.verifyIdToken(options.accessToken);
    let hasJoined = false;
    this.state.players.forEach((player: Player) => {
      if (player.uid === idToken.uid) hasJoined = true;
    });
    return hasJoined ? null : idToken;
  }
  async onJoin(client: Client, _options: any, authData: DecodedIdToken) {
    const tank = await this.world.createTank(client.sessionId);
    const player = new Player(client.sessionId, authData.uid, tank);
    tank.state = player;

    this.state.players.set(client.sessionId, player);
    this.inputs[client.sessionId] = new InputManager();
    this.monitor.addClient(client.sessionId);
    this.stats[client.sessionId] = { shellsUsed: 0, totalDamage: 0, points: 0 };
    console.log(client.sessionId, 'joined!');

    if (this.state.players.size === this.maxClients) {
      this.state.status = 'ready';
      this.startTimer();
      this.monitor.start(true);
    }
  }
  async onLeave(client: Client) {
    if (this.state.players.has(client.sessionId)) {
      if (this.world.players[client.sessionId]) {
        this.world.removeTank(client.sessionId);
      }

      this.state.players.delete(client.sessionId);
      console.log(client.sessionId, 'left!');

      await this.matchEnd(null, client.sessionId);
      this.disconnect();
    }
  }
  onDispose() {
    this.monitor?.stop();
    this.world?.destroy();

    console.log('Room', this.roomId, 'disposed');
  }

  setMessageListeners() {
    this.onMessage<IMessageInput>(MessageType.INPUT, (client, message: IMessageInput) => {
      if (this.state.status === 'matching' || this.isMatchEnded) return;

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
  async matchEnd(winner: Nullable<string>, loser: Nullable<string>, isDraw = false) {
    if (this.isMatchEnded) return;

    console.log('MatchEnd');
    this.isMatchEnded = true;
    if (!isDraw) {
      if (!winner) {
        this.state.players.forEach((player: Player) => {
          if (player.sid !== loser) {
            winner = player.sid;
          }
        });
      }
      if (!loser) {
        this.state.players.forEach((player: Player) => {
          if (player.sid !== winner) {
            loser = player.sid;
          }
        });
      }
    }

    await Promise.all(this.clients.map((client) => this.sendMatchEnd(client, winner!, loser!, isDraw)));
  }

  logStat<K extends keyof PlayerStats>(id: string, key: K, data: PlayerStats[K]) {
    if (typeof data === 'number') {
      this.stats[id][key] += data;
    }
  }
  startTimer() {
    this.timerHandle = setInterval(async () => {
      if (Date.now() - this.state.startTimestamp >= this.matchDuration) {
        clearInterval(this.timerHandle!);
        await this.matchEnd(null, null, true);
        this.disconnect();
      }
    }, 1000);
  }
  async sendMatchEnd(client: Client, winner: string, loser: string, isDraw = false) {
    this.stats[client.sessionId].points = calcPoints(this.stats[client.sessionId]);
    const uid = this.state.players.get(client.sessionId)?.uid;

    await updatePlayerStats(uid!, this.stats[client.sessionId].points, client.sessionId === winner);
    client.send(MessageType.MATCH_END, { winner, loser, stats: this.stats, isDraw });
  }
}
