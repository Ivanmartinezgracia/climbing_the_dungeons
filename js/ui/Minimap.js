import { TILE_SIZE } from '../utils/constants.js';

export class Minimap {
  constructor(game, size = 120) {
    this.game = game;
    this.size = size;
    this.element = null;
  }

  show() {
    this.hide();
    const el = document.createElement('canvas');
    el.className = 'minimap';
    el.width = this.size;
    el.height = this.size;
    el.style.width = `${this.size}px`;
    el.style.height = `${this.size}px`;
    document.getElementById('ui-overlay').appendChild(el);
    this.element = el;
  }

  hide() {
    this.element?.remove();
    this.element = null;
  }

  update() {
    if (!this.element || !this.game.dungeon || !this.game.player) return;
    const ctx = this.element.getContext('2d');
    const size = this.size;
    const dungeon = this.game.dungeon;
    const player = this.game.player;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, size, size);

    const scale = Math.min(size / dungeon.width, size / dungeon.height) * 0.5;
    const ox = (size - dungeon.width * scale) / 2;
    const oy = (size - dungeon.height * scale) / 2;

    for (let y = 0; y < dungeon.height; y++) {
      for (let x = 0; x < dungeon.width; x++) {
        const tile = dungeon.tiles[y * dungeon.width + x];
        if (tile === 1) continue;
        ctx.fillStyle = tile === 0 ? '#444' : tile === 2 ? '#a62' : '#554';
        ctx.fillRect(ox + x * scale, oy + y * scale, Math.max(1, scale), Math.max(1, scale));
      }
    }

    for (const room of dungeon.rooms) {
      ctx.strokeStyle = room.type === 'boss' ? '#f44' : room.type === 'treasure' ? '#fd0' : '#888';
      ctx.lineWidth = 1;
      ctx.strokeRect(ox + room.x * scale, oy + room.y * scale, room.w * scale, room.h * scale);
      if (room.locked) {
        ctx.fillStyle = 'rgba(255,80,80,0.25)';
        ctx.fillRect(ox + room.x * scale, oy + room.y * scale, room.w * scale, room.h * scale);
      } else if (room.cleared) {
        ctx.fillStyle = 'rgba(100,255,100,0.2)';
        ctx.fillRect(ox + room.x * scale, oy + room.y * scale, room.w * scale, room.h * scale);
      }
    }

    const px = ox + (player.pos.x / 16) * scale;
    const py = oy + (player.pos.y / 16) * scale;
    ctx.fillStyle = '#fd0';
    ctx.beginPath();
    ctx.arc(px, py, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}
