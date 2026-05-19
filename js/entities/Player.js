import { Vec2 } from '../utils/math.js';
import { Weapon } from '../weapons/Weapon.js';
import { WEAPONS, PET_SYNERGIES } from '../utils/constants.js';
import { Pet } from './Pet.js';

export class Player {
  constructor(character, activePets = ['dog']) {
    this.pos = new Vec2(0, 0);
    this.size = 14;
    this.speed = character.speed;
    this.maxHP = character.hp;
    this.hp = character.hp;
    this.special = character.special;
    this.characterId = character.id;

    this.weapon = new Weapon(character.weaponId, WEAPONS[character.weaponId]);
    this.inventory = [this.weapon];
    this.weaponIndex = 0;

    this.pets = [];
    for (const petId of activePets) {
      this.pets.push(new Pet(petId));
    }
    this.activeSynergies = [];
    this.applyPetSynergies();

    this.level = 1;
    this.xp = 0;
    this.xpToNext = 10;
    this.facing = 0;
    this.facingDir = 'right';
    this.walkFrame = 0;
    this.walkTimer = 0;
    this.shootTimer = 0;

    this.upgrades = {};
    this.knifeUnlocked = character.special === 'knife_unlocked';
    this.knifeCooldown = 0;
    this.knifeTimer = 0;
    this.meleeActive = false;

    this.invincibleTimer = 0;
    this.dead = false;
    this.hitCounter = 0;
    this._lastStandUsed = false;
    this._lastStandJustTriggered = false;

    this.shootFacing = 0;
  }

  get currentWeapon() {
    return this.inventory[this.weaponIndex];
  }

  /** Actualiza posición, facing, cuchillo y cooldowns del jugador */
  update(input, dungeon, mouseWorldX, mouseWorldY) {
    if (this.dead) return;

    const dir = input.getDir();
    const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
    if (len > 0) {
      const normX = dir.x / len;
      const normY = dir.y / len;
      const spd = this.speed * this.getSpeedMult();
      let newX = this.pos.x + normX * spd;
      let newY = this.pos.y + normY * spd;

      if (!dungeon?.isSolid(newX, this.pos.y, this.size)) {
        this.pos.x = newX;
      }
      if (!dungeon?.isSolid(this.pos.x, newY, this.size)) {
        this.pos.y = newY;
      }

      this.walkTimer += 0.1;
      if (this.walkTimer > 0.25) {
        this.walkTimer = 0;
        this.walkFrame = (this.walkFrame + 1) % 4;
      }
    } else {
      this.walkFrame = 0;
    }

    const mx = mouseWorldX != null ? mouseWorldX : this.pos.x + 16;
    const my = mouseWorldY != null ? mouseWorldY : this.pos.y;
    const dx = mx - this.pos.x;
    const dy = my - this.pos.y;
    if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
      this.shootFacing = Math.atan2(dy, dx);
      this.facingDir = dx < 0 ? 'left' : 'right';
    }

    if (this.knifeCooldown > 0) this.knifeCooldown--;
    if (this.knifeTimer > 0) {
      this.knifeTimer--;
      if (this.knifeTimer <= 0) this.meleeActive = false;
    }

    if (input.isMeleeJustPressed() && this.knifeUnlocked && this.knifeCooldown <= 0) {
      this.meleeActive = true;
      this.knifeTimer = 8;
      this.knifeCooldown = 25;
    }

    if (this.invincibleTimer > 0) this.invincibleTimer--;

    this.currentWeapon.update();
  }

  wantsToShoot(input) {
    return input.isShootHeld() && this.currentWeapon.canShoot();
  }

  reload() {
    this.currentWeapon.reload();
  }

  getShootProjectiles(camera) {
    return this.currentWeapon.createProjectiles(this, camera);
  }

  pickupWeapon(weaponId, carriedState) {
    const def = WEAPONS[weaponId];
    if (!def) return { success: false };

    const existing = this.inventory.find(w => w.id === weaponId);
    if (existing) {
      existing.addAmmo(0);
      return { success: false };
    }

    const newW = new Weapon(weaponId, def);
    if (carriedState) {
      if (carriedState.magSize) newW.magSize = carriedState.magSize;
      newW.magAmmo = Math.min(carriedState.magAmmo, newW.magSize);
    }

    if (this.inventory.length < 3) {
      this.inventory.push(newW);
      this.weaponIndex = this.inventory.length - 1;
      return { success: true, dropped: null };
    }

    const dropped = this.inventory[this.weaponIndex];
    this.inventory[this.weaponIndex] = newW;
    return { success: true, dropped: { weaponId: dropped.id, magAmmo: dropped.magAmmo, magSize: dropped.magSize } };
  }

  getActivePets() {
    return this.pets.filter(p => !p.dead);
  }

  nextWeapon() {
    if (this.inventory.length > 1) {
      this.weaponIndex = (this.weaponIndex + 1) % this.inventory.length;
    }
  }

  prevWeapon() {
    if (this.inventory.length > 1) {
      this.weaponIndex = (this.weaponIndex - 1 + this.inventory.length) % this.inventory.length;
    }
  }

  addXP(amount) {
    this.xp += amount;
  }

  levelUp() {
    this.level++;
    this.xp -= this.xpToNext;
    this.xpToNext = Math.floor(this.xpToNext * 1.4) + 5;
    if (this.xp < 0) this.xp = 0;
  }

  takeDamage(amount) {
    if (this.invincibleTimer > 0 || this.dead) return 0;
    const dodgeChance = this.getUpgradeStack('dodge') * 0.1;
    if (dodgeChance > 0 && Math.random() < dodgeChance) return 0;
    const shieldStack = this.getUpgradeStack('shield');
    if (shieldStack > 0 && Math.random() < 0.2 * shieldStack) {
      return 0;
    }
    this.hp -= amount;
    this.invincibleTimer = 30;

    if (this.hp <= 0 && this.hp + amount > 0) {
      const lastStand = this.getUpgradeStack('last_stand');
      if (lastStand > 0 && !this._lastStandUsed) {
        this._lastStandUsed = true;
        this.hp = 1;
        this.invincibleTimer = 60;
        this._lastStandJustTriggered = true;
        return 0;
      }
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
    }
    const thorns = this.getUpgradeStack('thorns');
    const vengeance = this.getUpgradeStack('vengeance');
    let reflected = 0;
    if (thorns > 0 && this.hp > 0) reflected += thorns;
    if (vengeance > 0 && this.hp > 0) reflected += vengeance;
    return reflected;
  }

  resetLastStand() {
    this._lastStandUsed = false;
  }

  hasAdrenaline() {
    const stack = this.getUpgradeStack('adrenaline');
    return stack > 0 && this.hp / this.maxHP < 0.5;
  }

  getSpeedMult() {
    const stack = this.getUpgradeStack('speed_boots');
    let mult = 1 + stack * 0.15;
    if (this.hasAdrenaline()) mult *= (1 + this.getUpgradeStack('adrenaline') * 0.2);
    return mult;
  }

  heal(amount) {
    this.hp = Math.min(this.maxHP, this.hp + amount);
  }

  hasUpgrade(id) {
    return !!this.upgrades[id];
  }

  getUpgradeStack(id) {
    return this.upgrades[id] ?? 0;
  }

  getWeaponDamageBonus() {
    return this.getUpgradeStack('weapon_damage');
  }

  getFireRateMult() {
    const stack = this.getUpgradeStack('fire_rate');
    return Math.max(0.4, 1 - stack * 0.1);
  }

  getPierceCount() {
    const base = this.special === 'pierce_basic' ? 1 : 0;
    return base + this.getUpgradeStack('pierce');
  }

  hasExplosive() {
    return this.hasUpgrade('explosive');
  }

  getKnifeDamage() {
    return 2 + this.getUpgradeStack('knife_damage');
  }

  getAmmoMult() {
    const stack = this.getUpgradeStack('ammo_up');
    return 1 + stack * 0.25;
  }

  getSpreadMult() {
    const stack = this.getUpgradeStack('spread_down');
    return Math.max(0.3, 1 - stack * 0.1);
  }

  applyPetSynergies() {
    this.activeSynergies = [];
    const ids = this.pets.map(p => p.id);
    for (const pet of this.pets) {
      pet._synergyDamage = 0;
      pet._synergyHP = 0;
      pet._synergyAtkSpdMult = 1;
      pet._synergyRespawnMult = 1;
      pet._synergySpeedMult = 1;
      pet._synergyFirstHitBonus = 0;
      pet._synergyBurn = 0;
      pet._synergyAtkRangeMult = 1;
      pet._firstHit = true;
    }
    for (const syn of PET_SYNERGIES) {
      if (syn.ids.every(id => ids.includes(id))) {
        this.activeSynergies.push(syn);
        for (const pet of this.pets) {
          if (!syn.ids.includes(pet.id)) continue;
          switch (syn.bonus.type) {
            case 'damage': pet._synergyDamage += syn.bonus.value; break;
            case 'pet_hp': pet._synergyHP += syn.bonus.value; break;
            case 'speed': pet._synergySpeedMult *= (1 + syn.bonus.value); break;
            case 'attack_speed': pet._synergyAtkSpdMult *= (1 - syn.bonus.value); break;
            case 'respawn': pet._synergyRespawnMult *= (1 - syn.bonus.value); break;
            case 'ambush': pet._synergyFirstHitBonus += syn.bonus.value; break;
            case 'burn': pet._synergyBurn = (pet._synergyBurn ?? 0) + syn.bonus.value; break;
            case 'detection': pet._synergyAtkRangeMult = (pet._synergyAtkRangeMult ?? 1) * (1 + syn.bonus.value); break;
          }
        }
      }
    }
  }
}
