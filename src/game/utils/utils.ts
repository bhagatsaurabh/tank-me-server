import { Vector3 } from '@babylonjs/core';

import { PlayerStats } from '@/types/types';
import { webcrypto as crypto } from 'node:crypto';

export const gravityVector = new Vector3(0, -9.8, 0);

export const denormalize = (norm: number, min: number, max: number) => {
  return norm * (max - min) + min;
};

export const randInRange = (min: number, max: number) => {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return denormalize(buf[0] / (0xffffffff + 1), min, max);
};

export const forwardVector = new Vector3(0, 0, 1);
export const leftVector = new Vector3(-1, 0, 0);
export const rightVector = new Vector3(1, 0, 0);

export const clamp = (val: number, min: number, max: number) => Math.max(Math.min(val, max), min);

export const avg = (vals: number[]) => vals.reduce((acc, curr) => acc + curr, 0) / vals.length;

const S4 = () => (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
export const luid = () => `${S4()}${S4()}`;

export const choose = <T>(vals: T[]): T => vals[Math.round(randInRange(0, vals.length - 1))];

export const throttle = (cb: (...argmts: any) => void, delay: number) => {
  let timerHandle: NodeJS.Timeout, args: any;
  const throttled = (...a: any) => {
    args = a;
    if (!timerHandle) {
      cb(...args);
      args = null;
      timerHandle = setTimeout(() => {
        timerHandle = null;
        if (args) {
          throttled(...args);
        }
      }, delay);
    }
  };
  return throttled;
};

export const calcPoints = (stats: PlayerStats) => {
  if (stats.shellsUsed === 0) return 0;
  return Math.floor(((3 / stats.shellsUsed) * 0.2 + (stats.totalDamage / 100) * 0.8) * 100);
};
