import { CANVAS_WIDTH, CANVAS_HEIGHT, WEAPONS } from '../utils/constants.js';

export class Renderer {
  constructor(ctx) {
    this.ctx = ctx;
  }

  clear(ctx) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  renderDungeon(ctx, dungeon, camera, spriteRenderer) {
    if (!dungeon || !dungeon.tiles) return;

    const startX = Math.max(0, Math.floor(camera.x / 16));
    const startY = Math.max(0, Math.floor(camera.y / 16));
    const endX = Math.min(dungeon.width, Math.ceil((camera.x + CANVAS_WIDTH) / 16) + 1);
    const endY = Math.min(dungeon.height, Math.ceil((camera.y + CANVAS_HEIGHT) / 16) + 1);

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const tile = dungeon.tiles[y * dungeon.width + x];
        if (tile === undefined) continue;

        const sx = Math.floor(x * 16 - camera.x);
        const sy = Math.floor(y * 16 - camera.y);

        if (tile === 0) {
          ctx.fillStyle = dungeon.floorColor ?? '#3a3a3a';
          ctx.fillRect(sx, sy, 16, 16);
        } else if (tile === 1) {
          ctx.fillStyle = dungeon.wallColor ?? '#2a2a2a';
          ctx.fillRect(sx, sy, 16, 16);
        } else if (tile === 2) {
          ctx.fillStyle = '#5a4a3a';
          ctx.fillRect(sx, sy, 16, 16);
          ctx.fillStyle = '#6a4a2a';
          ctx.fillRect(sx + 4, sy + 1, 8, 14);
          ctx.fillStyle = '#8a6a3a';
          ctx.fillRect(sx + 5, sy + 2, 6, 12);
        } else if (tile === 3) {
          ctx.fillStyle = '#5a3a2a';
          ctx.fillRect(sx, sy, 16, 16);
          ctx.fillStyle = '#f0c040';
          ctx.fillRect(sx + 5, sy + 5, 6, 6);
        }
      }
    }
  }

  renderEntities(ctx, camera, enemies, player, bullet, items, spriteRenderer) {
    ctx.save();

    if (player) {
      const sx = Math.floor(player.pos.x - camera.x - 8);
      const sy = Math.floor(player.pos.y - camera.y - 8);
      spriteRenderer.drawPlayer(ctx, sx, sy, player);
    }

    if (enemies) {
      for (const e of enemies) {
        const ex = Math.floor(e.pos.x - camera.x - 8);
        const ey = Math.floor(e.pos.y - camera.y - 8);
        e.draw(ctx, ex, ey, spriteRenderer);
      }
    }

    if (items) {
      for (const item of items) {
        const ix = Math.floor(item.pos.x - camera.x - 8);
        const iy = Math.floor(item.pos.y - camera.y - 16);
        if (item.type === 'exit') {
          ctx.fillStyle = '#1a3a5a';
          ctx.beginPath();
          ctx.roundRect(ix, iy + 4, 16, 28, 3);
          ctx.fill();
          ctx.fillStyle = '#2a5a8a';
          ctx.beginPath();
          ctx.roundRect(ix + 2, iy + 6, 12, 24, 2);
          ctx.fill();
          ctx.fillStyle = '#4a8aba';
          ctx.beginPath();
          ctx.roundRect(ix + 4, iy + 10, 4, 16, 1);
          ctx.fill();
          ctx.fillStyle = '#6abaea';
          ctx.beginPath();
          ctx.arc(ix + 12, iy + 18, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.font = '6px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('▼', ix + 8, iy + 28);
          continue;
        }
        const ix2 = Math.floor(item.pos.x - camera.x - 4);
        const iy2 = Math.floor(item.pos.y - camera.y - 4);
        if (item.type === 'health') {
          ctx.fillStyle = '#4f4';
          ctx.beginPath();
          ctx.roundRect(ix2 + 2, iy2, 4, 8, 1);
          ctx.fill();
          ctx.beginPath();
          ctx.roundRect(ix2, iy2 + 2, 8, 4, 1);
          ctx.fill();
        } else if (item.type === 'weapon') {
          const wpDef = WEAPONS[item.weaponId];
          ctx.fillStyle = '#8a4a1a';
          ctx.beginPath();
          ctx.roundRect(ix2, iy2, 8, 8, 2);
          ctx.fill();
          ctx.fillStyle = '#c08020';
          ctx.beginPath();
          ctx.roundRect(ix2 + 1, iy2 + 1, 6, 6, 1.5);
          ctx.fill();
          ctx.fillStyle = '#fd0';
          ctx.font = '7px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(wpDef?.icon ?? '?', ix2 + 4, iy2 + 4);
        } else {
          ctx.fillStyle = '#f0c040';
          ctx.beginPath();
          ctx.arc(ix2 + 4, iy2 + 4, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.restore();
  }

  renderPets(ctx, camera, pets) {
    if (!pets) return;
    for (const pet of pets) {
      const px = Math.floor(pet.pos.x - camera.x - 8);
      const py = Math.floor(pet.pos.y - camera.y - 8);
      pet.draw(ctx, px, py);
    }
  }

  renderProjectiles(ctx, camera, projectiles, color) {
    if (!projectiles) return;
    for (const p of projectiles) {
      const px = Math.floor(p.x - camera.x);
      const py = Math.floor(p.y - camera.y);
      ctx.fillStyle = p.isCrit ? '#ff4444' : (color ?? '#ffd700');
      const s = (p.size ?? 4) * (p.isCrit ? 1.5 : 1);
      ctx.fillRect(px - s / 2, py - s / 2, s, s);
    }
  }

  renderParticles(ctx, camera, particles) {
    if (!particles) return;
    for (const p of particles.particles) {
      const px = Math.floor(p.x - camera.x);
      const py = Math.floor(p.y - camera.y);
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.fillRect(px - p.size / 2, py - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  renderLighting(ctx, lighting) {
    if (!lighting) return;
    lighting.draw(ctx);
  }

  renderEnemyBullets(ctx, camera, bullets) {
    if (!bullets) return;
    for (const b of bullets) {
      const bx = Math.floor(b.x - camera.x);
      const by = Math.floor(b.y - camera.y);
      ctx.fillStyle = b.color ?? '#f80';
      ctx.fillRect(bx - 2, by - 2, 4, 4);
    }
  }

  #expandHex(hex) {
    if (hex && hex.length === 4) {
      return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
    }
    return hex;
  }

  #lighten(hex, f) {
    if (!hex) return '#555';
    hex = this.#expandHex(hex);
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.min(255, Math.floor(r * f))},${Math.min(255, Math.floor(g * f))},${Math.min(255, Math.floor(b * f))})`;
  }

  #darken(hex, f) {
    if (!hex) return '#333';
    hex = this.#expandHex(hex);
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.floor(r * f)},${Math.floor(g * f)},${Math.floor(b * f)})`;
  }
}
