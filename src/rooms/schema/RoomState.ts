import { Tank } from '@/game/models/tank';
import { IMessageInput } from '@/types/interfaces';
import { Quaternion, Vector3 } from '@babylonjs/core';
import { MapSchema, Schema, type } from '@colyseus/schema';

export class Position extends Schema {
  @type('number') x: number;
  @type('number') y: number;
  @type('number') z: number;

  constructor(pos: Vector3) {
    super();
    this.update(pos);
  }
  update(pos: Vector3) {
    this.x = pos.x;
    this.y = pos.y;
    this.z = pos.z;
  }
}
export class Rotation extends Schema {
  @type('number') x: number;
  @type('number') y: number;
  @type('number') z: number;
  @type('number') w: number;

  constructor(rot: Quaternion) {
    super();
    this.update(rot);
  }
  update(rot: Quaternion) {
    this.x = rot.x;
    this.y = rot.y;
    this.z = rot.z;
    this.w = rot.w;
  }
}
export class BarrelRotation extends Schema {
  @type('number') x: number;
  @type('number') y: number;
  @type('number') z: number;
  @type('number') w: number;

  constructor(rot: Quaternion) {
    super();
    this.update(rot);
  }
  update(rot: Quaternion) {
    this.x = rot.x;
    this.y = rot.y;
    this.z = rot.z;
    this.w = rot.w;
  }
}
export class TurretRotation extends Schema {
  @type('number') x: number;
  @type('number') y: number;
  @type('number') z: number;
  @type('number') w: number;

  constructor(rot: Quaternion) {
    super();
    this.update(rot);
  }
  update(rot: Quaternion) {
    this.x = rot.x;
    this.y = rot.y;
    this.z = rot.z;
    this.w = rot.w;
  }
}
export class LastProcessedInput extends Schema {
  @type('number') seq: number;
  @type('number') timestamp: number;

  constructor(message: IMessageInput) {
    super();
    this.update(message);
  }
  update(message: IMessageInput) {
    this.seq = message.seq;
    this.timestamp = message.timestamp;
  }
}

export class Player extends Schema {
  @type('string') sid: string;
  @type('string') uid: string;
  @type('boolean') canFire: boolean;
  @type('number') leftSpeed: number;
  @type('number') rightSpeed: number;
  @type('number') health: number;
  @type(Position) position: Position;
  @type(Rotation) rotation: Rotation;
  @type(BarrelRotation) barrelRotation: BarrelRotation;
  @type(TurretRotation) turretRotation: TurretRotation;
  @type(LastProcessedInput) lastProcessedInput: LastProcessedInput;

  constructor(sid: string, uid: string, tank: Tank) {
    super();
    this.sid = sid;
    this.uid = uid;
    this.canFire = false;
    this.position = new Position(tank.body.position);
    this.rotation = new Rotation(tank.body.rotationQuaternion);
    this.barrelRotation = new BarrelRotation(tank.barrel.rotationQuaternion);
    this.turretRotation = new TurretRotation(tank.turret.rotationQuaternion);
    this.lastProcessedInput = new LastProcessedInput({ seq: -1, timestamp: 0, input: null });
  }

  update(tank: Tank, lastProcessedInput: IMessageInput) {
    this.leftSpeed = tank.leftSpeed;
    this.rightSpeed = tank.rightSpeed;
    this.health = tank.health;
    this.position = new Position(tank.body.position);
    this.rotation = new Rotation(tank.body.rotationQuaternion);
    this.barrelRotation = new BarrelRotation(tank.barrel.rotationQuaternion);
    this.turretRotation = new TurretRotation(tank.turret.rotationQuaternion);
    this.lastProcessedInput = new LastProcessedInput(lastProcessedInput);
  }
}

export class RoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type('string') status: string;
}
