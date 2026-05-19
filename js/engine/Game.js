import { CANVAS_WIDTH, CANVAS_HEIGHT, GAME_STATES, DUNGEONS, WEAPONS, FLOOR_WEAPONS, UPGRADE_POOL } from '../utils/constants.js';
import { Input } from './Input.js';
import { Camera } from './Camera.js';
import { Renderer } from './Renderer.js';
import { MainMenu } from '../ui/MainMenu.js';
import { CharacterSelect } from '../ui/CharacterSelect.js';
import { DungeonSelect } from '../ui/DungeonSelect.js';
import { HUD } from '../ui/HUD.js';
import { UpgradePanel } from '../ui/UpgradePanel.js';
import { GameOver } from '../ui/GameOver.js';
import { Victory } from '../ui/Victory.js';
import { Minimap } from '../ui/Minimap.js';
import { PetGuide } from '../ui/PetGuide.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { Pet } from '../entities/Pet.js';
import { Dungeon } from '../dungeon/Dungeon.js';
import { SpriteRenderer } from '../gfx/SpriteRenderer.js';
import { Particles } from '../gfx/Particles.js';
import { Lighting } from '../gfx/Lighting.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;

    this.state = GAME_STATES.MENU;
    this.input = new Input(canvas);
    this.camera = new Camera();
    this.renderer = new Renderer(this.ctx);
    this.spriteRenderer = new SpriteRenderer();
    this.particles = new Particles();
    this.lighting = new Lighting(CANVAS_WIDTH, CANVAS_HEIGHT);

    this.player = null;
    this.dungeon = null;
    this.enemies = [];
    this.projectiles = [];
    this.enemyBullets = [];
    this.items = [];
    this.saveSystem = new SaveSystem();

    this.selectedCharacter = null;
    this.selectedDungeon = null;
    this.currentFloor = 1;
    this.coins = this.saveSystem.getCoins();
    this.unlockedChars = this.saveSystem.getUnlockedChars();
    this.unlockedDungeons = this.saveSystem.getUnlockedDungeons();
    this.kills = 0;
    this.lastTime = 0;
    this.dt = 0;
    this.paused = false;
    this.transitionTimer = 0;
    this.autoSaveTimer = 0;
    this.interactPrompt = null;
    this.aggroTarget = null;
    this._regenTimer = 0;
    this._tick = 0;

    this.menu = new MainMenu(this);
    this.charSelect = new CharacterSelect(this);
    this.dungeonSelect = new DungeonSelect(this);
    this.hud = new HUD(this);
    this.upgradePanel = new UpgradePanel(this);
    this.gameOver = new GameOver(this);
    this.victory = new Victory(this);
    this.minimap = new Minimap(this, 120);
    this.petGuide = new PetGuide(this);

    this.running = false;
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    this.menu.show();
    this.loop(this.lastTime);
  }

  loop = (time) => {
    if (!this.running) return;
    this.dt = Math.min((time - this.lastTime) / 16.667, 3);
    this.lastTime = time;

    if (this.state === GAME_STATES.PLAYING) {
      if (this._acc === undefined) this._acc = 0;
      this._acc += this.dt;
      while (this._acc >= 1) {
        this._acc -= 1;
        this.update();
        this.hud.update();
        this.minimap.update();
      }
    } else {
      if (this.state === GAME_STATES.PAUSED) this.update();
      this.render();
      requestAnimationFrame(this.loop);
      return;
    }

    this.render();
    requestAnimationFrame(this.loop);
  }

  /** Actualiza la lógica del juego cada tick: input, física, enemigos, proyectiles, ítems */
  update() {
    if (this.input.justPressed('Escape')) {
      if (this.state === GAME_STATES.PLAYING || this.state === GAME_STATES.PAUSED) {
        this.togglePause();
      }
    }

    if (this.paused) { this.input.update(); return; }
    if (!this.player) return;
    this._tick++;

    if (this.player._lastStandJustTriggered) {
      this.player._lastStandJustTriggered = false;
      this.particles.emit(this.player.pos.x, this.player.pos.y, '#ff0', 20, 1, 40);
      this.particles.emit(this.player.pos.x, this.player.pos.y, '#fff', 15, 1, 30);
      const flash = document.createElement('div');
      flash.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(255,255,255,0.3);pointer-events:none;z-index:95;transition:opacity 0.3s;';
      flash.id = 'last-stand-flash';
      document.getElementById('ui-overlay').appendChild(flash);
      setTimeout(() => { const f = document.getElementById('last-stand-flash'); if (f) f.remove(); }, 300);
    }

    const mouseWX = this.input.mouse.x + this.camera.x;
    const mouseWY = this.input.mouse.y + this.camera.y;
    this.player.update(this.input, this.dungeon, mouseWX, mouseWY);

    if (this.input.isReloadJustPressed()) {
      this.player.reload();
    }

    if (this.player.wantsToShoot(this.input)) {
      const projs = this.player.getShootProjectiles(this);
      this.projectiles.push(...projs);
      if (projs.length > 0) {
        this.particles.emit(this.player.pos.x, this.player.pos.y, '#ffa', 2, 1, 5);
        this.alertEnemies(this.player.pos.x, this.player.pos.y, 220);
      }
    }

    if (this.player.meleeActive && this.player.knifeTimer >= 7) {
      const arc = Math.PI * 0.5;
      const angle = this.player.facing;
      const range = 36 + this.player.getUpgradeStack('knife_range') * 8;
      this.player.hitCounter++;
      for (const enemy of this.enemies) {
        if (enemy.dead) continue;
        const dx = enemy.pos.x - this.player.pos.x;
        const dy = enemy.pos.y - this.player.pos.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < range) {
          const a = Math.atan2(dy, dx);
          let diff = a - angle;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          if (Math.abs(diff) < arc) {
            enemy.takeDamage(this.player.getKnifeDamage());
            this.aggroTarget = enemy;
            this.alertEnemies(enemy.pos.x, enemy.pos.y, 200);
            this.knockbackEnemy(enemy, this.player.pos, 4);
            this.particles.emit(enemy.pos.x, enemy.pos.y, '#ccc', 4);
          }
        }
      }
    }

    const stealthActive = this.player?.special === 'stealth';
    const slowAuraStack = this.player.getUpgradeStack('slow_aura');

    if (slowAuraStack > 0 && !this.player.dead) {
      this._slowParticleTimer = (this._slowParticleTimer ?? 0) + 1;
      if (this._slowParticleTimer % 10 === 0) {
        this.particles.emit(
          this.player.pos.x + (Math.random() - 0.5) * 80,
          this.player.pos.y + (Math.random() - 0.5) * 80,
          '#8af', 1, 0.5, 5
        );
      }
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (slowAuraStack > 0 && !e.dead) {
        const sd = Math.sqrt((e.pos.x - this.player.pos.x) ** 2 + (e.pos.y - this.player.pos.y) ** 2);
        e._slowMult = sd < 100 + slowAuraStack * 20 ? (1 - slowAuraStack * 0.2) : 1;
      } else {
        e._slowMult = 1;
      }
      e.update(this.player, this.dungeon, stealthActive, this.enemies);

      if (e._burnTimer > 0 && !e.dead && this._tick % 6 === 0) {
        this.particles.emit(e.pos.x + (Math.random() - 0.5) * 10, e.pos.y + (Math.random() - 0.5) * 10, '#f80', 2, 1, 6);
      }

      if (!e.dead && this.player?.pets) {
        for (const pet of this.player.pets) {
          if (pet.dead || pet._meleeCD > 0) continue;
          const ed = Math.sqrt((e.pos.x - pet.pos.x) ** 2 + (e.pos.y - pet.pos.y) ** 2);
          if (ed < e.attackRange + pet.size) {
            pet.takeDamage(Math.max(1, e.damage));
            pet._meleeCD = 30;
          }
        }
      }

      if (e.wantsToShoot) {
        const angle = Math.atan2(this.player.pos.y - e.pos.y, this.player.pos.x - e.pos.x);
        this.enemyBullets.push({
          x: e.pos.x,
          y: e.pos.y,
          vx: Math.cos(angle) * 5.0,
          vy: Math.sin(angle) * 5.0,
          damage: Math.max(1, e.damage),
          life: 180,
          color: '#f80',
        });
      }

      if (e.dead && e.deathTimer <= 0) {
        this.onEnemyKilled(e);
        this.enemies.splice(i, 1);
      }
    }

    if (this.player && !this.player.dead) {
      if (this.aggroTarget?.dead) this.aggroTarget = null;
      for (const pet of this.player.pets) {
        pet.update(this.player, this.dungeon, this.enemies, this.aggroTarget);
        if (pet.pos.distTo(this.player.pos) > 300) {
          pet.pos.x = this.player.pos.x + (Math.random() - 0.5) * 20;
          pet.pos.y = this.player.pos.y + (Math.random() - 0.5) * 20;
        }
      }
    }

    if (this.player && !this.player.dead && this.dungeon) {
      const curRoom = this.dungeon.getCurrentRoom(this.player.pos.x, this.player.pos.y);
      if (curRoom && !curRoom.cleared && curRoom.type !== 'spawn') {
        const hasEnemies = this.enemies.some(e => !e.dead && e.room === curRoom);
        curRoom.locked = hasEnemies;
      } else if (curRoom) {
        curRoom.locked = false;
      }
    }

    const regenStack = this.player.getUpgradeStack('regen');
    if (regenStack > 0) {
      this._regenTimer--;
      if (this._regenTimer <= 0) {
        this._regenTimer = 300 - (regenStack - 1) * 60;
        if (this.player.hp < this.player.maxHP) {
          this.player.heal(1);
          this.particles.emit(this.player.pos.x, this.player.pos.y, '#4f4', 4);
        }
      }
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;

      let hitWall = p.life <= 0;
      if (!hitWall && this.dungeon) {
        hitWall = this.dungeon.isSolid(p.x, p.y, p.size ?? 3);
      }
      if (hitWall) {
        if (!p._bounced && this.player.hasUpgrade('ricochet') && p.life > 0) {
          p._bounced = true;
          if (this.dungeon?.isSolid(p.x + p.vx * 4, p.y, p.size ?? 3)) p.vx = -p.vx;
          if (this.dungeon?.isSolid(p.x, p.y + p.vy * 4, p.size ?? 3)) p.vy = -p.vy;
          this.particles.emit(p.x, p.y, '#8af', 3, 1, 6);
          continue;
        }
        this.particles.emit(p.x, p.y, '#ffa', 3, 1, 8);
        this.projectiles.splice(i, 1);
        continue;
      }

      let hit = false;
      for (const enemy of this.enemies) {
        if (enemy.dead || p.hitEnemies?.includes(enemy)) continue;
        const d = Math.sqrt((p.x - enemy.pos.x) ** 2 + (p.y - enemy.pos.y) ** 2);
        if (d < (p.size ?? 3) + enemy.size) {
          enemy.takeDamage(p.damage);
          this.aggroTarget = enemy;
          this.particles.emit(p.x, p.y, '#f40', 6);

          this.player.hitCounter = (this.player.hitCounter ?? 0) + 1;
          const lifesteal = this.player.getUpgradeStack('lifesteal');
          if (lifesteal > 0 && this.player.hitCounter >= (4 - lifesteal)) {
            this.player.hitCounter = 0;
            this.player.heal(1);
            this.particles.emit(this.player.pos.x, this.player.pos.y, '#4f4', 4);
          }

          if (p.explosive) {
            const radius = 48;
            this.particles.emit(p.x, p.y, '#f80', 20);
            for (const ex of this.enemies) {
              if (ex.dead || ex === enemy) continue;
              const ed = Math.sqrt((p.x - ex.pos.x) ** 2 + (p.y - ex.pos.y) ** 2);
              if (ed < radius) {
                ex.takeDamage(Math.floor(p.damage * 0.6));
              }
            }
            this.projectiles.splice(i, 1);
            hit = true;
            break;
          }

          if (p.pierceLeft > 0) {
            p.pierceLeft--;
            p.vx *= 0.85;
            p.vy *= 0.85;
            p.damage = Math.max(1, Math.floor(p.damage * 0.7));
            if (!p.hitEnemies) p.hitEnemies = [];
            p.hitEnemies.push(enemy);
          } else {
            this.projectiles.splice(i, 1);
            hit = true;
            break;
          }
        }
      }
    }

    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const b = this.enemyBullets[i];
      b.x += b.vx;
      b.y += b.vy;
      b.life--;

      let hitWall = b.life <= 0;
      if (!hitWall && this.dungeon) {
        hitWall = this.dungeon.isSolid(b.x, b.y, 3);
      }
      if (hitWall) {
        this.enemyBullets.splice(i, 1);
        continue;
      }

      if (this.player && !this.player.dead) {
        const d = Math.sqrt((b.x - this.player.pos.x) ** 2 + (b.y - this.player.pos.y) ** 2);
        if (d < 12) {
          const reflected = this.player.takeDamage(b.damage);
          if (reflected > 0) {
            this.particles.emit(this.player.pos.x, this.player.pos.y, '#8f8', 4);
          }
          this.enemyBullets.splice(i, 1);
          this.particles.emit(b.x, b.y, '#f44', 6);
          continue;
        }
      }

      if (this.player?.pets) {
        for (const pet of this.player.pets) {
          if (pet.dead) continue;
          const pd = Math.sqrt((b.x - pet.pos.x) ** 2 + (b.y - pet.pos.y) ** 2);
          if (pd < pet.size + 4) {
            pet.takeDamage(b.damage);
            this.enemyBullets.splice(i, 1);
            this.particles.emit(b.x, b.y, '#f44', 6);
            break;
          }
        }
      }
    }

    const pickupRange = 16 + this.player.getUpgradeStack('coin_magnet') * 16;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      if (this.player.pos.distTo(item.pos) < pickupRange) {
        if (item.type === 'coin') {
          this.coins += item.value;
          this.#showCoinFloat(item.pos.x - this.camera.x, item.pos.y - this.camera.y, item.value);
          this.items.splice(i, 1);
        } else if (item.type === 'health') {
          this.player.heal(item.value);
          this.particles.emit(item.pos.x, item.pos.y, '#4f4', 8);
          this.items.splice(i, 1);
        } else if (item.type === 'weapon') {
          const result = this.player.pickupWeapon(item.weaponId, item.carried);
          if (result.success) {
            this.particles.emit(item.pos.x, item.pos.y, '#ff0', 8);
            this.items.splice(i, 1);
            this.dropWeaponAtPlayer(result.dropped);
          }
        }
      }
    }

    if (this.input.justPressed('e') || this.input.justPressed('E')) {
      this.tryInteract();
    }

    if (this.input.justPressed('q') || this.input.justPressed('Q')) {
      this.player.prevWeapon();
    }
    if (this.input.justPressed('Tab')) {
      this.player.nextWeapon();
    }
    if (this.input.scroll < 0) {
      this.player.nextWeapon();
    } else if (this.input.scroll > 0) {
      this.player.prevWeapon();
    }
    if (this.input.justPressed('1')) this.player.weaponIndex = 0;
    if (this.input.justPressed('2') && this.player.inventory.length > 1) this.player.weaponIndex = 1 % this.player.inventory.length;
    if (this.input.justPressed('3') && this.player.inventory.length > 2) this.player.weaponIndex = 2 % this.player.inventory.length;

    this.autoSaveTimer++;
    if (this.autoSaveTimer >= 300) {
      this.autoSaveTimer = 0;
      this.saveSystem.addCoins(0);
      this.coins = this.saveSystem.getCoins();
    }

    this.camera.follow(this.player?.pos, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.particles.update();
    this.lighting.update(this.player, this.dungeon, this.camera);

    this.checkRoomCleared();
    this.checkInteractables();
    this.input.update();
  }

  tryInteract() {
    if (!this.player || !this.dungeon) return;

    for (const item of this.items) {
      if (item.type === 'exit' && this.player.pos.distTo(item.pos) < 24) {
        this.nextFloor();
        return;
      }
    }

    for (const item of this.items) {
      if (item.type === 'weapon' && this.player.pos.distTo(item.pos) < 20) {
        const result = this.player.pickupWeapon(item.weaponId, item.carried);
        if (result.success) {
          this.particles.emit(item.pos.x, item.pos.y, '#ff0', 8);
          this.items.splice(this.items.indexOf(item), 1);
          this.dropWeaponAtPlayer(result.dropped);
        }
        return;
      }
    }
    const room = this.dungeon.getCurrentRoom(this.player.pos.x, this.player.pos.y);
    if (!room || room.cleared) return;
    const tx = Math.floor(this.player.pos.x / 16);
    const ty = Math.floor(this.player.pos.y / 16);
    const tile = this.dungeon.getTile(tx, ty);
    if (tile === 3) {
      this.dungeon.tiles[ty * this.dungeon.width + tx] = 0;
      this.coins += 3 + this.currentFloor * 2;
      if (Math.random() < 0.3) {
        const wpId = FLOOR_WEAPONS[Math.floor(Math.random() * FLOOR_WEAPONS.length)];
        this.items.push({
          pos: { x: room.centerX * 16, y: room.centerY * 16 },
          type: 'weapon',
          weaponId: wpId,
        });
      }
      this.particles.emit(room.centerX * 16, room.centerY * 16, '#fd0', 10);
    }
  }

  checkInteractables() {
    if (!this.player || !this.dungeon) return;

    let nearItem = null;
    for (const item of this.items) {
      if (item.type === 'exit' && this.player.pos.distTo(item.pos) < 24) {
        this.interactPrompt = { text: '[E] Bajar al siguiente piso' };
        return;
      }
      if (item.type === 'weapon' && this.player.pos.distTo(item.pos) < 20) {
        nearItem = item;
      }
    }

    if (!nearItem) {
      const tx = Math.floor(this.player.pos.x / 16);
      const ty = Math.floor(this.player.pos.y / 16);
      const tile = this.dungeon.getTile(tx, ty);
      const room = this.dungeon.getCurrentRoom(this.player.pos.x, this.player.pos.y);
      if (tile === 3 && room && !room.cleared) {
        this.interactPrompt = { text: '[E] Abrir cofre' };
      } else {
    this.interactPrompt = null;
      }
    } else {
      this.interactPrompt = { text: `[E] Recoger ${WEAPONS[nearItem.weaponId]?.name ?? 'arma'}` };
    }
  }

  dropWeaponAtPlayer(dropped) {
    if (!dropped) return;
    this.items.push({
      pos: { x: this.player.pos.x, y: this.player.pos.y },
      type: 'weapon',
      weaponId: dropped.weaponId,
      carried: { magAmmo: dropped.magAmmo, magSize: dropped.magSize },
    });
  }

  knockbackEnemy(enemy, fromPos, force) {
    const dx = enemy.pos.x - fromPos.x;
    const dy = enemy.pos.y - fromPos.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    enemy.knockbackVx = (dx / d) * force;
    enemy.knockbackVy = (dy / d) * force;
    enemy.knockbackTimer = 6;
  }

  alertEnemies(x, y, radius) {
    if (!this.enemies) return;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = Math.sqrt((e.pos.x - x) ** 2 + (e.pos.y - y) ** 2);
      if (d < radius) {
        e.alertTimer = Math.max(e.alertTimer, 90);
      }
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (this.state === GAME_STATES.PLAYING || this.state === GAME_STATES.UPGRADE || this.state === GAME_STATES.PAUSED) {
      this.renderer.clear(ctx);
      this.renderer.renderDungeon(ctx, this.dungeon, this.camera, this.spriteRenderer);
      this.renderer.renderEntities(ctx, this.camera, this.enemies, this.player, null, this.items, this.spriteRenderer);
      this.renderer.renderPets(ctx, this.camera, this.player?.pets);
      this.renderer.renderProjectiles(ctx, this.camera, this.projectiles, '#ffd700');
      this.renderer.renderEnemyBullets(ctx, this.camera, this.enemyBullets);
      this.renderer.renderParticles(ctx, this.camera, this.particles);
      this.renderer.renderLighting(ctx, this.lighting);
    }
  }

  startRun(dungeonId, character) {
    this.selectedDungeon = dungeonId;
    this.selectedCharacter = character;
    this.currentFloor = 1;
    this.kills = 0;
    this.enemies = [];
    this.projectiles = [];
    this.enemyBullets = [];
    this.items = [];
    this.autoSaveTimer = 0;
    this.coins = this.saveSystem.getCoins();
    this.transitionTimer = 0;
    this.aggroTarget = null;

    this.player = new Player(character, this.saveSystem.getActivePets());
    this.syncPetUpgrades();

    this.generateFloor();
    this.spawnEnemies();

    this.state = GAME_STATES.PLAYING;
    this.paused = false;
    this._acc = 0;
    this.hud.show();
    this.minimap.show();
    this.menu.hide();
    this.charSelect.hide();
    this.dungeonSelect.hide();

    this.showFloorText(`Piso ${this.currentFloor}`);
  }

  generateFloor() {
    const dungeonDef = DUNGEONS.find(d => d.id === this.selectedDungeon);
    this.dungeon = new Dungeon(dungeonDef, this.currentFloor);
    this.dungeon.generate();

    const spawnRoom = this.dungeon.rooms.find(r => r.type === 'spawn');
    if (spawnRoom) {
      this.player.pos.x = spawnRoom.centerX * 16;
      this.player.pos.y = spawnRoom.centerY * 16;
      if (this.dungeon.isSolid(this.player.pos.x, this.player.pos.y, this.player.size)) {
        for (let ty = spawnRoom.y; ty < spawnRoom.y + spawnRoom.h; ty++) {
          for (let tx = spawnRoom.x; tx < spawnRoom.x + spawnRoom.w; tx++) {
            if (!this.dungeon.isSolidTile(tx, ty)) {
              this.player.pos.x = tx * 16 + 8;
              this.player.pos.y = ty * 16 + 8;
              break;
            }
          }
          if (!this.dungeon.isSolid(this.player.pos.x, this.player.pos.y, this.player.size)) break;
        }
      }
      if (this.player?.pets) {
        for (const pet of this.player.pets) {
          pet.pos.x = this.player.pos.x + (Math.random() - 0.5) * 20;
          pet.pos.y = this.player.pos.y + (Math.random() - 0.5) * 20;
        }
      }
    }

    this.camera.follow(this.player.pos, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.camera.snap(this.player.pos, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  /** Genera enemigos para el piso actual usando plantillas con peso aleatorio */
  spawnEnemies() {
    this.enemies = [];
    this.items = [];
    this.projectiles = [];
    this.enemyBullets = [];

    const dungeonDef = DUNGEONS.find(d => d.id === this.selectedDungeon);
    const diffMult = dungeonDef?.difficulty ?? 1;
    const hpBonus = Math.floor(this.currentFloor * 0.5);
    const dmgBonus = Math.floor(this.currentFloor * 0.15);

    const ENEMY_TEMPLATES = [
      {
        minFloor: 1, weight: 4,
        make: (rng) => ({
          hp: Math.floor((3 + rng.nextInt(0, 2)) * diffMult) + hpBonus,
          speed: 0.85 + Math.random() * 0.3,
          damage: 1 + dmgBonus,
          size: 14,
          color: rng.pick(['#8a4', '#6a8', '#a86']),
          name: 'Esbirro',
          enemyType: 'melee',
          detectionRange: 200 + this.currentFloor * 12,
          attackRange: 20,
        }),
      },
      {
        minFloor: 1, weight: 2,
        make: (rng) => ({
          hp: Math.floor((2 + rng.nextInt(0, 1)) * diffMult) + Math.floor(hpBonus * 0.5),
          speed: 1.2 + Math.random() * 0.3,
          damage: 1 + dmgBonus,
          size: 11,
          color: rng.pick(['#e44', '#f66', '#d33']),
          name: 'Corredor',
          enemyType: 'melee',
          detectionRange: 250 + this.currentFloor * 12,
          attackRange: 20,
        }),
      },
      {
        minFloor: 2, weight: 2,
        make: (rng) => ({
          hp: Math.floor((5 + rng.nextInt(0, 3)) * diffMult) + Math.floor(hpBonus * 1.5),
          speed: 0.65 + Math.random() * 0.2,
          damage: 2 + dmgBonus,
          size: 20,
          color: rng.pick(['#644', '#844', '#544']),
          name: 'Bruto',
          enemyType: 'melee',
          detectionRange: 230 + this.currentFloor * 12,
          attackRange: 26,
        }),
      },
      {
        minFloor: 3, weight: 2,
        make: (rng) => ({
          hp: Math.floor((3 + rng.nextInt(0, 2)) * diffMult) + hpBonus,
          speed: 0.9 + Math.random() * 0.2,
          damage: 1 + dmgBonus,
          size: 14,
          color: rng.pick(['#e60', '#fa0', '#d80']),
          name: 'Lanzallamas',
          enemyType: 'ranged',
          detectionRange: 270 + this.currentFloor * 12,
          attackRange: 180,
        }),
      },
      {
        minFloor: 5, weight: 1,
        make: (rng) => ({
          hp: Math.floor((3 + rng.nextInt(0, 2)) * diffMult) + Math.floor(hpBonus * 1.2),
          speed: 1.0 + Math.random() * 0.2,
          damage: 2 + dmgBonus,
          size: 14,
          color: rng.pick(['#c22', '#a33', '#e22']),
          name: 'Arquero',
          enemyType: 'ranged',
          detectionRange: 300 + this.currentFloor * 12,
          attackRange: 200,
        }),
      },
    ];

    for (const room of this.dungeon.rooms) {
      if (room.type === 'spawn') continue;

      if (room.type === 'boss') {
        const boss = new Enemy(
          room.centerX * 16,
          room.centerY * 16,
          {
            hp: Math.floor(25 * diffMult) + hpBonus * 3,
            speed: 1.0,
            damage: 2 + dmgBonus,
            size: 22,
            xp: 10 + this.currentFloor * 2,
            coins: 20 + this.currentFloor * 2,
            color: '#f44',
            name: dungeonDef?.bossName ?? 'Jefe',
            type: 'boss',
            enemyType: 'melee',
            detectionRange: 380,
            attackRange: 28,
          },
          room
        );
        this.enemies.push(boss);
        continue;
      }

      if (room.type === 'treasure') {
        const hasWeapon = Math.random() < 0.5;
        if (hasWeapon) {
          const wpId = FLOOR_WEAPONS[Math.floor(Math.random() * FLOOR_WEAPONS.length)];
          this.items.push({
            pos: { x: room.centerX * 16, y: room.centerY * 16 },
            type: 'weapon',
            weaponId: wpId,
          });
        } else {
          this.items.push({
            pos: { x: room.centerX * 16, y: room.centerY * 16 },
            value: 5 + this.currentFloor * 2,
            type: 'coin',
          });
        }
        continue;
      }

      const floorBonus = Math.floor(this.currentFloor / 3);
      const enemyCount = 1 + this.dungeon.rng.nextInt(0, Math.min(2 + floorBonus, 5));

      for (let i = 0; i < enemyCount; i++) {
        const ex = (room.x + 1 + this.dungeon.rng.nextInt(0, Math.max(1, room.w - 2))) * 16;
        const ey = (room.y + 1 + this.dungeon.rng.nextInt(0, Math.max(1, room.h - 2))) * 16;

        const available = ENEMY_TEMPLATES.filter(t => this.currentFloor >= t.minFloor);
        const totalWeight = available.reduce((s, t) => s + t.weight, 0);
        let roll = Math.random() * totalWeight;
        let chosen = available[0];
        for (const t of available) {
          roll -= t.weight;
          if (roll <= 0) { chosen = t; break; }
        }

        const config = chosen.make(this.dungeon.rng);
        config.type = 'normal';
        config.xp = Math.floor((3 + this.currentFloor + (config.enemyType === 'ranged' ? 2 : 0) + (config.size > 14 ? 3 : 0)) * 0.82);
        config.coins = Math.max(1, Math.floor((1 + this.currentFloor) / 4));

        if (this.currentFloor >= 3 && Math.random() < 0.08 + this.currentFloor * 0.01) {
          config.isElite = true;
          config.hp = Math.floor(config.hp * 2.5);
          config.damage = Math.floor(config.damage * 1.5);
          config.speed *= 1.15;
          config.xp = Math.floor(config.xp * 2);
          config.coins = Math.floor(config.coins * 3);
          config.auraRange = 80;
          config.auraDamageMult = 1.5;
          config.auraSpeedMult = 1.3;
        }

        const enemy = new Enemy(ex, ey, config, room);
        this.enemies.push(enemy);
      }
    }
  }

  nextFloor() {
    this.currentFloor++;
    this.enemies = [];
    this.items = [];
    this.projectiles = [];
    this.enemyBullets = [];
    this.aggroTarget = null;
    this.player?.resetLastStand();
    this.generateFloor();
    this.spawnEnemies();
    this.showFloorText(`Piso ${this.currentFloor}`);
  }

  showFloorText(text) {
    this.hideFloorText?.();
    const el = document.createElement('div');
    el.className = 'floor-transition';
    el.id = 'floor-transition-text';
    el.textContent = text;
    document.getElementById('ui-overlay').appendChild(el);
    this.floorTextEl = el;
    setTimeout(() => this.hideFloorText(), 1500);
  }

  hideFloorText() {
    this.floorTextEl?.remove();
    this.floorTextEl = null;
  }

  /** Verifica si la sala actual está limpia de enemigos y gestiona recompensas */
  checkRoomCleared() {
    const room = this.dungeon?.getCurrentRoom(this.player.pos.x, this.player.pos.y);
    if (!room || room.cleared || room.type === 'spawn') return;

    const enemiesInRoom = this.enemies.filter(e =>
      !e.dead &&
      e.pos.x > room.x * 16 - 16 &&
      e.pos.x < (room.x + room.w) * 16 + 16 &&
      e.pos.y > room.y * 16 - 16 &&
      e.pos.y < (room.y + room.h) * 16 + 16
    );

    if (enemiesInRoom.length === 0) {
      room.cleared = true;

      const normalClear = this.dungeon.rooms.every(r =>
        r.type === 'spawn' || r.type === 'boss' || r.cleared
      );
      if (normalClear && room.type !== 'boss') {
        const spawnRoom = this.dungeon.rooms.find(r => r.type === 'spawn');
        if (spawnRoom) {
          const sx = spawnRoom.centerX * 16;
          const sy = spawnRoom.centerY * 16;
          const atSpawn = (i) => i.type === 'weapon' && Math.hypot(i.pos.x - sx, i.pos.y - sy) < 32;
          const hasChest = this.items.some(atSpawn);
          if (!hasChest) {
            this.items.push({
              pos: { x: sx, y: sy },
              type: 'weapon',
              weaponId: FLOOR_WEAPONS[Math.floor(Math.random() * FLOOR_WEAPONS.length)],
            });
          }
        }
      }

      if (room.type === 'boss') {
        const dungeonDef = DUNGEONS.find(d => d.id === this.selectedDungeon);
        const dungeonIdx = DUNGEONS.indexOf(dungeonDef);
        const nextDungeon = DUNGEONS[dungeonIdx + 1];
        if (nextDungeon) {
          this.saveSystem.unlockDungeon(nextDungeon.id);
        }

        const bx = (room.x + Math.floor(room.w / 2)) * 16;
        const by = (room.y + Math.floor(room.h / 2)) * 16;
        const hasBossWeapon = this.items.some(i => i.type === 'weapon' && Math.hypot(i.pos.x - bx, i.pos.y - by) < 48);
        if (!hasBossWeapon) {
          this.items.push({ pos: { x: bx, y: by + 16 }, type: 'weapon', weaponId: FLOOR_WEAPONS[Math.floor(Math.random() * FLOOR_WEAPONS.length)] });
        }
        this.coins += 2 + this.currentFloor * 2;
        this.particles.emit(bx, by, '#fd0', 12);

        if (this.currentFloor >= (dungeonDef?.floors ?? 15)) {
          this.saveSystem.addCoins(this.coins);
          this.coins = this.saveSystem.getCoins();
          this.state = GAME_STATES.VICTORY;
          this.victory.show();
          this.hud.hide();
          this.minimap.hide();
          return;
        }

        const doorPos = {
          x: (room.x + Math.floor(room.w / 2)) * 16,
          y: (room.y + room.h - 1) * 16,
        };
        const hasDoor = this.items.some(i => i.type === 'exit');
        if (!hasDoor) {
          this.items.push({ pos: doorPos, type: 'exit' });
          this.particles.emit(doorPos.x, doorPos.y, '#4af', 15);
        }
      }
    }
  }

  onEnemyKilled(enemy) {
    this.kills++;
    const dungeonDef = DUNGEONS.find(d => d.id === this.selectedDungeon);
    const coinMult = dungeonDef?.coinMultiplier ?? 1;
    const coinDrop = Math.floor((enemy.coinDrop ?? 1) * coinMult);
    this.coins += coinDrop;

    const greedStack = this.player.getUpgradeStack('greed');
    if (greedStack > 0) this.coins += greedStack;

    const healOnKill = this.player.getUpgradeStack('heal_on_kill');
    if (healOnKill > 0 && this.player.hp < this.player.maxHP) {
      this.player.heal(healOnKill);
      this.particles.emit(enemy.pos.x, enemy.pos.y, '#4f4', 6);
    }

    if (Math.random() < 0.08 && this.player.hp < this.player.maxHP) {
      this.items.push({
        pos: { x: enemy.pos.x, y: enemy.pos.y },
        value: 1,
        type: 'health',
      });
    }

    if (Math.random() < 0.05) {
      const wpId = FLOOR_WEAPONS[Math.floor(Math.random() * FLOOR_WEAPONS.length)];
      this.items.push({
        pos: { x: enemy.pos.x, y: enemy.pos.y },
        type: 'weapon',
        weaponId: wpId,
      });
    }

    if (!enemy.isElite && Math.random() < 0.2) {
      const hordeCount = 1 + Math.floor(Math.random() * 2);
      const room = this.dungeon?.getCurrentRoom(enemy.pos.x, enemy.pos.y);
      for (let h = 0; h < hordeCount; h++) {
        const hx = enemy.pos.x + (Math.random() - 0.5) * 48;
        const hy = enemy.pos.y + (Math.random() - 0.5) * 48;
        const color = this.dungeon.rng.pick(['#f44', '#a44', '#d66']);
        const hordeConfig = {
          hp: Math.max(1, Math.floor(enemy.maxHP * 0.6)),
          speed: enemy.speed * 1.1,
          damage: Math.max(1, Math.floor(enemy.damage * 0.7)),
          size: Math.max(8, enemy.size - 2),
          color: color,
          name: enemy.name + ' (cria)',
          enemyType: enemy.enemyType,
          detectionRange: enemy.detectionRange + 50,
          attackRange: enemy.attackRange,
          xp: Math.floor((enemy.xpDrop ?? 3) * 0.5),
          coins: 0,
          type: 'normal',
        };
        const horde = new Enemy(hx, hy, hordeConfig, room);
        this.enemies.push(horde);
        this.particles.emit(hx, hy, '#f44', 4);
      }
    }

    this.player.addXP(enemy.xpDrop ?? 5);

    if (this.player?.pets) {
      const petXP = Math.floor((enemy.xpDrop ?? 5) * 0.4) + 1;
      for (const pet of this.player.pets) {
        pet.addXP(petXP);
      }
    }

    if (this.player.xp >= this.player.xpToNext) {
      this.player.levelUp();
      if (this.player.level <= 50) {
        this.paused = true;
        this.state = GAME_STATES.UPGRADE;
        this.upgradePanel.show(this.player);
      }
    }
  }

  applyUpgrade(upgradeId) {
    const player = this.player;
    if (upgradeId === 'knife') player.knifeUnlocked = true;
    if (upgradeId === 'hp_plus') {
      player.maxHP++;
      player.hp = Math.min(player.maxHP, player.hp + 1);
    }
    if (upgradeId === 'ammo_up') {
      for (const w of player.inventory) {
        w.magSize = Math.floor(w.magSize * 1.25);
        w.magAmmo = Math.min(w.magAmmo + Math.floor(w.magSize * 0.25), w.magSize);
      }
    }
    player.upgrades[upgradeId] = (player.upgrades[upgradeId] ?? 0) + 1;

    if (upgradeId === 'heal_on_kill') {
      player.heal(1);
    }
    if (upgradeId === 'shield') {
      player.invincibleTimer = Math.max(player.invincibleTimer, 5);
    }

    if (upgradeId.startsWith('pet_')) {
      this.syncPetUpgrades();
    }

    this.upgradePanel.hide();
    this.state = GAME_STATES.PLAYING;
    this.paused = false;
  }

  syncPetUpgrades() {
    if (!this.player?.pets) return;
    const player = this.player;
    const dmgBonus = player.getUpgradeStack('pet_damage');
    const hpBonus = player.getUpgradeStack('pet_hp') * 3;
    const spdMult = 1 + player.getUpgradeStack('pet_speed') * 0.12;
    const atkMult = Math.max(0.4, 1 - player.getUpgradeStack('pet_attack') * 0.15);
    const respMult = Math.max(0.3, 1 - player.getUpgradeStack('pet_respawn') * 0.25);
    for (const pet of this.player.pets) {
      if (pet.dead) continue;
      pet._upgDamage = dmgBonus;
      pet._upgHP = hpBonus;
      pet._upgSpeedMult = spdMult;
      pet._upgAtkMult = atkMult;
      pet._upgRespawnMult = respMult;
    }
  }

  onPlayerDeath() {
    this.state = GAME_STATES.GAME_OVER;
    this.gameOver.show();
    this.hud.hide();
    this.minimap.hide();
    this.saveSystem.addCoins(this.coins);
    this.coins = this.saveSystem.getCoins();
  }

  returnToMenu() {
    this.gameOver.hide();
    this.victory.hide();
    this.hud.hide();
    this.minimap.hide();
    this.upgradePanel.hide();
    this.hideFloorText();
    document.getElementById('pause-overlay')?.remove();

    this.player = null;
    this.dungeon = null;
    this.enemies = [];
    this.projectiles = [];
    this.enemyBullets = [];
    this.items = [];
    this.coins = this.saveSystem.getCoins();
    this.selectedCharacter = null;
    this.selectedDungeon = null;

    this.state = GAME_STATES.MENU;
    this.menu.refresh();
    this.menu.show();
  }

  togglePause() {
    this.paused = !this.paused;
    if (this.paused) {
      this.state = GAME_STATES.PAUSED;
      const el = document.createElement('div');
      el.className = 'pause-overlay';
      el.id = 'pause-overlay';
      el.innerHTML = `
        <h1>PAUSA</h1>
        <button class="menu-btn" id="btn-resume">CONTINUAR</button>
        <button class="menu-btn" id="btn-show-upgrades">MEJORAS</button>
        <button class="menu-btn" id="btn-quit-run" style="margin-top:0.5rem;">SALIR</button>
        <div id="pause-upgrades-list" style="display:none;margin-top:1rem;"></div>
      `;
      document.getElementById('ui-overlay').appendChild(el);
      document.getElementById('btn-resume').onclick = () => this.togglePause();
      document.getElementById('btn-quit-run').onclick = () => this.quitRun();
      document.getElementById('btn-show-upgrades').onclick = () => this.#toggleUpgradeList();
    } else {
      this.state = GAME_STATES.PLAYING;
      this._acc = 0;
      const el = document.getElementById('pause-overlay');
      if (el) el.remove();
    }
  }

  #showCoinFloat(sx, sy, value) {
    const el = document.createElement('div');
    el.className = 'coin-float';
    el.textContent = `+${value} 🪙`;
    el.style.left = `${sx}px`;
    el.style.top = `${sy}px`;
    document.getElementById('ui-overlay').appendChild(el);
    setTimeout(() => el.remove(), 700);
  }

  #toggleUpgradeList() {
    const list = document.getElementById('pause-upgrades-list');
    if (!list) return;
    if (list.style.display !== 'none') { list.style.display = 'none'; return; }
    if (!this.player) return;
    const up = this.player.upgrades;
    const entries = Object.entries(up).filter(([, v]) => v > 0);
    if (entries.length === 0) {
      list.innerHTML = '<div style="color:#666;font-size:0.8rem;padding:1rem;">Aún no tienes mejoras</div>';
    } else {
      const pool = {};
      for (const u of UPGRADE_POOL) pool[u.id] = u;
      let html = '<div style="color:#888;font-size:0.75rem;margin-bottom:0.5rem;letter-spacing:1px;">TUS MEJORAS</div>';
      for (const [id, stack] of entries) {
        const def = pool[id];
        if (!def) continue;
        const stars = '★'.repeat(stack) + '☆'.repeat(def.maxStack - stack);
        html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:0.3rem 0.5rem;color:#ccc;font-size:0.8rem;border-bottom:1px solid #222;">
          <span>${def.icon} ${def.name}</span>
          <span style="color:#f0c040;font-size:0.65rem;letter-spacing:2px;">${stars}</span>
        </div>`;
      }
      list.innerHTML = html;
    }
    list.style.display = 'block';
  }

  quitRun() {
    document.getElementById('pause-overlay')?.remove();
    this.hud.hide();
    this.minimap.hide();
    this.state = GAME_STATES.MENU;
    this.paused = false;
    this.player = null;
    this.dungeon = null;
    this.enemies = [];
    this.projectiles = [];
    this.enemyBullets = [];
    this.items = [];
    this.coins = this.saveSystem.getCoins();
    this.menu.refresh();
    this.menu.show();
  }
}
