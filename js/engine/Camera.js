import { lerp } from '../utils/math.js';

export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.targetY = 0;
  }

  follow(pos, viewW, viewH) {
    this.targetX = pos.x - viewW / 2;
    this.targetY = pos.y - viewH / 2;
    this.x = lerp(this.x, this.targetX, 0.1);
    this.y = lerp(this.y, this.targetY, 0.1);
  }

  snap(pos, viewW, viewH) {
    this.x = pos.x - viewW / 2;
    this.y = pos.y - viewH / 2;
  }
}
