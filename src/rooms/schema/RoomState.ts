import { Tank } from '@/game/models/tank';
import { Quaternion, Vector3 } from '@babylonjs/core';
import { MapSchema, Schema, type } from '@colyseus/schema';

export class Position extends Schema {
  @type('number') x: number;
  @type('number') y: number;
  @type('number') z: number;

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

  update(rot: Quaternion) {
    this.x = rot.x;
    this.y = rot.y;
    this.z = rot.z;
    this.w = rot.w;
  }
}
export class Player extends Schema {
  @type('string') sid: string;
  @type('string') uid: string;
  @type(Position) position: Position;
  @type(Rotation) rotation: Rotation;
  @type(BarrelRotation) barrelRotation: BarrelRotation;
  @type(TurretRotation) turretRotation: TurretRotation;

  constructor(sid: string, uid: string, tank: Tank) {
    super();
    this.sid = sid;
    this.uid = uid;
    this.update(tank);
  }

  update(tank: Tank) {
    this.position.update(tank.body.absolutePosition);
    this.rotation.update(tank.body.absoluteRotationQuaternion);
    this.barrelRotation.update(tank.barrel.absoluteRotationQuaternion);
    this.turretRotation.update(tank.turret.absoluteRotationQuaternion);
  }
}

export class RoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type('string') status: string;
}
