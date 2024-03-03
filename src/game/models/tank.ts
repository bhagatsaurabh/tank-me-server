import { Observer } from '@babylonjs/core';
import { Scalar, Vector3, Space, Axis } from '@babylonjs/core/Maths';
import { AbstractMesh, Mesh, MeshBuilder, TransformNode } from '@babylonjs/core/Meshes';
import {
  PhysicsShapeConvexHull,
  PhysicsConstraintMotorType,
  PhysicsShapeContainer,
  PhysicsMotionType,
  PhysicsConstraintAxis,
  Physics6DoFConstraint,
  PhysicsBody,
  PhysicsAggregate,
  PhysicsShapeSphere
} from '@babylonjs/core/Physics';

import { Shell } from './shell';
import { avg, clamp } from '@/game/utils';
import { Player } from '@/rooms/schema/RoomState';
import { World } from '../main';
import { IMessageTypeLoad } from '@/types/interfaces';
import { MessageType } from '@/types/types';

export class Tank {
  private static config = {
    maxEnginePower: 100,
    speedModifier: 10,
    decelerationModifier: 4,
    maxSpeed: 15,
    maxTurningSpeed: 3,
    maxTurretAngle: 1.17, // ~67.5 deg
    maxBarrelAngle: 0.43, // ~25 deg
    maxTurretSpeed: 14,
    maxBarrelSpeed: 14,
    bodyMass: 2,
    bodyFriction: 1,
    bodyRestitution: 0,
    wheelMass: 1,
    wheelFriction: 0.8,
    wheelRestitution: 0,
    turretMass: 0.2,
    barrelMass: 0.09,
    axleFriction: 0,
    suspensionMinLimit: -0.2,
    suspensionMaxLimit: 0.033,
    suspensionStiffness: 100,
    suspensionDamping: 7,
    noOfWheels: 10,
    recoilForce: 7.5,
    cooldown: 5000,
    loadCooldown: 2500
  };

  state: Player;
  body!: TransformNode;
  barrel!: AbstractMesh;
  turret!: AbstractMesh;
  private axles: TransformNode[] = [];
  private axleJoints: TransformNode[] = [];
  private axleMotors: Physics6DoFConstraint[] = [];
  private barrelMotor!: Physics6DoFConstraint;
  private turretMotor!: Physics6DoFConstraint;
  private loadedShell!: Shell;
  public leftSpeed = 0;
  public rightSpeed = 0;
  private isStuck = false;
  private isCanonReady = true;
  private lastFired = 0;
  private observers: Observer<any>[] = [];
  health: number = 100.0;

  private constructor(public world: World, public id: string, rootMesh: AbstractMesh, public spawn: Vector3) {
    this.setTransform(rootMesh);
    this.setPhysics(rootMesh);

    this.observers.push(world.scene.onBeforeStepObservable.add(this.beforeStep.bind(this)));
  }
  static async create(world: World, id: string, rootMesh: AbstractMesh, spawn: Vector3) {
    const cloned = rootMesh.clone(`${rootMesh.name.replace(':Ref', '')}:${id}`, null) as AbstractMesh;
    const newTank = new Tank(world, id, cloned, spawn);
    await newTank.loadCannon(true);
    return newTank;
  }

  private setTransform(rootMesh: AbstractMesh) {
    this.body = new TransformNode(`Root:${rootMesh.name}`, this.world.scene);
    for (let i = 0; i < Tank.config.noOfWheels; i += 1) {
      const axleJoint = new TransformNode(`axlejoint${i}`, this.world.scene);
      const axleMesh = MeshBuilder.CreateSphere(
        `axle${i}`,
        { diameterY: 0.6, diameterX: 0.75, diameterZ: 0.75, segments: 5 },
        this.world.scene
      );
      axleMesh.rotate(Axis.Z, Math.PI / 2, Space.LOCAL);
      axleMesh.bakeCurrentTransformIntoVertices();
      axleMesh.parent = axleJoint;
      axleMesh.isVisible = false;
      this.axleJoints.push(axleJoint);
      this.axles.push(axleMesh);
    }

    rootMesh.position = Vector3.Zero();
    const childMeshes = rootMesh.getChildMeshes();
    this.barrel = childMeshes[0];
    this.turret = childMeshes[6];
    this.barrel.position.y = -0.51;
    this.barrel.position.z = 1.79;
    this.barrel.parent = this.turret;
    rootMesh.parent = this.body;
    this.body.position = this.spawn;

    rootMesh.isVisible = true;
    childMeshes.forEach((mesh) => (mesh.isVisible = true));
  }
  private setPhysics(rootMesh: AbstractMesh) {
    const bodyShape = new PhysicsShapeConvexHull(rootMesh as Mesh, this.world.scene);
    const bodyShapeContainer = new PhysicsShapeContainer(this.world.scene);
    bodyShapeContainer.addChildFromParent(this.body, bodyShape, rootMesh);
    const bodyPB = new PhysicsBody(this.body, PhysicsMotionType.DYNAMIC, false, this.world.scene);
    bodyShapeContainer.material = {
      friction: Tank.config.bodyFriction,
      restitution: Tank.config.bodyRestitution
    };
    bodyPB.shape = bodyShapeContainer;
    bodyPB.setMassProperties({ mass: Tank.config.bodyMass, centerOfMass: Vector3.Zero() });

    const turretShape = new PhysicsShapeConvexHull(this.turret as Mesh, this.world.scene);
    turretShape.material = { friction: 0, restitution: 0 };
    const turretPB = new PhysicsBody(this.turret, PhysicsMotionType.DYNAMIC, false, this.world.scene);
    turretPB.shape = turretShape;
    turretPB.setMassProperties({ mass: Tank.config.turretMass, centerOfMass: Vector3.Zero() });
    this.turretMotor = this.createTurretConstraint(
      this.turret.position,
      Vector3.Zero(),
      new Vector3(1, 0, 1),
      new Vector3(1, 0, 1),
      new Vector3(0, 1, 0),
      new Vector3(0, 1, 0),
      bodyPB,
      turretPB
    );

    const barrelShape = new PhysicsShapeConvexHull(this.barrel as Mesh, this.world.scene);
    barrelShape.material = { friction: 0, restitution: 0 };
    const barrelPB = new PhysicsBody(this.barrel, PhysicsMotionType.DYNAMIC, false, this.world.scene);
    barrelPB.shape = barrelShape;
    barrelPB.setMassProperties({ mass: Tank.config.barrelMass, centerOfMass: Vector3.Zero() });
    this.barrelMotor = this.createBarrelConstraint(
      this.barrel.position,
      Vector3.Zero(),
      new Vector3(1, 0, 0),
      new Vector3(1, 0, 0),
      new Vector3(0, 1, 0),
      new Vector3(0, 1, 0),
      turretPB,
      barrelPB
    );

    const wheelPositions: Vector3[] = [
      new Vector3(-1.475, 0.2, 2),
      new Vector3(-1.475, 0.2, 1),
      new Vector3(-1.475, 0.2, 0),
      new Vector3(-1.475, 0.2, -1),
      new Vector3(-1.475, 0.2, -2),
      new Vector3(1.475, 0.2, 2),
      new Vector3(1.475, 0.2, 1),
      new Vector3(1.475, 0.2, 0),
      new Vector3(1.475, 0.2, -1),
      new Vector3(1.475, 0.2, -2)
    ];

    const axleShape = new PhysicsShapeSphere(Vector3.Zero(), 0.375, this.world.scene);
    for (let i = 0; i < Tank.config.noOfWheels; i += 1) {
      const axleJoint = this.axleJoints[i];
      const axle = this.axles[i];

      axle.position = Vector3.Zero();
      axleJoint.parent = this.body;
      axleJoint.position = wheelPositions[i];

      const axleAgg = new PhysicsAggregate(
        axle,
        axleShape,
        {
          mass: Tank.config.wheelMass,
          friction: Tank.config.wheelFriction,
          restitution: Tank.config.wheelRestitution
        },
        this.world.scene
      );
      (axle as Mesh).collisionRetryCount = 5;

      this.axleMotors.push(
        this.createWheelConstraint(wheelPositions[i], axle.position, bodyPB, axleAgg.body)
      );
      this.axles.push(axle);
    }
  }
  private createWheelConstraint(
    pivotA: Vector3,
    pivotB: Vector3,
    parent: PhysicsBody,
    child: PhysicsBody
  ): Physics6DoFConstraint {
    const _6dofConstraint = new Physics6DoFConstraint(
      {
        pivotA,
        pivotB,
        axisA: new Vector3(1, 0, 0),
        axisB: new Vector3(1, 0, 0),
        perpAxisA: new Vector3(0, 1, 0),
        perpAxisB: new Vector3(0, 1, 0)
      },
      [
        { axis: PhysicsConstraintAxis.LINEAR_X, minLimit: 0, maxLimit: 0 },
        {
          axis: PhysicsConstraintAxis.LINEAR_Y,
          minLimit: Tank.config.suspensionMinLimit,
          maxLimit: Tank.config.suspensionMaxLimit,
          stiffness: Tank.config.suspensionStiffness,
          damping: Tank.config.suspensionDamping
        },
        { axis: PhysicsConstraintAxis.LINEAR_Z, minLimit: 0, maxLimit: 0 },
        { axis: PhysicsConstraintAxis.ANGULAR_Y, minLimit: 0, maxLimit: 0 },
        { axis: PhysicsConstraintAxis.ANGULAR_Z, minLimit: 0, maxLimit: 0 }
      ],
      this.world.scene
    );

    parent.addConstraint(child, _6dofConstraint);
    _6dofConstraint.setAxisFriction(PhysicsConstraintAxis.ANGULAR_X, Tank.config.axleFriction);
    _6dofConstraint.setAxisMotorType(PhysicsConstraintAxis.ANGULAR_X, PhysicsConstraintMotorType.VELOCITY);
    _6dofConstraint.setAxisMotorMaxForce(PhysicsConstraintAxis.ANGULAR_X, Tank.config.maxEnginePower);

    return _6dofConstraint;
  }
  private createBarrelConstraint(
    pivotA: Vector3,
    pivotB: Vector3,
    axisA: Vector3,
    axisB: Vector3,
    perpAxisA: Vector3,
    perpAxisB: Vector3,
    parent: PhysicsBody,
    child: PhysicsBody
  ): Physics6DoFConstraint {
    const _6dofConstraint = new Physics6DoFConstraint(
      {
        pivotA,
        pivotB,
        axisA,
        axisB,
        perpAxisA,
        perpAxisB
      },
      [
        { axis: PhysicsConstraintAxis.LINEAR_X, minLimit: 0, maxLimit: 0 },
        { axis: PhysicsConstraintAxis.LINEAR_Y, minLimit: 0, maxLimit: 0 },
        { axis: PhysicsConstraintAxis.LINEAR_Z, minLimit: 0, maxLimit: 0 },
        {
          axis: PhysicsConstraintAxis.ANGULAR_X,
          minLimit: -Tank.config.maxBarrelAngle,
          maxLimit: Tank.config.maxBarrelAngle
        },
        { axis: PhysicsConstraintAxis.ANGULAR_Y, minLimit: 0, maxLimit: 0 },
        { axis: PhysicsConstraintAxis.ANGULAR_Z, minLimit: 0, maxLimit: 0 }
      ],
      this.world.scene
    );

    parent.addConstraint(child, _6dofConstraint);
    _6dofConstraint.setAxisFriction(PhysicsConstraintAxis.ANGULAR_X, 1);
    _6dofConstraint.setAxisMotorType(PhysicsConstraintAxis.ANGULAR_X, PhysicsConstraintMotorType.VELOCITY);
    _6dofConstraint.setAxisMotorMaxForce(PhysicsConstraintAxis.ANGULAR_X, 100);

    return _6dofConstraint;
  }
  private createTurretConstraint(
    pivotA: Vector3,
    pivotB: Vector3,
    axisA: Vector3,
    axisB: Vector3,
    perpAxisA: Vector3,
    perpAxisB: Vector3,
    parent: PhysicsBody,
    child: PhysicsBody
  ): Physics6DoFConstraint {
    const _6dofConstraint = new Physics6DoFConstraint(
      {
        pivotA,
        pivotB,
        axisA,
        axisB,
        perpAxisA,
        perpAxisB
      },
      [
        { axis: PhysicsConstraintAxis.LINEAR_X, minLimit: 0, maxLimit: 0 },
        { axis: PhysicsConstraintAxis.LINEAR_Y, minLimit: 0, maxLimit: 0 },
        { axis: PhysicsConstraintAxis.LINEAR_Z, minLimit: 0, maxLimit: 0 },
        { axis: PhysicsConstraintAxis.ANGULAR_X, minLimit: 0, maxLimit: 0 },
        {
          axis: PhysicsConstraintAxis.ANGULAR_Y,
          minLimit: -Tank.config.maxTurretAngle,
          maxLimit: Tank.config.maxTurretAngle
        },
        { axis: PhysicsConstraintAxis.ANGULAR_Z, minLimit: 0, maxLimit: 0 }
      ],
      this.world.scene
    );

    parent.addConstraint(child, _6dofConstraint);
    _6dofConstraint.setAxisFriction(PhysicsConstraintAxis.ANGULAR_Y, 1);
    _6dofConstraint.setAxisMotorType(PhysicsConstraintAxis.ANGULAR_Y, PhysicsConstraintMotorType.VELOCITY);
    _6dofConstraint.setAxisMotorMaxForce(PhysicsConstraintAxis.ANGULAR_Y, 100);

    return _6dofConstraint;
  }
  private async loadCannon(init: boolean = false) {
    if (!init) {
      // Play load sound on original client
      this.world.room.sendEvent<IMessageTypeLoad>(MessageType.LOAD, {}, this.id);
    }
    this.loadedShell = await Shell.create(this);
    this.isCanonReady = true;
  }
  private beforeStep() {
    const now = performance.now();
    this.state.canFire = now - this.lastFired > Tank.config.cooldown;

    if (!this.isCanonReady && now - this.lastFired > Tank.config.loadCooldown) {
      // Takes few ticks, explicitly setting isCanonReady to prevent multiple loads
      this.loadCannon();
      this.isCanonReady = true;
    }
  }
  private simulateRecoil() {
    const recoilVector = this.turret
      .getDirection(new Vector3(0, 1, -1))
      .normalize()
      .scale(Tank.config.recoilForce);
    const contactPoint = this.body.up
      .normalize()
      .scale(1)
      .add(this.body.position)
      .add(this.turret.forward.normalize().scale(1));
    this.body.physicsBody!.applyImpulse(recoilVector, contactPoint);
  }

  public accelerate(dt: number, turningDirection: -1 | 0 | 1) {
    if (turningDirection !== -1) {
      this.leftSpeed = clamp(
        this.leftSpeed + dt * Tank.config.speedModifier,
        -Tank.config.maxSpeed,
        Tank.config.maxSpeed
      );
    }
    if (turningDirection !== 1) {
      this.rightSpeed = clamp(
        this.rightSpeed + dt * Tank.config.speedModifier,
        -Tank.config.maxSpeed,
        Tank.config.maxSpeed
      );
    }

    this.axleMotors.forEach((motor, idx) => {
      motor.setAxisMotorTarget(PhysicsConstraintAxis.ANGULAR_X, idx < 5 ? this.leftSpeed : this.rightSpeed);
    });
  }
  public reverse(dt: number, turningDirection: -1 | 0 | 1) {
    if (turningDirection !== -1) {
      this.leftSpeed = clamp(
        this.leftSpeed - dt * Tank.config.speedModifier,
        -Tank.config.maxSpeed,
        Tank.config.maxSpeed
      );
    }
    if (turningDirection !== 1) {
      this.rightSpeed = clamp(
        this.rightSpeed - dt * Tank.config.speedModifier,
        -Tank.config.maxSpeed,
        Tank.config.maxSpeed
      );
    }

    this.axleMotors.forEach((motor, idx) => {
      motor.setAxisMotorTarget(PhysicsConstraintAxis.ANGULAR_X, idx < 5 ? this.leftSpeed : this.rightSpeed);
    });
  }
  public left(dt: number, isAccelerating: boolean) {
    if (!isAccelerating) {
      // If not accelerating, even-out speeds to prevent sudden halt
      this.leftSpeed = clamp(
        this.leftSpeed +
          (this.leftSpeed > -Tank.config.maxTurningSpeed ? -1 : 1) * dt * Tank.config.speedModifier,
        -Tank.config.maxSpeed,
        Tank.config.maxSpeed
      );
      this.rightSpeed = clamp(
        this.rightSpeed +
          (this.rightSpeed > Tank.config.maxTurningSpeed ? -1 : 1) * dt * Tank.config.decelerationModifier,
        -Tank.config.maxSpeed,
        Tank.config.maxSpeed
      );
    } else {
      // Reduce power of left axle to half of right axle
      this.leftSpeed = Scalar.Lerp(this.leftSpeed, this.rightSpeed / 2, dt * Tank.config.speedModifier);
    }

    this.axleMotors.forEach((motor, idx) => {
      motor.setAxisMotorTarget(PhysicsConstraintAxis.ANGULAR_X, idx < 5 ? this.leftSpeed : this.rightSpeed);
    });
  }
  public right(dt: number, isAccelerating: boolean) {
    if (!isAccelerating) {
      // If not accelerating, even out speeds
      this.leftSpeed = clamp(
        this.leftSpeed +
          (this.leftSpeed > Tank.config.maxTurningSpeed ? -1 : 1) * dt * Tank.config.decelerationModifier,
        -Tank.config.maxSpeed,
        Tank.config.maxSpeed
      );
      this.rightSpeed = clamp(
        this.rightSpeed +
          (this.rightSpeed > -Tank.config.maxTurningSpeed ? -1 : 1) * dt * Tank.config.speedModifier,
        -Tank.config.maxSpeed,
        Tank.config.maxSpeed
      );
    } else {
      // Reduce power of right axle to half of left axle
      this.rightSpeed = Scalar.Lerp(this.rightSpeed, this.leftSpeed / 2, dt * Tank.config.speedModifier);
    }

    this.axleMotors.forEach((motor, idx) =>
      motor.setAxisMotorTarget(PhysicsConstraintAxis.ANGULAR_X, idx < 5 ? this.leftSpeed : this.rightSpeed)
    );
  }
  public brake(dt: number) {
    this.decelerate(dt, Tank.config.speedModifier);
  }
  public decelerate(dt: number, modifier: number = Tank.config.decelerationModifier) {
    let speed = 0;
    if (this.leftSpeed < 0.001 && this.rightSpeed < 0.001) {
      this.leftSpeed = this.rightSpeed = 0;
      speed = 0;
    } else {
      this.leftSpeed = clamp(
        this.leftSpeed + Math.sign(this.leftSpeed) * -1 * dt * modifier,
        -Tank.config.maxSpeed,
        Tank.config.maxSpeed
      );
      this.rightSpeed = clamp(
        this.rightSpeed + Math.sign(this.rightSpeed) * -1 * dt * modifier,
        -Tank.config.maxSpeed,
        Tank.config.maxSpeed
      );
      // Even out while decelerating
      speed = avg([this.leftSpeed, this.rightSpeed]);
    }

    this.axleMotors.forEach((motor) => motor.setAxisMotorTarget(PhysicsConstraintAxis.ANGULAR_X, speed));
  }
  public turretLeft(dt: number) {
    this.turretMotor.setAxisMotorTarget(PhysicsConstraintAxis.ANGULAR_Y, -dt * Tank.config.maxTurretSpeed);
  }
  public turretRight(dt: number) {
    this.turretMotor.setAxisMotorTarget(PhysicsConstraintAxis.ANGULAR_Y, dt * Tank.config.maxTurretSpeed);
  }
  public stopTurret() {
    this.turretMotor.setAxisMotorTarget(PhysicsConstraintAxis.ANGULAR_Y, 0);
  }
  public barrelUp(dt: number) {
    this.barrelMotor.setAxisMotorTarget(PhysicsConstraintAxis.ANGULAR_X, -dt * Tank.config.maxBarrelSpeed);
  }
  public barrelDown(dt: number) {
    this.barrelMotor.setAxisMotorTarget(PhysicsConstraintAxis.ANGULAR_X, dt * Tank.config.maxBarrelSpeed);
  }
  public stopBarrel() {
    this.barrelMotor.setAxisMotorTarget(PhysicsConstraintAxis.ANGULAR_X, 0);
  }
  public resetTurret(dt: number) {
    const turretEuler = this.turret.rotationQuaternion!.toEulerAngles();
    const barrelEuler = this.barrel.rotationQuaternion!.toEulerAngles();

    if (Math.abs(turretEuler.y) > 0.01) {
      turretEuler.y < 0 ? this.turretRight(dt) : this.turretLeft(dt);
    }
    if (Math.abs(barrelEuler.x) > 0.01) {
      barrelEuler.x < 0 ? this.barrelDown(dt) : this.barrelUp(dt);
    }
  }
  public fire() {
    const now = performance.now();
    if (now - this.lastFired <= Tank.config.cooldown) return false;

    this.loadedShell.fire();
    this.simulateRecoil();

    this.lastFired = now;
    this.isCanonReady = false;
    return true;
  }

  public explode() {
    // TODO
  }
  public checkStuck() {
    if (this.body.up.y < 0) this.isStuck = true;
    // TODO: Delayed explosion ?
  }
  public dispose() {
    this.observers.forEach((observer) => observer.remove());
    this.loadedShell?.dispose();
    this.turret.physicsBody?.dispose();
    this.barrel.physicsBody?.dispose();
    this.axles.forEach((axle) => axle.physicsBody?.dispose());
    this.body.dispose();
  }
}
