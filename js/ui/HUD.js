import { DUNGEONS } from '../utils/constants.js';

export class HUD {
  constructor(game) {
    this.game = game;
    this.element = null;
  }

  show() {
    this.hide();
    const el = document.createElement('div');
    el.id = 'hud';
    el.innerHTML = `
      <div class="hud-top">
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="hud-health" id="hud-hearts"></div>
          <div class="hud-xp-bar">
            <div class="hud-xp-fill" id="hud-xp-fill" style="width:0%"></div>
          </div>
          <div class="hud-level" id="hud-level">Nv.1</div>
          <div class="hud-coin" id="hud-coins">🪙 0</div>
        </div>
        <button class="hud-pause-btn" id="btn-pause">II</button>
      </div>
      <div class="hud-weapon" id="hud-weapon"></div>
      <div id="hud-room-info" style="position:absolute;top:2rem;left:50%;transform:translateX(-50%);color:#666;font-size:0.7rem;letter-spacing:2px;"></div>
      <div id="hud-pet" style="position:absolute;top:4.2rem;left:50%;transform:translateX(-50%);color:#aaa;font-size:0.7rem;"></div>
      <div id="hud-synergies" style="position:absolute;top:5.5rem;left:50%;transform:translateX(-50%);color:#f0c040;font-size:0.65rem;letter-spacing:1px;display:none;"></div>
      <div id="hud-interact" style="position:absolute;bottom:3.5rem;left:50%;transform:translateX(-50%);color:#f0c040;font-size:0.75rem;letter-spacing:1px;text-shadow:0 0 8px rgba(240,192,64,0.3);display:none;"></div>
    `;
    document.getElementById('ui-overlay').appendChild(el);
    this.element = el;

    document.getElementById('btn-pause').onclick = () => {
      this.game.togglePause();
    };
  }

  hide() {
    this.element?.remove();
    this.element = null;
  }

  update() {
    if (!this.element) return;
    const game = this.game;
    const player = game.player;

    const heartsEl = document.getElementById('hud-hearts');
    if (heartsEl && player) {
      heartsEl.innerHTML = '';
      for (let i = 0; i < player.maxHP; i++) {
        const h = document.createElement('div');
        h.className = `heart ${i >= player.hp ? 'lost' : ''}`;
        heartsEl.appendChild(h);
      }
    }

    const xpFill = document.getElementById('hud-xp-fill');
    if (xpFill && player) {
      const pct = Math.min(100, (player.xp / player.xpToNext) * 100);
      xpFill.style.width = `${pct}%`;
    }

    const levelEl = document.getElementById('hud-level');
    if (levelEl && player) levelEl.textContent = `Nv.${player.level}`;

    const coinsEl = document.getElementById('hud-coins');
    if (coinsEl) coinsEl.textContent = `🪙 ${game.coins}`;

    const weaponEl = document.getElementById('hud-weapon');
    if (weaponEl && player) {
      const w = player.currentWeapon;
      let ammoText = `${w.magAmmo}/${w.magSize}`;
      let reloadText = '';
      if (w.isReloading) {
        const pct = Math.max(0, Math.floor((1 - w.reloadTimer / w.reloadTime) * 100));
        reloadText = ` <span style="color:#f80;font-size:0.65rem;">RECARGANDO ${pct}%</span>`;
      }
      weaponEl.innerHTML = `${w.icon} ${w.name} <span class="hud-ammo">[${ammoText}]</span>${reloadText}`;
      if (player.inventory.length > 1) {
        weaponEl.innerHTML += ` <span style="color:#666;font-size:0.6rem;">[Q: cambiar]</span>`;
      }
    }

    const petEl = document.getElementById('hud-pet');
    if (petEl && player?.pets) {
      const alive = player.getActivePets();
      if (alive.length > 0) {
        const p = alive[0];
        const hpPct = Math.round((p.hp / p.maxHP) * 100);
        const icon = p.icon || '🐾';
        petEl.textContent = `${icon} Nv.${p.level} ${p.name} [${hpPct}%]`;
      } else {
        petEl.textContent = '💀 Mascota caída';
      }
    }

    const roomEl = document.getElementById('hud-room-info');
    if (roomEl && player && game.dungeon) {
      const room = game.dungeon.getCurrentRoom(player.pos.x, player.pos.y);
      const floor = game.currentFloor;
      const dungeonDef = DUNGEONS.find(d => d.id === game.selectedDungeon);
      const dungeonName = dungeonDef?.name ?? '';
      const roomType = room ? (room.type === 'spawn' ? 'SALIDA' : room.type === 'boss' ? 'JEFE' : room.type === 'treasure' ? 'TESORO' : `SALA`) : 'PASILLO';
      roomEl.textContent = `${dungeonName} · Piso ${floor} · ${roomType}`;
    }

    const synEl = document.getElementById('hud-synergies');
    if (synEl && player?.activeSynergies?.length > 0) {
      synEl.textContent = player.activeSynergies.map(s => `${s.desc}`).join(' · ');
      synEl.style.display = 'block';
    } else if (synEl) {
      synEl.style.display = 'none';
    }

    const interactEl = document.getElementById('hud-interact');
    if (interactEl) {
      if (game.interactPrompt) {
        interactEl.textContent = game.interactPrompt.text;
        interactEl.style.display = 'block';
      } else {
        interactEl.style.display = 'none';
      }
    }
  }
}
