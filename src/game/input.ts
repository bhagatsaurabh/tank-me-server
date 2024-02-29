import { GameInputType } from '@/types/types';

export class InputManager {
  keys: Partial<Record<GameInputType, boolean>>;

  constructor() {
    this.keys = {};
  }

  set(keys: Partial<Record<GameInputType, boolean>>) {
    this.keys = this.validate(keys);
  }
  validate(keys: Partial<Record<GameInputType, boolean>>): Partial<Record<GameInputType, boolean>> {
    const validatedKeys = { ...keys };
    Object.keys(validatedKeys).forEach((key: unknown) => {
      if (typeof GameInputType[key as GameInputType] === 'undefined') {
        delete validatedKeys[key as GameInputType];
      }
    });
    return validatedKeys;
  }
}
