import { Scene } from '@babylonjs/core';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths';
import { MeshBuilder, Mesh, AbstractMesh } from '@babylonjs/core/Meshes';
import {
  PhysicsAggregate,
  type IPhysicsCollisionEvent,
  PhysicsBody,
  LockConstraint,
  PhysicsShapeSphere
} from '@babylonjs/core/Physics';
import { Observer } from '@babylonjs/core/Misc';

import type { Tank } from './tank';
import { forwardVector } from '@/game/utils';
import { luid } from '../utils';

export class Shell {
  private static refShell: Mesh;
  private static refPhysicsShape: PhysicsShapeSphere;
  private mesh!: AbstractMesh;
  private playerId: string;
  private isSpent: boolean = false;
  private lock!: LockConstraint;
  private energy = 0.02;
  private observers: Observer<any>[] = [];

  private constructor(public tank: Tank, mesh: AbstractMesh) {
    this.playerId = tank.id;
    this.setTransform(mesh);
    this.setPhysics(tank.barrel.physicsBody!);

    this.observers.push(tank.world.physicsPlugin.onCollisionObservable.add((ev) => this.onCollide(ev)));
    this.observers.push(this.tank.world.scene.onAfterStepObservable.add(this.afterStep.bind(this)));
  }
  private static setRefShell(scene: Scene) {
    if (Shell.refShell) return;

    Shell.refShell = MeshBuilder.CreateSphere('Shell:Ref', { diameter: 0.1, segments: 1 }, scene);
    Shell.refShell.isVisible = false;
    Shell.refPhysicsShape = new PhysicsShapeSphere(Vector3.Zero(), 0.05, scene);
  }
  static async create(tank: Tank): Promise<Shell> {
    Shell.setRefShell(tank.world.scene);
    const mesh = Shell.refShell.clone(`Shell:${luid()}`);
    return new Shell(tank, mesh);
  }

  private setTransform(mesh: AbstractMesh) {
    mesh.position.z = 4.8;
    this.tank.barrel.computeWorldMatrix();
    // mesh.rotationQuaternion = this.tank.barrel.absoluteRotationQuaternion.clone();
    mesh.isVisible = false;
    mesh.parent = this.tank.barrel;
    mesh.rotationQuaternion = Quaternion.Identity();

    this.mesh = mesh;
  }
  private setPhysics(barrelPB: PhysicsBody) {
    new PhysicsAggregate(
      this.mesh,
      Shell.refPhysicsShape,
      { mass: 0.0001, restitution: 0 },
      this.tank.world.scene
    ).body.setCollisionCallbackEnabled(true);

    this.lock = new LockConstraint(
      new Vector3(0, 0, 4.8),
      Vector3.Zero(),
      Vector3.Forward(),
      Vector3.Forward(),
      this.tank.world.scene
    );
    barrelPB.addConstraint(this.mesh.physicsBody!, this.lock);
  }
  private unlock() {
    this.lock.isEnabled = false;
  }
  private onCollide(event: IPhysicsCollisionEvent) {
    if (!this.isSpent || event.collider.transformNode.name !== this.mesh.name) return;
    // console.log(event.collidedAgainst.transformNode.name);

    const explosionOrigin = this.mesh.absolutePosition.clone();
    this.dispose();

    if (event.collidedAgainst.transformNode.name !== 'ground') {
      event.collidedAgainst.applyImpulse(
        event.collider.transformNode.getDirection(forwardVector).normalize().scale(1),
        explosionOrigin
      );
    }
  }
  private afterStep() {
    if (!this.isSpent) return;

    if (
      Math.abs(this.mesh.position.x) > 750 ||
      Math.abs(this.mesh.position.y) > 750 ||
      Math.abs(this.mesh.position.z) > 750
    ) {
      this.dispose();
      return;
    }
  }
  public dispose() {
    this.observers.forEach((observer) => observer.remove());
    this.mesh.dispose();
  }
  public fire() {
    this.unlock();

    this.mesh.isVisible = true;
    this.mesh.physicsBody?.applyImpulse(
      this.mesh.getDirection(forwardVector).normalize().scale(this.energy),
      this.mesh.getAbsolutePosition()
    );
    this.isSpent = true;
  }
}
