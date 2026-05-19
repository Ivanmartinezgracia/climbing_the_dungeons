import { Vec2 } from '../utils/math.js';

export class Enemy {
  constructor(x, y, config, room) {
    this.pos = new Vec2(x, y);
    this.room = room;
    this.spawnX = x;
    this.spawnY = y;
    this._wanderTarget = null;
    this._wanderTimer = Math.floor(Math.random() * 120) + 60;
    this.size = config.size ?? 12;
    this.maxHP = config.hp ?? 3;
    this.hp = this.maxHP;
    this.speed = config.speed ?? 0.5;
    this.baseSpeed = this.speed;
    this.damage = config.damage ?? 1;
    this.baseDamage = this.damage;
    this.xpDrop = config.xp ?? 5;
    this.coinDrop = config.coins ?? 1;
    this.color = config.color ?? '#f44';
    this.dead = false;
    this.deathTimer = 0;
    this.invincibleTimer = 0;
    this.type = config.type ?? 'basic';
    this.enemyType = config.enemyType ?? 'melee';
    this.name = config.name ?? 'Enemigo';

    this.vel = new Vec2(0, 0);
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    this.knockbackTimer = 0;
    this.state = 'idle';
    this.hasSpottedPlayer = false;
    this.detectionRange = config.detectionRange ?? 100;
    this.chaseRange = config.chaseRange ?? (this.detectionRange * 3);
    this.attackRange = config.attackRange ?? 20;
    this.attackCooldown = 0;
    this.wantsToShoot = false;
    this.facing = 0;
    this.facingDir = 'right';
    this.walkFrame = 0;
    this.walkTimer = 0;
    this.bodyColor = this.#darken(this.color, 0.6);
    this.eyeColor = this.#getEyeColor(this.color);
    this.subtype = this.size > 14 ? 'tank' : this.size < 11 ? 'fast' : 'basic';
    this._cacheGradient = null;
    this._losFrame = 0;
    this._losResult = true;
    this._pushFrame = 0;
    this._wanderDirChange = 0;
    this.alertTimer = 0;

    this.isElite = config.isElite ?? false;
    this.auraRange = config.auraRange ?? 80;
    this.auraDamageMult = config.auraDamageMult ?? 1.5;
    this.auraSpeedMult = config.auraSpeedMult ?? 1.3;
    this._buffDamage = 1;
    this._buffSpeed = 1;
    this._slowMult = 1;
    this._burnTimer = 0;
    this._burnDamage = 0;
  }

  #expandHex(hex) {
    if (hex.length === 4) return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
    return hex;
  }

  #darken(hex, factor) {
    hex = this.#expandHex(hex);
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.floor(r * factor)},${Math.floor(g * factor)},${Math.floor(b * factor)})`;
  }

  #getEyeColor(hex) {
    hex = this.#expandHex(hex);
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 100 ? '#222' : '#f44';
  }

  takeDamage(amount) {
    if (this.dead) return;
    this.hp -= amount;
    if (this.invincibleTimer <= 0) this.invincibleTimer = 10;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      this.deathTimer = 30;
    }
  }

  #hasLineOfSight(dungeon, targetX, targetY) {
    if (!dungeon) return true;
    const steps = Math.max(Math.abs(targetX - this.pos.x), Math.abs(targetY - this.pos.y)) / 8;
    const count = Math.ceil(steps);
    for (let i = 0; i <= count; i++) {
      const t = count > 0 ? i / count : 0;
      const x = this.pos.x + (targetX - this.pos.x) * t;
      const y = this.pos.y + (targetY - this.pos.y) * t;
      if (dungeon.isSolid(x, y, 2)) return false;
    }
    return true;
  }

  #pushFromOtherEnemies(enemies) {
    if (!enemies) return;
    for (const other of enemies) {
      if (other === this || other.dead) continue;
      const dx = this.pos.x - other.pos.x;
      const dy = this.pos.y - other.pos.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      const minDist = this.size + other.size;
      if (d < minDist && d > 0) {
        const push = (minDist - d) * 0.3;
        this.pos.x += (dx / d) * push;
        this.pos.y += (dy / d) * push;
      }
    }
  }

  #wander(dungeon) {
    this._wanderTimer--;
    if (this._wanderTimer <= 0 || !this._wanderTarget) {
      this._wanderTimer = Math.floor(Math.random() * 180) + 60;
      const margin = 32;
      let minX, maxX, minY, maxY;
      if (this.room) {
        minX = this.room.x * 16 + margin;
        maxX = (this.room.x + this.room.w) * 16 - margin;
        minY = this.room.y * 16 + margin;
        maxY = (this.room.y + this.room.h) * 16 - margin;
      } else {
        minX = this.spawnX - 64; maxX = this.spawnX + 64;
        minY = this.spawnY - 64; maxY = this.spawnY + 64;
      }
      this._wanderTarget = {
        x: minX + Math.random() * (maxX - minX),
        y: minY + Math.random() * (maxY - minY),
      };
    }
    const dx = this._wanderTarget.x - this.pos.x;
    const dy = this._wanderTarget.y - this.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 8) { this._wanderTarget = null; return; }
    const wanderSpeed = this.speed * 0.35;
    let newX = this.pos.x + (dx / dist) * wanderSpeed;
    let newY = this.pos.y + (dy / dist) * wanderSpeed;
    if (!dungeon?.isSolid(newX, this.pos.y, this.size)) this.pos.x = newX;
    if (!dungeon?.isSolid(this.pos.x, newY, this.size)) this.pos.y = newY;
    this.facing = Math.atan2(dy, dx);
    this.facingDir = dx < 0 ? 'left' : 'right';
    this.walkTimer += 0.05;
    if (this.walkTimer > 0.3) { this.walkTimer = 0; this.walkFrame = (this.walkFrame + 1) % 4; }
  }

  update(player, dungeon, stealthActive, enemies) {
    if (this.dead) {
      if (this.deathTimer > 0) this.deathTimer--;
      return;
    }

    if (this.invincibleTimer > 0) this.invincibleTimer--;
    if (this.attackCooldown > 0) this.attackCooldown--;

    if (this._burnTimer > 0) {
      this._burnTimer--;
      this.hp -= this._burnDamage ?? 0;
      if (this.hp <= 0) { this.hp = 0; this.dead = true; this.deathTimer = 30; }
    }

    this._buffDamage = 1;
    this._buffSpeed = 1;
    if (enemies && !this.isElite) {
      for (const other of enemies) {
        if (other === this || other.dead || !other.isElite) continue;
        const d = Math.sqrt((other.pos.x - this.pos.x) ** 2 + (other.pos.y - this.pos.y) ** 2);
        if (d < other.auraRange) {
          this._buffDamage = other.auraDamageMult;
          this._buffSpeed = other.auraSpeedMult;
          break;
        }
      }
    }

    if (this.knockbackTimer > 0) {
      this.knockbackTimer--;
      const kbx = this.knockbackVx;
      const kby = this.knockbackVy;
      if (!dungeon?.isSolid(this.pos.x + kbx, this.pos.y, this.size)) this.pos.x += kbx;
      if (!dungeon?.isSolid(this.pos.x, this.pos.y + kby, this.size)) this.pos.y += kby;
      this.knockbackVx *= 0.7;
      this.knockbackVy *= 0.7;
    }

    if (dungeon?.isSolid(this.pos.x, this.pos.y, this.size)) {
      for (let attempt = 0; attempt < 8; attempt++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 2 + attempt * 2;
        const nx = this.pos.x + Math.cos(angle) * dist;
        const ny = this.pos.y + Math.sin(angle) * dist;
        if (!dungeon.isSolid(nx, ny, this.size)) {
          this.pos.x = nx;
          this.pos.y = ny;
          break;
        }
      }
    }

    if (this.alertTimer > 0) this.alertTimer--;
    const effectiveRange = this.alertTimer > 0 ? 99999 : (stealthActive ? this.detectionRange * 0.5 : this.detectionRange);
    const dx = player.pos.x - this.pos.x;
    const dy = player.pos.y - this.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (this._losFrame % 3 === 0) {
      this._losResult = this.#hasLineOfSight(dungeon, player.pos.x, player.pos.y);
    }
    this._losFrame++;
    const canSee = this._losResult;

    this.wantsToShoot = false;

    const canSpot = dist < effectiveRange && canSee;
    const isChasing = this.hasSpottedPlayer && dist < this.chaseRange;

    if (canSpot) {
      this.hasSpottedPlayer = true;
    }

    const effSpeed = this.speed * this._buffSpeed * this._slowMult;
    const effDamage = Math.round(this.damage * this._buffDamage);

    if (canSpot || isChasing) {
      this.state = 'chase';
      const rawAngle = Math.atan2(dy, dx);
      this.facing = rawAngle;
      const a = ((rawAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const dirs = ['right', 'down', 'left', 'up'];
      this.facingDir = dirs[Math.floor(a / (Math.PI / 2) + 0.5) % 4];

      let moveX = dx / dist;
      let moveY = dy / dist;

      if (this.enemyType === 'ranged') {
        const preferredDist = this.attackRange * 0.6;
        if (dist < preferredDist) {
          moveX = -(dx / dist);
          moveY = -(dy / dist);
        }
        this._wanderDirChange++;
        const strafeChance = this._wanderDirChange > 20 ? 0.15 : 0.05;
        if (Math.random() < strafeChance) {
          this._wanderDirChange = 0;
          const angle = (Math.random() - 0.5) * Math.PI * 0.8;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          const sx = moveX * cos - moveY * sin;
          const sy = moveX * sin + moveY * cos;
          moveX = sx;
          moveY = sy;
        }
      }

      let newX = this.pos.x + moveX * effSpeed;
      let newY = this.pos.y + moveY * effSpeed;

      if (this.room && this.room.locked) {
        const margin = 8;
        newX = Math.max((this.room.x + 1) * 16 - margin, Math.min((this.room.x + this.room.w - 1) * 16 + margin, newX));
        newY = Math.max((this.room.y + 1) * 16 - margin, Math.min((this.room.y + this.room.h - 1) * 16 + margin, newY));
      }

      if (!dungeon?.isSolid(newX, this.pos.y, this.size)) {
        this.pos.x = newX;
      }
      if (!dungeon?.isSolid(this.pos.x, newY, this.size)) {
        this.pos.y = newY;
      }

      if (this._pushFrame++ % 2 === 0) this.#pushFromOtherEnemies(enemies);

      this.walkTimer += 0.1;
      if (this.walkTimer > 0.3) {
        this.walkTimer = 0;
        this.walkFrame = (this.walkFrame + 1) % 4;
      }

      if (this.enemyType === 'ranged' && dist < this.attackRange && this.attackCooldown <= 0) {
        this.wantsToShoot = true;
        this.attackCooldown = 80;
      } else if (this.enemyType !== 'ranged' && dist < this.attackRange && this.attackCooldown <= 0) {
        this.attack(player, effDamage);
        this.attackCooldown = 35;
      }
    } else {
      this.state = 'idle';
      this.hasSpottedPlayer = false;
      this.#wander(dungeon);
    }
  }

  attack(player, damageOverride) {
    const dmg = damageOverride ?? this.damage;
    const reflected = player.takeDamage(dmg);
    if (reflected > 0) {
      this.takeDamage(reflected);
    }
  }

  draw(ctx, sx, sy, spriteRenderer) {
    ctx.save();
    if (this.dead) {
      ctx.globalAlpha = this.deathTimer / 30;
    }

    const size = this.size;
    const half = size / 2;

    if (this.isElite && !this.dead) {
      ctx.strokeStyle = '#fd0';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.3 + Math.sin(performance.now() / 200) * 0.15;
      ctx.beginPath();
      ctx.arc(sx + 8, sy + 8, half + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = this.bodyColor;
    ctx.fillRect(sx + 8 - half, sy + 8 - half, size, size);

    ctx.fillStyle = this.isElite ? '#fd0' : this.color;
    ctx.fillRect(sx + 8 - half + 2, sy + 8 - half + 1, size - 4, size - 3);

    ctx.fillStyle = this.eyeColor;
    const eyeX = this.facingDir === 'left' ? sx + 5 : sx + 10;
    ctx.fillRect(eyeX, sy + 6, 2, 2);

    if (this.type === 'boss' || this.subtype === 'tank') {
      ctx.fillRect(eyeX, sy + 10, 2, 2);
    }

    if (this.isElite && !this.dead) {
      ctx.fillStyle = '#fd0';
      ctx.font = '6px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('✦', sx + 8, sy - 4);
    }

    if (this.hp < this.maxHP && !this.dead) {
      ctx.fillStyle = '#400';
      ctx.fillRect(sx, sy - 3, 16, 2);
      ctx.fillStyle = this.isElite ? '#fd0' : '#f44';
      ctx.fillRect(sx, sy - 3, 16 * (this.hp / this.maxHP), 2);
    }

    ctx.restore();
  }
}
