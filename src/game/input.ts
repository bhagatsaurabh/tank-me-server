import { IMessageInput } from '@/types/interfaces';
import { GameInputType } from '@/types/types';
import { Queue } from './utils/queue';
import { Nullable } from '@babylonjs/core';

export class InputManager {
  private buffer: Queue<IMessageInput>;

  constructor() {
    this.buffer = new Queue([]);
  }

  queue(message: IMessageInput, avgPing: number) {
    this.buffer.push(this.validate(message, avgPing));
  }
  get(): Nullable<IMessageInput> {
    return this.buffer.pop();
  }
  private validate(message: IMessageInput, avgPing: number): IMessageInput {
    const validatedKeys = { ...message.input };
    Object.keys(validatedKeys).forEach((key: unknown) => {
      if (typeof GameInputType[key as GameInputType] === 'undefined') {
        delete validatedKeys[key as GameInputType];
      }
    });

    message.input = validatedKeys;
    message.timestamp = performance.now() - avgPing;
    return message;
  }
}
