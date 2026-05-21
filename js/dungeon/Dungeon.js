import { TILE_SIZE } from '../utils/constants.js';
import { RNG } from '../utils/RNG.js';
import { Room } from './Room.js';

export class Dungeon {
  constructor(dungeonDef, floor) {
    this.def = dungeonDef;
    this.floor = floor;
    this.width = 0;
    this.height = 0;
    this.tiles = [];
    this.rooms = [];
    this.floorColor = dungeonDef.floorColor;
    this.wallColor = dungeonDef.wallColor;
    this.accentColor = dungeonDef.accentColor;
    this.rng = new RNG(dungeonDef.id.charCodeAt(0) * 10000 + floor * 777);
  }

  /** Genera la mazmorra procedural con BSP-lite: habitaciones, pasillos, tiles */
  generate() {
    const roomCount = 5 + Math.min(this.floor, 10);
    const gridSize = Math.ceil(Math.sqrt(roomCount * 2.5));
    const roomGridW = gridSize;
    const roomGridH = gridSize;
    const roomW = 12 + this.rng.nextInt(0, 4);
    const roomH = 10 + this.rng.nextInt(0, 4);

    this.width = roomGridW * (roomW + 3) + 3;
    this.height = roomGridH * (roomH + 3) + 3;
    this.tiles = new Array(this.width * this.height).fill(1);

    const roomPositions = [];

    const startGR = this.rng.nextInt(0, roomGridH - 1);
    const startGC = this.rng.nextInt(0, roomGridW - 1);
    roomPositions.push({ gr: startGR, gc: startGC, type: 'spawn' });

    const queue = [{ gr: startGR, gc: startGC }];
    const visited = new Set([`${startGR},${startGC}`]);
    const allRooms = [{ gr: startGR, gc: startGC }];
    const parent = {}; // track BFS parents for corridors

    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];

    while (queue.length > 0 && allRooms.length < roomCount) {
      const idx = this.rng.nextInt(0, queue.length - 1);
      const current = queue[idx];
      const shuffled = this.rng.shuffle(dirs);

      let added = false;
      for (const [dr, dc] of shuffled) {
        const nr = current.gr + dr;
        const nc = current.gc + dc;
        const key = `${nr},${nc}`;
        if (nr >= 0 && nr < roomGridH && nc >= 0 && nc < roomGridW && !visited.has(key)) {
          visited.add(key);
          queue.push({ gr: nr, gc: nc });
          allRooms.push({ gr: nr, gc: nc });
          parent[key] = `${current.gr},${current.gc}`;
          added = true;
          break;
        }
      }

      if (!added) {
        queue.splice(idx, 1);
      }
    }

    const spawnIdx = allRooms.findIndex(r => r.gr === startGR && r.gc === startGC);
    const bossIdx = allRooms.length > 1 ? this.rng.nextInt(1, allRooms.length - 1) : -1;

    for (let i = 0; i < allRooms.length; i++) {
      const r = allRooms[i];
      const px = r.gc * (roomW + 3) + 2;
      const py = r.gr * (roomH + 3) + 2;

      let type = 'normal';
      if (i === spawnIdx) type = 'spawn';
      else if (i === bossIdx) type = 'boss';
      else if (this.rng.next() < 0.15) type = 'treasure';

      const room = new Room(px, py, roomW, roomH, type, this.rng, this.floor, this.def);
      room.carve(this.tiles, this.width);
      this.rooms.push(room);
    }

    // Connect each room to its BFS parent (guaranteed adjacent), not sequential allRooms order
    for (const r of allRooms) {
      const key = `${r.gr},${r.gc}`;
      const pKey = parent[key];
      if (!pKey) continue; // spawn room has no parent
      const [pgr, pgc] = pKey.split(',').map(Number);
      const cx = r.gc * (roomW + 3) + 2 + Math.floor(roomW / 2);
      const cy = r.gr * (roomH + 3) + 2 + Math.floor(roomH / 2);
      const nx = pgc * (roomW + 3) + 2 + Math.floor(roomW / 2);
      const ny = pgr * (roomH + 3) + 2 + Math.floor(roomH / 2);
      this.carveCorridor(cx, cy, nx, ny);
    }
  }

  carveCorridor(x1, y1, x2, y2) {
    let x = x1, y = y1;
    while (x !== x2) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const tx = x + dx, ty = y + dy;
          if (tx >= 0 && tx < this.width && ty >= 0 && ty < this.height) {
            this.tiles[ty * this.width + tx] = 0;
          }
        }
      }
      x += x < x2 ? 1 : -1;
    }
    while (y !== y2) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const tx = x + dx, ty = y + dy;
          if (tx >= 0 && tx < this.width && ty >= 0 && ty < this.height) {
            this.tiles[ty * this.width + tx] = 0;
          }
        }
      }
      y += y < y2 ? 1 : -1;
    }
  }

  isSolid(x, y, size) {
    const margin = 1;
    const left = Math.floor((x - size / 2 + margin) / 16);
    const right = Math.floor((x + size / 2 - margin) / 16);
    const top = Math.floor((y - size / 2 + margin) / 16);
    const bottom = Math.floor((y + size / 2 - margin) / 16);

    for (let ty = top; ty <= bottom; ty++) {
      for (let tx = left; tx <= right; tx++) {
        if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) return true;
        if (this.tiles[ty * this.width + tx] === 1) return true;
      }
    }
    return false;
  }

  isSolidTile(tx, ty) {
    if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) return true;
    return this.tiles[ty * this.width + tx] === 1;
  }

  getTile(tx, ty) {
    if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) return 1;
    return this.tiles[ty * this.width + tx];
  }

  getCurrentRoom(px, py) {
    const tx = Math.floor(px / 16);
    const ty = Math.floor(py / 16);
    return this.rooms.find(r => tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h);
  }

  isBossRoom(px, py) {
    const room = this.getCurrentRoom(px, py);
    return room?.type === 'boss';
  }

  isTreasureRoom(px, py) {
    const room = this.getCurrentRoom(px, py);
    return room?.type === 'treasure';
  }
}
