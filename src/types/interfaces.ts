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
  winner: string;
  loser: string;
  stats: MatchStats;
}
