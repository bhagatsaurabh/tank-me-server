import { Scene, NullEngine, Observer, FreeCamera } from '@babylonjs/core';
import { SceneLoader } from '@babylonjs/core/Loading';
import { Axis, Space, Vector3 } from '@babylonjs/core/Maths';
import { AbstractMesh, MeshBuilder, TransformNode } from '@babylonjs/core/Meshes';
import { PBRMaterial } from '@babylonjs/core/Materials';
import { HavokPlugin, PhysicsAggregate, PhysicsBody, PhysicsShapeType } from '@babylonjs/core/Physics';

import { choose, gravityVector, randInRange } from '@/game/utils/utils';
import { Tank } from './models/tank';
import { Ground } from './models/ground';
import { SpawnAxis } from '@/types/types';
import { spawnAxes } from './constants';
import { GameRoom } from '@/rooms/GameRoom';
import { physicsEngine } from '@/app.config';
import { Player } from '@/rooms/schema/RoomState';
import { IMessageInput } from '@/types/interfaces';

export class World {
  private static timeStep = 1 / 60;
  private static subTimeStep = 12;
  private static lockstepMaxSteps = 4;
  static deltaTime = World.timeStep;

  private tankMeshes: AbstractMesh[] = [];
  private observers: Observer<Scene>[] = [];
  private camera: FreeCamera;
  private ground!: Ground;
  physicsPlugin: HavokPlugin;
  scene: Scene;
  players: Record<string, Tank> = {};
  physicsBodies: PhysicsBody[] = [];
  isStarted = true;
  isDestroyed = false;

  private constructor(public engine: NullEngine, public room: GameRoom) {
    this.scene = new Scene(this.engine);
    this.physicsPlugin = new HavokPlugin(false, physicsEngine);
    this.scene.enablePhysics(gravityVector, this.physicsPlugin);
    // Not simulating anything until the scene is fully loaded
    this.physicsPlugin.setTimeStep(0);
    this.scene.getPhysicsEngine()?.setSubTimeStep(World.subTimeStep);
  }
  static async create(room: GameRoom): Promise<World> {
    const engine = new NullEngine({
      renderWidth: 512,
      renderHeight: 256,
      textureSize: 512,
      deterministicLockstep: true,
      lockstepMaxSteps: World.lockstepMaxSteps
    });
    const instance = new World(engine, room);
    await World.importPlayerMesh(instance);
    await instance.initScene();
    instance.start();
    return instance;
  }

  private static async importPlayerMesh(instance: World) {
    const { meshes } = await SceneLoader.ImportMeshAsync(
      null,
      'http://localhost:2567/assets/models/',
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
    meshes[0].name = 'Panzer:Ref';
    instance.tankMeshes = meshes;
  }
  private async initScene() {
    this.ground = await Ground.create(this.scene);
    this.setBarriers();
    this.setCamera();

    this.observers.push(this.scene.onBeforeStepObservable.add(() => this.beforeStep()));
  }
  lastProcessedInput: Record<string, IMessageInput> = {};
  private beforeStep() {
    if (this.room.isMatchEnded) {
      this.stop();
      return;
    }

    // Approach 2: Interlaced update
    const players: Player[] = [];
    const playerMessages: IMessageInput[][] = [];

    // 1. Get inputs from queued messages
    this.room.state.players.forEach((player) => {
      players.push(player);
      playerMessages.push(this.room.inputs[player.sid].getAll());
    });

    // 2. Process inputs
    for (let i = 0; i < Math.max(...playerMessages.map((messages) => messages.length)); i += 1) {
      players.forEach((player, idx) => {
        playerMessages[idx][i]?.input && this.players[player.sid].applyInputs(playerMessages[idx][i].input);
      });
      this.scene._advancePhysicsEngineStep(World.deltaTime);
    }
    players.forEach(
      (player, idx) =>
        (this.lastProcessedInput[player.sid] = playerMessages[idx][playerMessages[idx].length - 1])
    );
  }
  private setCamera() {
    this.camera = new FreeCamera('default', new Vector3(245, 245, 245), this.scene, true);
    this.camera.target = Vector3.Zero();
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
    barrier4.position = new Vector3(249, 9, 0);
    barrier4.rotate(Axis.Y, -Math.PI / 2, Space.LOCAL);

    barrier1.parent = barrier;
    barrier2.parent = barrier;
    barrier3.parent = barrier;
    barrier4.parent = barrier;

    new PhysicsAggregate(barrier1, PhysicsShapeType.BOX, { mass: 0 }, this.scene);
    new PhysicsAggregate(barrier2, PhysicsShapeType.BOX, { mass: 0 }, this.scene);
    new PhysicsAggregate(barrier3, PhysicsShapeType.BOX, { mass: 0 }, this.scene);
    new PhysicsAggregate(barrier4, PhysicsShapeType.BOX, { mass: 0 }, this.scene);
  }
  private start() {
    Object.values(this.players).forEach((player) => this.physicsBodies.push(...player.physicsBodies));
    this.engine.runRenderLoop(this.render.bind(this));
    this.physicsPlugin.setTimeStep(World.timeStep);
  }
  private stop() {
    if (!this.isStarted) return;

    this.physicsPlugin.setTimeStep(0);
    this.isStarted = false;
  }
  private render() {
    if (!this.isStarted) return;
    try {
      this.scene.render();
    } catch (e) {
      //
    }
  }
  private getSpawnPoint(): Vector3 {
    switch (choose<SpawnAxis>(spawnAxes)) {
      case SpawnAxis.PX:
        return new Vector3(240, 15, Math.round(randInRange(-240, 240)));
      case SpawnAxis.NX:
        return new Vector3(-240, 15, Math.round(randInRange(-240, 240)));
      case SpawnAxis.PZ:
        return new Vector3(Math.round(randInRange(-240, 240)), 15, 240);
      case SpawnAxis.NZ:
        return new Vector3(Math.round(randInRange(-240, 240)), 15, -240);
      default:
        return new Vector3(240, 15, Math.round(randInRange(-240, 240)));
    }
  }

  async createTank(id: string) {
    let spawn: Vector3;
    if (Object.keys(this.players).length) {
      // Mirroring the 'other' player
      spawn = Object.values(this.players)[0].body.position;
      spawn = new Vector3(-1 * spawn.x, 14, -1 * spawn.z);
    } else {
      spawn = this.getSpawnPoint();
    }

    this.players[id] = await Tank.create(this, id, this.tankMeshes[0], spawn);
    return this.players[id];
  }
  removeTank(id: string) {
    this.players[id]?.dispose();
  }
  destroy() {
    if (this.isDestroyed) return;

    this.observers.forEach((observer) => observer.remove());
    Object.values(this.players).forEach((player) => player?.dispose());
    this.ground?.dispose();
    this.scene.dispose();
    this.engine.dispose();
    this.isDestroyed = true;
    this.room.disconnect();
  }
}
