import type { PlayerInputs } from './types';

export interface IMessageInput {
  step: number;
  timestamp: number;
  input: PlayerInputs;
}

export interface IMessageFire {
  id: string;
}
export interface IMessageLoad {}
