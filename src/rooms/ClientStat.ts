import { avg } from '@/game/utils/utils';

export class ClientStat {
  private pings: number[] = [];
  private maxSamples: 100;
  private lastAvgTimestamp = 0;
  private avgCalcInterval = 500;
  private _avgPing = 0;
  private prevTimestamp = 0;

  get avgPing(): number {
    return this._avgPing;
  }

  constructor(public sessionId: string) {}

  ping() {
    const now = performance.now();
    const newPing = this.prevTimestamp !== 0 ? now - this.prevTimestamp : 0;

    if (this.pings.length === this.maxSamples) {
      this.pings.shift();
    }
    this.pings.push(newPing);
    this.prevTimestamp = now;

    if (now - this.lastAvgTimestamp > this.avgCalcInterval) {
      this._avgPing = avg(this.pings);
      this.lastAvgTimestamp = now;
    }
  }
}
