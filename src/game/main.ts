import '@babylonjs/core/Debug/debugLayer';
import '@babylonjs/inspector';
import '@babylonjs/loaders/glTF/2.0/glTFLoader';
import { Scene, NullEngine, Observer } from '@babylonjs/core';
import { SceneLoader } from '@babylonjs/core/Loading';
import { Axis, Space, Vector3 } from '@babylonjs/core/Maths';
import { AbstractMesh, MeshBuilder, TransformNode } from '@babylonjs/core/Meshes';
import { PBRMaterial } from '@babylonjs/core/Materials';
import { HavokPlugin, PhysicsAggregate, PhysicsShapeType } from '@babylonjs/core/Physics';
import HavokPhysics, { type HavokPhysicsWithBindings } from '@babylonjs/havok';

import { choose, gravityVector, randInRange } from '@/game/utils';
import { InputManager } from './input';
import { Tank } from './models/tank';
import { Ground } from './models/ground';
import { RoomState } from '@/rooms/schema/RoomState';
import { GameInputType, SpawnAxis } from '@/types/types';
import { spawnAxes } from './constants';

export class World {
  private physicsPlugin: HavokPlugin;
  private scene: Scene;
  private tankMeshes: AbstractMesh[] = [];
  players: Record<string, Tank> = {};
  private static timeStep = 1 / 60;
  private static subTimeStep = 16;
  private observers: Observer<Scene>[] = [];

  private constructor(
    public engine: NullEngine,
    public physicsEngine: HavokPhysicsWithBindings,
    public inputs: Record<string, InputManager>,
    public state: RoomState
  ) {
    this.scene = new Scene(this.engine);
    this.physicsPlugin = new HavokPlugin(false, physicsEngine);
    this.scene.enablePhysics(gravityVector, this.physicsPlugin);
    this.physicsPlugin.setTimeStep(0);
    this.scene.getPhysicsEngine()?.setSubTimeStep(World.subTimeStep);
  }
  static async create(inputs: Record<string, InputManager>, state: RoomState): Promise<World> {
    const engine = new NullEngine({
      renderWidth: 512,
      renderHeight: 256,
      textureSize: 512,
      deterministicLockstep: true,
      lockstepMaxSteps: 4
    });
    const physicsEngine = await HavokPhysics();
    const instance = new World(engine, physicsEngine, inputs, state);

    await World.importPlayerMesh(instance);
    await instance.initScene();
    instance.start();

    return instance;
  }

  private static async importPlayerMesh(instance: World) {
    const { meshes } = await SceneLoader.ImportMeshAsync(
      null,
      '/assets/models/',
      'Panzer_I.glb',
      instance.scene
    );

    meshes[0].position = Vector3.Zero();
    meshes[0].rotation = Vector3.Zero();
    meshes[0].scaling = Vector3.One();
    const container = meshes.shift();
    setTimeout(() => container?.dispose());

    meshes.forEach((mesh) => {
      mesh.parent = mesh !== meshes[0] ? meshes[0] : null;
      (mesh.material as PBRMaterial).metallicF0Factor = 0;
      mesh.isVisible = false;
    });
    meshes[0].name = 'Panzer_I:Ref';
    instance.tankMeshes = meshes;
  }
  private async initScene() {
    await Ground.create(this.scene);
    this.setBarriers();

    this.observers.push(this.scene.onBeforeStepObservable.add(this.beforeStep.bind(this)));
  }
  private setBarriers() {
    const barrier = new TransformNode('barrier', this.scene);

    const barrier1 = MeshBuilder.CreateBox('barrier1', { width: 500, height: 20, depth: 1 }, this.scene);
    barrier1.position = new Vector3(0, 9, -249);
    const barrier2 = MeshBuilder.CreateBox('barrier2', { width: 500, height: 20, depth: 1 }, this.scene);
    barrier2.position = new Vector3(0, 9, 249);
    const barrier3 = MeshBuilder.CreateBox('barrier3', { width: 500, height: 20, depth: 1 }, this.scene);
    barrier3.rotate(Axis.Y, Math.PI / 2, Space.LOCAL);
    barrier3.position = new Vector3(-249, 9, 0);
    const barrier4 = MeshBuilder.CreateBox('barrier4', { width: 500, height: 20, depth: 1 }, this.scene);
    barrier4.rotate(Axis.Y, Math.PI / 2, Space.LOCAL);
    barrier4.position = new Vector3(249, 9, 0);

    barrier1.parent = barrier;
    barrier2.parent = barrier;
    barrier3.parent = barrier;
    barrier4.parent = barrier;

    new PhysicsAggregate(barrier1, PhysicsShapeType.BOX, { mass: 0 }, this.scene);
    new PhysicsAggregate(barrier2, PhysicsShapeType.BOX, { mass: 0 }, this.scene);
    new PhysicsAggregate(barrier3, PhysicsShapeType.BOX, { mass: 0 }, this.scene);
    new PhysicsAggregate(barrier4, PhysicsShapeType.BOX, { mass: 0 }, this.scene);
  }
  private beforeStep() {
    const deltaTime = this.engine.getTimeStep() / 1000;
    this.state.players.forEach((player) => {
      const input = this.inputs[player.sid];

      let isMoving = false;
      const turningDirection = input.keys[GameInputType.LEFT] ? -1 : input.keys[GameInputType.RIGHT] ? 1 : 0;
      const isAccelerating = input.keys[GameInputType.FORWARD] || input.keys[GameInputType.REVERSE];
      const isTurretMoving = input.keys[GameInputType.TURRET_LEFT] || input.keys[GameInputType.TURRET_RIGHT];
      const isBarrelMoving = input.keys[GameInputType.BARREL_UP] || input.keys[GameInputType.BARREL_DOWN];

      if (input.keys[GameInputType.FORWARD]) {
        this.players[player.sid].accelerate(deltaTime, turningDirection);
        isMoving = true;
      }
      if (input.keys[GameInputType.REVERSE]) {
        this.players[player.sid].reverse(deltaTime, turningDirection);
        isMoving = true;
      }
      if (input.keys[GameInputType.LEFT]) {
        this.players[player.sid].left(deltaTime, isAccelerating);
        isMoving = true;
      }
      if (input.keys[GameInputType.RIGHT]) {
        this.players[player.sid].right(deltaTime, isAccelerating);
        isMoving = true;
      }
      if (input.keys[GameInputType.BRAKE]) {
        this.players[player.sid].brake(deltaTime);
      }
      if (!isMoving) {
        this.players[player.sid].decelerate(deltaTime);
      }
      if (!isTurretMoving) {
        this.players[player.sid].stopTurret();
      }
      if (!isBarrelMoving) {
        this.players[player.sid].stopBarrel();
      }
      if (input.keys[GameInputType.TURRET_LEFT]) {
        this.players[player.sid].turretLeft(deltaTime);
      }
      if (input.keys[GameInputType.TURRET_RIGHT]) {
        this.players[player.sid].turretRight(deltaTime);
      }
      if (input.keys[GameInputType.BARREL_UP]) {
        this.players[player.sid].barrelUp(deltaTime);
      }
      if (input.keys[GameInputType.BARREL_DOWN]) {
        this.players[player.sid].barrelDown(deltaTime);
      }
      if (input.keys[GameInputType.RESET] && !isTurretMoving && !isBarrelMoving) {
        this.players[player.sid].resetTurret(deltaTime);
      }
      if (input.keys[GameInputType.FIRE]) {
        this.players[player.sid].fire();
      }

      this.players[player.sid].checkStuck();
    });
  }
  async createTank(id: string) {
    let spawn: Vector3;
    if (Object.keys(this.players).length) {
      // Mirroring the remaining player
      spawn = Object.values(this.players)[0].body.absolutePosition;
      spawn = new Vector3(-1 * spawn.x, 14, -1 * spawn.z);
    } else {
      spawn = this.getSpawnPoint();
    }

    this.players[id] = await Tank.create(id, this.tankMeshes, spawn, this.scene, this.physicsPlugin);
    return this.players[id];
  }
  removeTank(id: string) {
    this.players[id].dispose();
  }
  private start() {
    this.engine.runRenderLoop(this.render.bind(this));
    this.physicsPlugin.setTimeStep(World.timeStep);
  }
  private stop() {
    this.physicsPlugin.setTimeStep(0);
    this.engine.stopRenderLoop();
  }
  private render() {
    this.scene.render();
  }
  private getSpawnPoint(): Vector3 {
    switch (choose<SpawnAxis>(spawnAxes)) {
      case SpawnAxis.PX:
        return new Vector3(245, 14, Math.round(randInRange(-245, 245)));
      case SpawnAxis.NX:
        return new Vector3(-245, 14, Math.round(randInRange(-245, 245)));
      case SpawnAxis.PZ:
        return new Vector3(Math.round(randInRange(-245, 245)), 14, 245);
      case SpawnAxis.NZ:
        return new Vector3(Math.round(randInRange(-245, 245)), 14, -245);
      default:
        return new Vector3(245, 14, Math.round(randInRange(-245, 245)));
    }
  }

  public destroy() {
    this.observers.forEach((observer) => observer.remove());
    this.scene.dispose();
    this.engine.dispose();
  }
}