export class Weapon {
  constructor(weaponId, def) {
    this.id = weaponId;
    this.name = def.name;
    this.fireRate = def.fireRate;
    this.baseDamage = def.damage;
    this.bulletSpeed = def.bulletSpeed;
    this.spread = def.spread;
    this.bulletsPerShot = def.bulletsPerShot ?? 1;
    this.icon = def.icon;
    this.explosive = def.explosive ?? false;
    this.inherentPierce = def.pierce ?? 0;
    this.cooldown = 0;

    this.magSize = def.magSize ?? 12;
    this.magAmmo = this.magSize;
    this.reloadTime = def.reloadTime ?? 30;
    this.isReloading = false;
    this.reloadTimer = 0;
  }

  canShoot() {
    if (this.cooldown > 0) return false;
    if (this.isReloading) return false;
    if (this.magAmmo <= 0) return false;
    return true;
  }

  reload() {
    if (this.isReloading) return;
    if (this.magAmmo >= this.magSize) return;
    this.isReloading = true;
    this.reloadTimer = this.reloadTime;
  }

  /** Crea los proyectiles al disparar aplicando daño, crítico, perforación y explosivos */
  createProjectiles(player, camera) {
    if (!this.canShoot()) return [];

    const frMult = player.getFireRateMult();
    this.cooldown = Math.max(2, Math.floor(this.fireRate * frMult));
    this.magAmmo = Math.max(0, this.magAmmo - this.bulletsPerShot);

    if (this.magAmmo <= 0) {
      this.reload();
    }

    const projectiles = [];
    const baseAngle = player.shootFacing;
    const spreadMult = player.getSpreadMult();
    const dmgBonus = player.getWeaponDamageBonus();
    const pierceLeft = player.getPierceCount() + this.inherentPierce;
    const explosive = this.explosive || player.hasExplosive();

    for (let i = 0; i < this.bulletsPerShot; i++) {
      const spreadOffset = (Math.random() - 0.5) * this.spread * spreadMult * 2;
      const angle = baseAngle + spreadOffset;

      let dmg = this.baseDamage + dmgBonus;
      const critChance = player.getUpgradeStack('crit') * 0.1;
      const isCrit = critChance > 0 && Math.random() < critChance;
      if (isCrit) dmg *= 2;

      projectiles.push({
        x: player.pos.x,
        y: player.pos.y,
        vx: Math.cos(angle) * this.bulletSpeed,
        vy: Math.sin(angle) * this.bulletSpeed,
        damage: dmg,
        life: 180,
        size: 3 + player.getUpgradeStack('bullet_size') * 1.5,
        pierceLeft: pierceLeft,
        explosive: explosive,
        isCrit: isCrit,
        hitEnemies: [],
      });
    }

    return projectiles;
  }

  addAmmo(_amount) {
    // reserva infinita — no necesita acumular munición
  }

  update() {
    if (this.cooldown > 0) this.cooldown--;
    if (this.isReloading) {
      this.reloadTimer--;
      if (this.reloadTimer <= 0) {
        this.magAmmo = this.magSize;
        this.isReloading = false;
      }
    }
  }
}
