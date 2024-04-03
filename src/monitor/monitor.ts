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
  private enabled = false;

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
    if (!this.enabled) return;

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
                }, Seq: ${this.room.inputs[id].buffer.seekLast()?.step}]`
            )
            .join(', ')
        ),
      this._logInterval
    );
  }
  stop() {
    if (!this.enabled) return;

    clearTimeout(this.handle);
  }
}
