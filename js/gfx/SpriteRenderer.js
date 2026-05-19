export class SpriteRenderer {
  constructor() {
    this.playerColors = {
      adventurer: { body: '#c8a060', pants: '#4a6a3a', skin: '#e8c8a0', hair: '#6a4a2a', boots: '#3a2a1a', eye: '#444' },
      knight: { body: '#6080c0', pants: '#3a4a6a', skin: '#e8c8a0', hair: '#8a6a3a', boots: '#4a3a2a', eye: '#444' },
      ninja: { body: '#c8a060', pants: '#4a3a2a', skin: '#e8c8a0', hair: '#2a1a0a', boots: '#3a2a1a', eye: '#444' },
      mage: { body: '#8040c0', pants: '#4a2a6a', skin: '#e8c8a0', hair: '#6a3a8a', boots: '#3a1a4a', eye: '#a6f' },
      ranger: { body: '#40a060', pants: '#2a5a3a', skin: '#e8c8a0', hair: '#5a4a2a', boots: '#2a3a1a', eye: '#444' },
    };
  }

  drawPlayer(ctx, sx, sy, player) {
    const colors = this.playerColors[player.characterId] ?? this.playerColors.adventurer;
    const walkOffset = player.walkFrame === 1 || player.walkFrame === 3 ? 1 : 0;
    const legSwing = player.walkFrame === 0 || player.walkFrame === 2 ? 0 : 1;
    const dir = player.facingDir ?? 'right';
    const cx = sx + 8;
    const cy = sy + 8;

    ctx.save();
    ctx.translate(cx, cy);
    if (dir === 'left') ctx.scale(-1, 1);

    const legs = ctx.createLinearGradient(-4, 2, 4, 6);
    legs.addColorStop(0, colors.pants);
    legs.addColorStop(1, this.#darken(colors.pants, 0.8));
    ctx.fillStyle = legs;
    ctx.beginPath();
    ctx.roundRect(-4, 2, 8, 5, 2);
    ctx.fill();

    ctx.fillStyle = colors.boots;
    ctx.beginPath();
    ctx.roundRect(-5, 5 + legSwing, 4, 3, 1.5);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(1, 5 - legSwing, 4, 3, 1.5);
    ctx.fill();

    const bodyGrad = ctx.createLinearGradient(-5, -5, 5, 3);
    bodyGrad.addColorStop(0, this.#lighten(colors.body, 1.2));
    bodyGrad.addColorStop(1, colors.body);
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.roundRect(-5, -3 + walkOffset, 10, 6, 3);
    ctx.fill();

    ctx.fillStyle = this.#darken(colors.skin, 0.9);
    ctx.beginPath();
    ctx.roundRect(-3, -4 + walkOffset, 2, 3, 1);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(1, -4 + walkOffset, 2, 3, 1);
    ctx.fill();

    const headGrad = ctx.createRadialGradient(-1, -10 + walkOffset, 1, 0, -8 + walkOffset, 5);
    headGrad.addColorStop(0, this.#lighten(colors.skin, 1.3));
    headGrad.addColorStop(1, colors.skin);
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(0, -7 + walkOffset, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.hair;
    switch (player.characterId) {
      case 'knight':
        ctx.fillStyle = this.#darken(colors.hair, 0.7);
        ctx.beginPath();
        ctx.roundRect(-5, -14 + walkOffset, 10, 4, 2);
        ctx.fill();
        ctx.fillStyle = '#aab';
        ctx.beginPath();
        ctx.roundRect(-6, -12 + walkOffset, 12, 5, 3);
        ctx.fill();
        ctx.fillStyle = '#ccd';
        ctx.beginPath();
        ctx.roundRect(-5, -11 + walkOffset, 10, 3, 1);
        ctx.fill();
        ctx.fillStyle = '#446';
        ctx.beginPath();
        ctx.roundRect(-7, -11 + walkOffset, 2, 3, 0.5);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(5, -11 + walkOffset, 2, 3, 0.5);
        ctx.fill();
        ctx.fillStyle = '#668';
        ctx.beginPath();
        ctx.roundRect(-5, -10 + walkOffset, 10, 1, 0.5);
        ctx.fill();
        ctx.fillStyle = colors.body;
        ctx.beginPath();
        ctx.roundRect(-4, -11 + walkOffset, 2, 3, 1);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(2, -11 + walkOffset, 2, 3, 1);
        ctx.fill();
        break;
      case 'ninja':
        ctx.fillStyle = '#c8a060';
        ctx.fillRect(sx + 6, sy + 6, 8, 6);
        ctx.fillRect(sx + 8, sy + 12, 4, 2);
        ctx.fillStyle = '#4a3a2a';
        ctx.fillRect(sx + 7, sy + 14, 6, 2);
        ctx.fillStyle = '#e8c8a0';
        ctx.fillRect(sx + 9, sy + 2, 2, 2);
        ctx.fillStyle = '#2a1a0a';
        ctx.fillRect(sx + 7, sy, 6, 2);
        ctx.fillRect(sx + 8, sy + 2, 4, 1);
        ctx.fillStyle = '#444';
        ctx.fillRect(sx + 9, sy + 2, 2, 1);
        break;
      case 'mage':
        ctx.beginPath();
        ctx.roundRect(-5, -14 + walkOffset, 10, 5, 2);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(-6, -13 + walkOffset, 12, 3, 1.5);
        ctx.fill();
        ctx.fillStyle = this.#lighten(colors.hair, 1.5);
        ctx.beginPath();
        ctx.arc(0, -14 + walkOffset, 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      default:
        ctx.beginPath();
        ctx.roundRect(-5, -13 + walkOffset, 10, 4, 2);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(-4, -14 + walkOffset, 8, 3, 1.5);
        ctx.fill();
    }

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-2, -7 + walkOffset, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(2, -7 + walkOffset, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.eye;
    ctx.beginPath();
    ctx.arc(-2, -7 + walkOffset, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(2, -7 + walkOffset, 0.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(player.shootFacing);
    if (player.currentWeapon) {
      this.drawWeapon(ctx, player.currentWeapon.id);
    }
    if (player.meleeActive && player.knifeTimer >= 5) {
      ctx.strokeStyle = '#ccc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(8, 0, 22, -Math.PI * 0.35, Math.PI * 0.35);
      ctx.stroke();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(8, 0, 20, -Math.PI * 0.3, Math.PI * 0.3);
      ctx.stroke();
    }
    ctx.restore();

    if (player.currentWeapon?.isReloading) {
      const w = player.currentWeapon;
      const pct = 1 - w.reloadTimer / w.reloadTime;
      const barW = 14;
      const barH = 2;
      const barX = cx - barW / 2;
      const barY = cy + 8;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW, barH, 1);
      ctx.fill();
      ctx.fillStyle = '#f80';
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW * pct, barH, 1);
      ctx.fill();
    }
  }

  drawWeapon(ctx, weaponId) {
    const wp = this.#weaponShape(weaponId);
    ctx.strokeStyle = wp.color;
    ctx.lineWidth = wp.width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(wp.x1, wp.y1);
    ctx.lineTo(wp.x2, wp.y2);
    ctx.stroke();

    if (wp.grip) {
      ctx.fillStyle = this.#darken(wp.color, 0.7);
      ctx.beginPath();
      ctx.arc(wp.grip[0], wp.grip[1], wp.grip[2], 0, Math.PI * 2);
      ctx.fill();
    }
    if (wp.muzzle) {
      ctx.fillStyle = wp.muzzleColor ?? '#ffa';
      ctx.beginPath();
      ctx.arc(wp.muzzle[0], wp.muzzle[1], wp.muzzle[2], 0, Math.PI * 2);
      ctx.fill();
    }
  }

  #weaponShape(id) {
    switch (id) {
      case 'pistol': return { x1: 5, y1: 0, x2: 12, y2: 0, color: '#777', width: 2.5, grip: [5, -2, 1.5] };
      case 'revolver': return { x1: 5, y1: 0, x2: 13, y2: 0, color: '#666', width: 3, grip: [5, -3, 2], muzzle: [13, 0, 1.2, '#ff8'] };
      case 'smg': return { x1: 5, y1: 0, x2: 14, y2: 0, color: '#666', width: 2.5, grip: [6, -3, 1.5], muzzle: [14, 0, 1.5, '#ff8'] };
      case 'rifle': return { x1: 5, y1: 0, x2: 16, y2: 0, color: '#5a4a3a', width: 2.5, grip: [5, -3, 1.5], muzzle: [16, 0, 1.5, '#ffa'] };
      case 'wand': return { x1: 5, y1: 0, x2: 14, y2: 0, color: '#a060c0', width: 3, muzzle: [14, 0, 2.5, '#d08ff0'] };
      case 'shotgun': return { x1: 4, y1: 0, x2: 14, y2: 0, color: '#777', width: 3.5, grip: [4, -3, 2], muzzle: [14, 0, 2.5, '#ff8'] };
      case 'crossbow': return { x1: 5, y1: 0, x2: 15, y2: 0, color: '#6a4a2a', width: 3, grip: [5, -2, 1.5], muzzle: [15, 0, 0.8, '#ca8'] };
      case 'sniper': return { x1: 5, y1: 0, x2: 18, y2: 0, color: '#2a3a2a', width: 2.5, grip: [6, -3, 1.5], muzzle: [18, 0, 1.5, '#fff'] };
      case 'uzi': return { x1: 5, y1: 0, x2: 11, y2: 0, color: '#555', width: 2, grip: [4, -2, 1.2], muzzle: [11, 0, 2, '#ff8'] };
      case 'rpg': return { x1: 5, y1: 0, x2: 15, y2: 0, color: '#6a6a3a', width: 3.5, grip: [5, -3, 2], muzzle: [15, 0, 2.5, '#f84'] };
      case 'minigun': return { x1: 4, y1: 0, x2: 13, y2: 0, color: '#555', width: 3.5, grip: [4, -3, 2], muzzle: [13, 0, 2.5, '#ff4'] };
      case 'raygun': return { x1: 4, y1: 0, x2: 14, y2: 0, color: '#4a8aba', width: 3, grip: [4, -2, 1.5], muzzle: [14, 0, 3, '#4af'] };
      case 'grenade_launcher': return { x1: 4, y1: 0, x2: 13, y2: 0, color: '#5a5a3a', width: 3.5, grip: [4, -3, 2], muzzle: [13, 0, 2, '#fa4'] };
      default: return { x1: 5, y1: 0, x2: 10, y2: 0, color: '#888', width: 2 };
    }
  }

  #expandHex(hex) {
    if (hex && hex.length === 4) {
      return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
    }
    return hex;
  }

  #lighten(hex, f) {
    hex = this.#expandHex(hex);
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.min(255, Math.floor(r * f))},${Math.min(255, Math.floor(g * f))},${Math.min(255, Math.floor(b * f))})`;
  }

  #darken(hex, f) {
    hex = this.#expandHex(hex);
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.floor(r * f)},${Math.floor(g * f)},${Math.floor(b * f)})`;
  }
}
