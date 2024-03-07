import { IMessageInput } from '@/types/interfaces';
import { GameInputType } from '@/types/types';
import { Queue } from './utils/queue';

export class InputManager {
  buffer: Queue<IMessageInput>;

  constructor() {
    this.buffer = new Queue([]);
  }

  queue(message: IMessageInput, avgPing: number) {
    this.buffer.push(this.validate(message, avgPing));
  }
  getAll(): IMessageInput[] {
    const messages: IMessageInput[] = [];
    this.buffer.forEach((message) => messages.push(message));
    this.buffer.clear();
    return messages;
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
