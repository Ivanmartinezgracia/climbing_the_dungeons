export class Lighting {
  constructor(width, height) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d');
    this.radius = 100;
  }

  update(player, dungeon, camera) {
  }

  draw(ctx) {
    ctx.drawImage(this.canvas, 0, 0);
  }
}
