import { Nullable } from '@babylonjs/core';
import type { MatchStats, PlayerInputs } from './types';

export interface IMessageInput {
  step: number;
  timestamp: number;
  input: PlayerInputs;
}

export interface IMessageFire {
  id: string;
}
export interface IMessageEnd {
  winner: Nullable<string>;
  loser: Nullable<string>;
  isDraw: boolean;
  stats: MatchStats;
}
