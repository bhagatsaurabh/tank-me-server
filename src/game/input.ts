import { GameInputType } from '@/types/types';

export class InputManager {
  keys: Record<GameInputType, boolean>;

  constructor() {}

  set(keys: Record<GameInputType, boolean>) {
    this.keys = this.validate(keys);
  }
  validate(keys: Record<GameInputType, boolean>): Record<GameInputType, boolean> {
    const validatedKeys = { ...keys };
    Object.keys(validatedKeys).forEach((key: unknown) => {
      if (typeof GameInputType[key as GameInputType] !== 'undefined') {
        delete validatedKeys[key as GameInputType];
      }
    });
    return validatedKeys;
  }
}
