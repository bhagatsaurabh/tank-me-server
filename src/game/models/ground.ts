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
    return new Promise<Ground>((resolve) => {
      ground.mesh = MeshBuilder.CreateGroundFromHeightMap(
        'ground',
        '/assets/map/desert/height.png',
        {
          width: 500,
          height: 500,
          subdivisions: 250,
          minHeight: 0,
          maxHeight: 14,
          updatable: false,
          onReady: (mesh) => Ground.onGroundCreated(ground, scene, mesh, resolve)
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
    console.log(ground.mesh === mesh);

    const groundAgg = new PhysicsAggregate(
      mesh,
      PhysicsShapeType.MESH,
      { mass: 0, restitution: 0, friction: Ground.groundFriction },
      scene
    );
    groundAgg.body.setCollisionCallbackEnabled(true);
    ground.mesh.collisionRetryCount = 5;

    mesh.position.y = 0;

    done(ground);
  }
}
