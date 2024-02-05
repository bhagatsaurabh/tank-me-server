import { MapSchema, Schema, type } from "@colyseus/schema";

export class Position extends Schema {
  @type("number") x: number;
  @type("number") y: number;
  @type("number") z: number;
}
export class Rotation extends Schema {
  @type("number") x: number;
  @type("number") y: number;
  @type("number") z: number;
  @type("number") w: number;
}
export class TurretRotation extends Schema {
  @type("number") x: number;
  @type("number") y: number;
  @type("number") z: number;
}

export class Player extends Schema {
  @type("string") uid: string;
  @type(Position) position: Position;
  @type(Rotation) rotation: Rotation;
  @type(TurretRotation) turretRotation: TurretRotation;
}

export class RoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type("string") status: string;
}
