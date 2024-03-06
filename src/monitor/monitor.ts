import { GameRoom } from '@/rooms/GameRoom';
import { ClientStat } from './client-stat';
import { clamp } from '@/game/utils/utils';

export class Monitor {
  debug = false;
  private _logInterval = 1000;
  private clientStats: Record<string, ClientStat> = {};
  private handle: NodeJS.Timeout;
  set logInterval(ms: number) {
    this._logInterval = clamp(ms, 500, Number.MAX_SAFE_INTEGER);
  }

  constructor(public room: GameRoom) {}

  addClient(sessionId: string) {
    this.clientStats[sessionId] = new ClientStat(sessionId);
  }
  clientPing(sessionId: string) {
    this.clientStats[sessionId].ping();
  }
  getAvgPing(sessionId: string) {
    return this.clientStats[sessionId].avgPing;
  }
  start(debug: boolean = false) {
    this.debug = debug;
    this.handle = setInterval(
      () =>
        debug &&
        console.log(
          Object.entries(this.clientStats)
            .map(
              ([id, stat]) =>
                `[ID: ${id}, Ping: ${stat.avgPing.toFixed(2)}, InBuffer: ${
                  this.room.inputs[id].buffer.length
                }`
            )
            .join('\n')
        ),
      this._logInterval
    );
  }
  stop() {
    clearTimeout(this.handle);
  }
}
