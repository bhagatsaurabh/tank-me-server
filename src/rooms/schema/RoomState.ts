import { Tank } from '@/game/models/tank';
import { Quaternion, Vector3 } from '@babylonjs/core';
import { MapSchema, Schema, type } from '@colyseus/schema';

export class Position extends Schema {
  @type('number') x: number;
  @type('number') y: number;
  @type('number') z: number;

  constructor(pos: Vector3) {
    super();
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
    this.x = rot.x;
    this.y = rot.y;
    this.z = rot.z;
    this.w = rot.w;
  }
}
export class Player extends Schema {
  @type('string') sid: string;
  @type('string') uid: string;
  @type('boolean') canFire: boolean;
  @type('number') leftSpeed: number;
  @type('number') rightSpeed: number;
  @type(Position) position: Position;
  @type(Rotation) rotation: Rotation;
  @type(BarrelRotation) barrelRotation: BarrelRotation;
  @type(TurretRotation) turretRotation: TurretRotation;

  constructor(sid: string, uid: string, tank: Tank) {
    super();
    this.sid = sid;
    this.uid = uid;
    this.canFire = false;
    this.update(tank);
  }

  update(tank: Tank) {
    this.leftSpeed = tank.leftSpeed;
    this.rightSpeed = tank.rightSpeed;
    this.position = new Position(tank.body.absolutePosition);
    this.rotation = new Rotation(tank.body.absoluteRotationQuaternion);
    this.barrelRotation = new BarrelRotation(tank.barrel.rotationQuaternion);
    this.turretRotation = new TurretRotation(tank.turret.rotationQuaternion);
  }
}

export class RoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type('string') status: string;
}
