import * as migration_20261016_052329_initial from './20261016_052329_initial'

export const migrations = [
  {
    up: migration_20261016_052329_initial.up,
    down: migration_20261016_052329_initial.down,
    name: '20261016_052329_initial',
  },
]
