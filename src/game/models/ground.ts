import { Scene } from '@babylonjs/core';
import { MeshBuilder, type GroundMesh } from '@babylonjs/core/Meshes';
import { PhysicsAggregate, PhysicsShapeType } from '@babylonjs/core/Physics';
import { createCanvas, loadImage } from 'canvas';

export class Ground {
  static groundFriction = 1;
  mesh: GroundMesh;

  private constructor() {}

  static async create(scene: Scene): Promise<Ground> {
    return await Ground.createMesh(scene);
  }
  private static createMesh(scene: Scene) {
    const ground = new Ground();
    return new Promise<Ground>((resolve, reject) => {
      loadImage('http://localhost:2567/assets/map/desert/height.png').then((image) => {
        const canvas = createCanvas(2048, 2048);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0, 2048, 2048);
        ground.mesh = MeshBuilder.CreateGroundFromHeightMap(
          'ground',
          {
            data: ctx.getImageData(0, 0, 2048, 2048).data as unknown as Uint8Array,
            width: 2048,
            height: 2048
          },
          {
            width: 500,
            height: 500,
            subdivisions: 250,
            minHeight: 0,
            maxHeight: 14,
            updatable: false,
            onReady: (mesh) => Ground.onGroundCreated(ground, scene, mesh, resolve),
            onError: (message: string, exception: any) => reject({ message, exception })
          },
          scene
        );
      });
    });
  }
  private static onGroundCreated(
    ground: Ground,
    scene: Scene,
    mesh: GroundMesh,
    done: (val: Ground) => void
  ) {
    const groundAgg = new PhysicsAggregate(
      mesh,
      PhysicsShapeType.MESH,
      { mass: 0, restitution: 0, friction: Ground.groundFriction },
      scene
    );
    groundAgg.body.setCollisionCallbackEnabled(true);
    mesh.collisionRetryCount = 5;
    mesh.position.y = 0;
    ground.mesh = mesh;

    done(ground);
  }

  dispose() {
    this.mesh.physicsBody?.dispose();
    this.mesh?.dispose();
  }
}
