import type { PlayerInputs } from './types';

export interface IMessageInput {
  seq: number;
  timestamp: number;
  input: PlayerInputs;
}

export interface IMessageFire {
  id: string;
}
export interface IMessageLoad {}
