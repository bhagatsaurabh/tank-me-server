export enum GameInputType {
  FORWARD = 0,
  REVERSE = 1,
  LEFT = 2,
  RIGHT = 3,
  BRAKE = 4,
  BARREL_UP = 5,
  BARREL_DOWN = 6,
  TURRET_LEFT = 7,
  TURRET_RIGHT = 8,
  FIRE = 9,
  RESET = 10
}

export enum MessageType {
  DEFAULT = '*',
  INPUT = 'input',
  LOAD = 'load',
  ENEMY_FIRE = 'enemy-fire',
  MATCH_END = 'match-end'
}
export enum SpawnAxis {
  PX = 0,
  NX = 1,
  PZ = 2,
  NZ = 3
}

export type PlayerInputs = Partial<Record<GameInputType, boolean>>;
