import { IMessageTypeInput } from '@/types/interfaces';
import { GameInputType, PlayerInputs } from '@/types/types';

export class InputManager {
  keys: PlayerInputs;
  seq: number = -1;

  constructor() {
    this.keys = {};
  }

  set(message: IMessageTypeInput) {
    this.seq = message.seq;
    this.keys = this.validate(message.input);
  }
  validate(keys: PlayerInputs): PlayerInputs {
    const validatedKeys = { ...keys };
    Object.keys(validatedKeys).forEach((key: unknown) => {
      if (typeof GameInputType[key as GameInputType] === 'undefined') {
        delete validatedKeys[key as GameInputType];
      }
    });
    return validatedKeys;
  }
}
