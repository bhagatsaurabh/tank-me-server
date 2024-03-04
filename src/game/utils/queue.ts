import { Nullable } from '@babylonjs/core';
import { List } from './list';

export class Queue<T> {
  list = new List<T>();

  get length() {
    return this.list.length;
  }

  constructor(items: T[]) {
    this.list = new List<T>();
    if (Array.isArray(items)) {
      items.forEach((item) => this.push(item));
    }
  }

  push(value: T) {
    this.list.pushTail(value);
  }
  pop(): Nullable<T> {
    const node = this.list.popHead();
    if (node !== null) return node.value;
    return null;
  }
  seek() {
    const node = this.list.head;
    if (node !== null) return node.value;
    return null;
  }
  seekLast() {
    const node = this.list.tail;
    if (node !== null) return node.value;
    return null;
  }
  clear() {
    this.list.clear();
  }
  *#traverse() {
    let curr = this.list.head;
    while (curr) {
      yield curr.value;
      curr = curr.next;
    }
  }
  [Symbol.iterator]() {
    return this.#traverse();
  }
  forEach(cb: (value: T) => void) {
    for (const value of this) {
      cb(value);
    }
  }
}
