import { Scene } from '@babylonjs/core';
import { MeshBuilder, type GroundMesh } from '@babylonjs/core/Meshes';
import { PhysicsAggregate, PhysicsShapeType } from '@babylonjs/core/Physics';

export class Ground {
  static groundFriction = 1;
  mesh: GroundMesh;

  private constructor() {}

  static async create(scene: Scene): Promise<Ground> {
    return await Ground.createMesh(scene);
  }
  private static createMesh(scene: Scene) {
    const ground = new Ground();
    return new Promise<Ground>(async (resolve, reject) => {
      const heightMapData = await (
        await fetch('http://localhost:2567/assets/map/desert/height.png')
      ).arrayBuffer();

      ground.mesh = MeshBuilder.CreateGroundFromHeightMap(
        'ground',
        { data: new Uint8Array(heightMapData), width: 4096, height: 4096 },
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
}
