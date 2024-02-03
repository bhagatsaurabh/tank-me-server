import { MapSchema, Schema, type } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") uid: string;
  @type("number") x: number;
  @type("number") y: number;
  @type("number") z: number;
}

export class RoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type("string") status: string;
}
