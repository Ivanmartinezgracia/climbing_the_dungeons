import { Vec2 } from '../utils/math.js';
import { PET_TEMPLATES } from '../utils/constants.js';

export class Pet {
  constructor(templateId) {
    const def = PET_TEMPLATES[templateId];
    if (!def) throw new Error(`Unknown pet: ${templateId}`);

    this.id = templateId;
    this.name = def.name;
    this.icon = def.icon;
    this.pos = new Vec2(0, 0);
    this.size = def.size ?? 10;

    this.baseMaxHP = def.hp;
    this.baseDamage = def.damage;
    this.baseSpeed = def.speed;

    this.level = 1;
    this.xp = 0;
    this.xpToNext = 8;

    this.maxHP = this.baseMaxHP;
    this.hp = this.maxHP;
    this.damage = this.baseDamage;
    this.speed = this.baseSpeed;

    this.attackRange = def.attackRange ?? 30;
    this.attackCooldown = 0;
    this.attackRate = def.attackRate ?? 30;
    this.petType = def.petType ?? 'melee';
    this.respawnTime = def.respawnTime ?? 480;
    this.followRadius = def.followRadius ?? 80;

    this.dead = false;
    this.deathTimer = 0;
    this.respawnTimer = 0;

    this.color = def.color ?? '#fff';
    this.bodyColor = this.#darken(this.color, 0.6);

    this.facing = 0;
    this.facingDir = 'right';
    this.walkFrame = 0;
    this.walkTimer = 0;

    this.invincibleTimer = 0;
    this._meleeCD = 0;
    this.target = null;
    this.vel = new Vec2(0, 0);
    this._upgDamage = 0;
    this._upgHP = 0;
    this._upgSpeedMult = 1;
    this._upgAtkMult = 1;
    this._upgRespawnMult = 1;
    this._synergyDamage = 0;
    this._synergyHP = 0;
    this._synergyAtkSpdMult = 1;
    this._synergyRespawnMult = 1;
    this._synergySpeedMult = 1;
    this._synergyFirstHitBonus = 0;
    this._synergyBurn = 0;
    this._synergyAtkRangeMult = 1;
    this._firstHit = true;
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

  get effectiveMaxHP() {
    return this.maxHP + this._upgHP + this._synergyHP;
  }

  get effectiveDamage() {
    return this.damage + this._upgDamage + this._synergyDamage;
  }

  get effectiveSpeed() {
    return this.speed * this._upgSpeedMult * this._synergySpeedMult;
  }

  get effectiveAttackRate() {
    return Math.max(5, Math.round(this.attackRate * this._upgAtkMult * this._synergyAtkSpdMult));
  }

  get effectiveRespawnTime() {
    return Math.round(this.respawnTime * this._upgRespawnMult * this._synergyRespawnMult);
  }

  takeDamage(amount) {
    if (this.dead) return;
    if (this.invincibleTimer > 0) return;
    this.hp -= amount;
    this.invincibleTimer = 10;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      this.deathTimer = 20;
      this.respawnTimer = this.effectiveRespawnTime;
    }
  }

  addXP(amount) {
    if (this.dead) return;
    this.xp += amount;
    while (this.xp >= this.xpToNext) {
      this.levelUp();
    }
  }

  levelUp() {
    this.level++;
    this.xp -= this.xpToNext;
    this.xpToNext = Math.floor(this.xpToNext * 1.5);
    this.maxHP = this.baseMaxHP + this.level;
    this.hp = this.effectiveMaxHP;
    this.damage = this.baseDamage + Math.floor((this.level - 1) * 0.5);
    this.speed = this.baseSpeed + (this.level - 1) * 0.05;
  }

  update(player, dungeon, enemies, aggroTarget) {
    if (this.dead) {
      if (this.deathTimer > 0) this.deathTimer--;
      if (this.respawnTimer > 0) this.respawnTimer--;
      if (this.respawnTimer <= 0) {
        this.dead = false;
        this.hp = this.effectiveMaxHP;
        this.invincibleTimer = 30;
      }
      return;
    }

    if (this.invincibleTimer > 0) this.invincibleTimer--;
    if (this.attackCooldown > 0) this.attackCooldown--;
    if (this._meleeCD > 0) this._meleeCD--;

    const dx = player.pos.x - this.pos.x;
    const dy = player.pos.y - this.pos.y;
    const distToPlayer = Math.sqrt(dx * dx + dy * dy);

    const playerRoom = dungeon?.getCurrentRoom(player.pos.x, player.pos.y);
    const petRoom = dungeon?.getCurrentRoom(this.pos.x, this.pos.y);
    const allowedRoom = playerRoom ?? petRoom;
    let oldTarget = this.target;
    let closestDist = Infinity;
    if (aggroTarget && !aggroTarget.dead && dungeon?.getCurrentRoom(aggroTarget.pos.x, aggroTarget.pos.y) === allowedRoom) {
      this.target = aggroTarget;
      closestDist = Math.sqrt(
        (aggroTarget.pos.x - this.pos.x) ** 2 +
        (aggroTarget.pos.y - this.pos.y) ** 2
      );
    } else {
      this.target = null;
      for (const e of enemies) {
        if (e.dead) continue;
        const enemyRoom = dungeon?.getCurrentRoom(e.pos.x, e.pos.y);
        if (enemyRoom !== allowedRoom) continue;
        const edx = e.pos.x - this.pos.x;
        const edy = e.pos.y - this.pos.y;
        const ed = Math.sqrt(edx * edx + edy * edy);
        if (ed < closestDist) {
          closestDist = ed;
          this.target = e;
        }
      }
    }
    if (this.target !== oldTarget) this._firstHit = true;

    const effAtkRange = this.attackRange * this._synergyAtkRangeMult;
    if (this.target && closestDist < effAtkRange && this.attackCooldown <= 0) {
      this.attackCooldown = this.effectiveAttackRate;
      let dmg = this.effectiveDamage;
      if (this._synergyFirstHitBonus > 0 && this._firstHit) {
        dmg += this._synergyFirstHitBonus;
        this._firstHit = false;
      }
      this.target.takeDamage(dmg);
      if (this._synergyBurn > 0 && !this.target.dead) {
        this.target._burnDamage = (this.target._burnDamage ?? 0) + this._synergyBurn;
        this.target._burnTimer = 60;
      }
      return;
    }

    let moveX = 0, moveY = 0;

    if (this.target) {
      const tdx = this.target.pos.x - this.pos.x;
      const tdy = this.target.pos.y - this.pos.y;
      const td = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
      if (td > effAtkRange) {
        moveX = tdx / td;
        moveY = tdy / td;
      }
    }

    if (distToPlayer > this.followRadius) {
      const pullX = dx / distToPlayer;
      const pullY = dy / distToPlayer;
      moveX += pullX * (this.target ? 0.4 : 1.0);
      moveY += pullY * (this.target ? 0.4 : 1.0);
    }

    if (dungeon?.isSolid(this.pos.x, this.pos.y, this.size)) {
      this.pos.x = player.pos.x + (Math.random() - 0.5) * 20;
      this.pos.y = player.pos.y + (Math.random() - 0.5) * 20;
    }

    const oldX = this.pos.x, oldY = this.pos.y;

    if (moveX !== 0 || moveY !== 0) {
      const len = Math.sqrt(moveX * moveX + moveY * moveY) || 1;
      moveX /= len;
      moveY /= len;

      const spd = this.effectiveSpeed > 3 ? this.effectiveSpeed : Math.min(this.effectiveSpeed, 3);
      let newX = this.pos.x + moveX * spd;
      let newY = this.pos.y + moveY * spd;

      if (!dungeon?.isSolid(newX, this.pos.y, this.size)) this.pos.x = newX;
      if (!dungeon?.isSolid(this.pos.x, newY, this.size)) this.pos.y = newY;

      const moved = (oldX !== this.pos.x || oldY !== this.pos.y);
      if (!moved) {
        this._stuckFrames = (this._stuckFrames || 0) + 1;
        if (this._stuckFrames > 8) {
          this.pos.x = player.pos.x + (Math.random() - 0.5) * 24;
          this.pos.y = player.pos.y + (Math.random() - 0.5) * 24;
          this._stuckFrames = 0;
        }
      } else {
        this._stuckFrames = 0;
      }

      this.facing = Math.atan2(moveY, moveX);
      this.facingDir = moveX < 0 ? 'left' : 'right';

      this.walkTimer += 0.1;
      if (this.walkTimer > 0.3) {
        this.walkTimer = 0;
        this.walkFrame = (this.walkFrame + 1) % 4;
      }
    } else {
      const atTargetRange = this.target && closestDist < effAtkRange;
      if (!atTargetRange && (this.target || distToPlayer > this.followRadius)) {
        this._stuckFrames = (this._stuckFrames || 0) + 1;
        if (this._stuckFrames > 8) {
          this.pos.x = player.pos.x + (Math.random() - 0.5) * 24;
          this.pos.y = player.pos.y + (Math.random() - 0.5) * 24;
          this._stuckFrames = 0;
        }
      } else {
        this._stuckFrames = 0;
      }
      this.walkFrame = 0;
    }
  }

  draw(ctx, sx, sy) {
    if (this.dead) {
      if (this.deathTimer > 0) {
        ctx.save();
        ctx.globalAlpha = this.deathTimer / 20;
        this.#drawShape(ctx, sx, sy);
        ctx.restore();
      }
      return;
    }

    this.#drawShape(ctx, sx, sy);

    if (this.hp < this.effectiveMaxHP) {
      ctx.fillStyle = '#400';
      ctx.fillRect(sx, sy - 3, 16, 2);
      ctx.fillStyle = '#4f4';
      ctx.fillRect(sx, sy - 3, 16 * (this.hp / this.effectiveMaxHP), 2);
    }
  }

  #drawShape(ctx, sx, sy) {
    const cx = sx + 8;
    const cy = sy + 8;
    ctx.save();
    ctx.translate(cx, cy);
    if (this.facingDir === 'left') ctx.scale(-1, 1);

    switch (this.id) {
      case 'dog':
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.roundRect(-5, -3, 10, 8, 2);
        ctx.fill();
        ctx.fillStyle = this.bodyColor;
        ctx.beginPath();
        ctx.roundRect(-3, -1, 6, 5, 1);
        ctx.fill();
        ctx.fillStyle = this.bodyColor;
        ctx.beginPath();
        ctx.moveTo(-4, -4);
        ctx.lineTo(-2, -9);
        ctx.lineTo(0, -4);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.lineTo(2, -9);
        ctx.lineTo(4, -4);
        ctx.fill();
        ctx.fillStyle = '#444';
        ctx.beginPath();
        ctx.arc(-2, 0, 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(2, 0, 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-1.5, -0.5, 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(2.5, -0.5, 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.roundRect(-3, 4, 2, 3, 1);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(1, 4, 2, 3, 1);
        ctx.fill();
        break;

      case 'cat':
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.roundRect(-4, -2, 8, 6, 2);
        ctx.fill();
        ctx.fillStyle = this.bodyColor;
        ctx.beginPath();
        ctx.roundRect(-2, 0, 4, 3, 1);
        ctx.fill();
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(-3, -3);
        ctx.lineTo(-1, -8);
        ctx.lineTo(0, -3);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, -3);
        ctx.lineTo(1, -8);
        ctx.lineTo(3, -3);
        ctx.fill();
        ctx.fillStyle = '#444';
        ctx.beginPath();
        ctx.arc(-1, 0, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(2, 0, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-0.5, -0.5, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(2.5, -0.5, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(4, -1);
        ctx.quadraticCurveTo(7, -3, 5, 1);
        ctx.stroke();
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.roundRect(-3, 4, 1.5, 2, 0.8);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(1.5, 4, 1.5, 2, 0.8);
        ctx.fill();
        break;

      case 'crow':
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = this.bodyColor;
        ctx.beginPath();
        ctx.ellipse(0, 1, 4, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8a6a3a';
        ctx.beginPath();
        ctx.moveTo(5, -1);
        ctx.lineTo(9, 0);
        ctx.lineTo(5, 1);
        ctx.fill();
        ctx.fillStyle = '#444';
        ctx.beginPath();
        ctx.arc(-2, -1, 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(2, -1, 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff0';
        ctx.beginPath();
        ctx.arc(-1.5, -1.2, 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(2.5, -1.2, 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(-4, 3);
        ctx.lineTo(-8, 8);
        ctx.lineTo(-2, 4);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(4, 3);
        ctx.lineTo(8, 8);
        ctx.lineTo(2, 4);
        ctx.fill();
        break;

      case 'wolf':
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.roundRect(-6, -4, 12, 10, 2);
        ctx.fill();
        ctx.fillStyle = this.bodyColor;
        ctx.beginPath();
        ctx.roundRect(-4, -1, 8, 6, 1);
        ctx.fill();
        ctx.fillStyle = this.bodyColor;
        ctx.beginPath();
        ctx.moveTo(-5, -5);
        ctx.lineTo(-3, -11);
        ctx.lineTo(-1, -5);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(1, -5);
        ctx.lineTo(3, -11);
        ctx.lineTo(5, -5);
        ctx.fill();
        ctx.fillStyle = '#f44';
        ctx.beginPath();
        ctx.arc(-2, -1, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(2, -1, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-2, -1, 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(2, -1, 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(-2, -1, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(2, -1, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f88';
        ctx.beginPath();
        ctx.arc(-1, 2, 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.roundRect(-4, 5, 2.5, 3, 1);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(1.5, 5, 2.5, 3, 1);
        ctx.fill();
        break;

      case 'dragon':
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.roundRect(-7, -5, 14, 12, 2);
        ctx.fill();
        ctx.fillStyle = this.bodyColor;
        ctx.beginPath();
        ctx.roundRect(-5, -2, 10, 8, 1);
        ctx.fill();
        ctx.fillStyle = '#a44';
        ctx.beginPath();
        ctx.moveTo(-6, -6);
        ctx.lineTo(-4, -12);
        ctx.lineTo(-2, -6);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(2, -6);
        ctx.lineTo(4, -12);
        ctx.lineTo(6, -6);
        ctx.fill();
        ctx.fillStyle = '#c66';
        ctx.beginPath();
        ctx.moveTo(-9, -3);
        ctx.lineTo(-7, -8);
        ctx.lineTo(-5, -4);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(5, -4);
        ctx.lineTo(7, -8);
        ctx.lineTo(9, -3);
        ctx.fill();
        ctx.fillStyle = '#ff4';
        ctx.beginPath();
        ctx.arc(-3, -1, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(3, -1, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f80';
        ctx.beginPath();
        ctx.arc(-3, -1, 0.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(3, -1, 0.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#444';
        ctx.beginPath();
        ctx.arc(-3, -1, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(3, -1, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f80';
        ctx.beginPath();
        ctx.arc(0, 4, 1.5, 0, Math.PI);
        ctx.fill();
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.roundRect(-5, 6, 3, 3, 1);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(2, 6, 3, 3, 1);
        ctx.fill();
        break;

      case 'fox':
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.roundRect(-5, -3, 10, 9, 2);
        ctx.fill();
        ctx.fillStyle = '#f0e0c0';
        ctx.beginPath();
        ctx.roundRect(-3, 0, 6, 5, 1.5);
        ctx.fill();
        ctx.fillStyle = this.bodyColor;
        ctx.beginPath();
        ctx.moveTo(-4, -4);
        ctx.lineTo(-2, -10);
        ctx.lineTo(0, -4);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.lineTo(2, -10);
        ctx.lineTo(4, -4);
        ctx.fill();
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(-1, 0, 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(3, 0, 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-0.5, -0.5, 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(3.5, -0.5, 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(1, 3, 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(5, 2);
        ctx.lineTo(9, 0);
        ctx.lineTo(5, 6);
        ctx.fill();
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.roundRect(-3, 6, 2, 2.5, 1);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(1, 6, 2, 2.5, 1);
        ctx.fill();
        break;

      case 'owl':
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, 6, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = this.bodyColor;
        ctx.beginPath();
        ctx.ellipse(0, 2, 4, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fe0';
        ctx.beginPath();
        ctx.arc(-2, -1, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(2, -1, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(-2, -1, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(2, -1, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-2, -1.5, 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(2, -1.5, 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fa0';
        ctx.beginPath();
        ctx.moveTo(1, 3);
        ctx.lineTo(0, 5);
        ctx.lineTo(-1, 3);
        ctx.fill();
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(-5, 1);
        ctx.lineTo(-9, -2);
        ctx.lineTo(-6, 4);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(5, 1);
        ctx.lineTo(9, -2);
        ctx.lineTo(6, 4);
        ctx.fill();
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.roundRect(-2, 5, 1.5, 2, 0.8);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(0.5, 5, 1.5, 2, 0.8);
        ctx.fill();
        break;

      case 'bear':
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = this.bodyColor;
        ctx.beginPath();
        ctx.arc(0, 2, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = this.bodyColor;
        ctx.beginPath();
        ctx.arc(-5, -5, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(5, -5, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(-2, -1, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(2, -1, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-2, -1.5, 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(2, -1.5, 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(0, 3, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.roundRect(-4, 5, 3, 3, 1);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(1, 5, 3, 3, 1);
        ctx.fill();
        break;

      case 'rabbit':
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 2, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = this.bodyColor;
        ctx.beginPath();
        ctx.arc(0, 4, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(-3, -6, 2, 5, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(3, -6, 2, 5, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#444';
        ctx.beginPath();
        ctx.arc(-2, 1, 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(2, 1, 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-1.5, 0.5, 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(2.5, 0.5, 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f88';
        ctx.beginPath();
        ctx.arc(0, -1, 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.roundRect(-2, 6, 1.5, 2, 0.8);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(0.5, 6, 1.5, 2, 0.8);
        ctx.fill();
        break;

      case 'snake':
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = this.bodyColor;
        ctx.beginPath();
        ctx.arc(0, 1, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(-6, 2, 4, 2.5, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(6, 2, 4, 2.5, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#444';
        ctx.beginPath();
        ctx.arc(-1.5, -1, 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(1.5, -1, 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff0';
        ctx.beginPath();
        ctx.arc(-1.5, -1, 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(1.5, -1, 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f44';
        ctx.beginPath();
        ctx.moveTo(-3, 3);
        ctx.lineTo(0, 6);
        ctx.lineTo(3, 3);
        ctx.fill();
        ctx.strokeStyle = this.bodyColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(-6, 0, 3, 0.5, Math.PI - 0.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(6, 0, 3, -Math.PI + 0.5, -0.5);
        ctx.stroke();
        break;

      case 'tiger':
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.roundRect(-6, -4, 12, 10, 2);
        ctx.fill();
        ctx.fillStyle = this.bodyColor;
        ctx.beginPath();
        ctx.roundRect(-4, -1, 8, 6, 1);
        ctx.fill();
        ctx.fillStyle = this.bodyColor;
        ctx.beginPath();
        ctx.moveTo(-5, -5);
        ctx.lineTo(-3, -10);
        ctx.lineTo(-1, -5);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(1, -5);
        ctx.lineTo(3, -10);
        ctx.lineTo(5, -5);
        ctx.fill();
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(-2, -1, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(2, -1, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#6f0';
        ctx.beginPath();
        ctx.arc(-2, -1, 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(2, -1, 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#222';
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-4, -6);
        ctx.lineTo(-1, -5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-3, -7);
        ctx.lineTo(0, -6);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(1, -5);
        ctx.lineTo(4, -6);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(3, -7);
        ctx.stroke();
        ctx.fillStyle = '#f88';
        ctx.beginPath();
        ctx.arc(-1, 2, 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.roundRect(-4, 5, 2.5, 3, 1);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(1.5, 5, 2.5, 3, 1);
        ctx.fill();
        break;

      case 'phoenix':
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = this.bodyColor;
        ctx.beginPath();
        ctx.arc(0, 1, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fa0';
        ctx.beginPath();
        ctx.moveTo(4, -2);
        ctx.lineTo(8, -4);
        ctx.lineTo(6, 0);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(4, 0);
        ctx.lineTo(9, 2);
        ctx.lineTo(6, 3);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-4, -2);
        ctx.lineTo(-8, -4);
        ctx.lineTo(-6, 0);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-4, 0);
        ctx.lineTo(-9, 2);
        ctx.lineTo(-6, 3);
        ctx.fill();
        ctx.fillStyle = '#ff0';
        ctx.beginPath();
        ctx.arc(-2, -1, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(2, -1, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(-2, -1, 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(2, -1, 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f80';
        ctx.beginPath();
        ctx.moveTo(-2, 4);
        ctx.quadraticCurveTo(0, 10, 2, 4);
        ctx.fill();
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.roundRect(-2, 5, 1.5, 2, 0.8);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(0.5, 5, 1.5, 2, 0.8);
        ctx.fill();
        break;

      default:
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-2, -1, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(2, -1, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#444';
        ctx.beginPath();
        ctx.arc(-2, -1, 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(2, -1, 0.7, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
  }
}
