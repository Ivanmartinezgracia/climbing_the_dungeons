export class Room {
  constructor(x, y, w, h, type, rng, floor, dungeonDef) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.type = type;
    this.rng = rng;
    this.floor = floor;
    this.def = dungeonDef;
    this.centerX = x + Math.floor(w / 2);
    this.centerY = y + Math.floor(h / 2);
    this.cleared = false;
  }

  carve(tiles, mapW) {
    for (let ry = this.y; ry < this.y + this.h; ry++) {
      for (let rx = this.x; rx < this.x + this.w; rx++) {
        tiles[ry * mapW + rx] = 0;
      }
    }

    if (this.type === 'treasure') {
      const cx = this.x + Math.floor(this.w / 2);
      const cy = this.y + Math.floor(this.h / 2);
      tiles[cy * mapW + cx] = 3;
    }

    if (this.type === 'boss') {
      const cx = this.x + Math.floor(this.w / 2);
      const cy = this.y + Math.floor(this.h / 2);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          tiles[(cy + dy) * mapW + (cx + dx)] = 2;
        }
      }
    }
  }
}
