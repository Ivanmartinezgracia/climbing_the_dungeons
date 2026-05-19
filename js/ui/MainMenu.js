import { CHARACTERS, DUNGEONS, PET_TEMPLATES } from '../utils/constants.js';

export class MainMenu {
  constructor(game) {
    this.game = game;
    this.element = null;
  }

  show() {
    this.hide();
    const el = document.createElement('div');
    el.className = 'menu-screen';
    el.id = 'menu-main';
    el.innerHTML = `
      <h1>CLIMBING THE DUNGEON</h1>
      <div class="subtitle">Sube. Sobrevive. Conquista.</div>
      <button class="menu-btn" id="btn-new-game">NUEVA PARTIDA</button>
      <button class="menu-btn" id="btn-char-select">SELECCIONAR PERSONAJE</button>
      <button class="menu-btn" id="btn-dungeon-select">SELECCIONAR MAZMORRA</button>
      <button class="menu-btn" id="btn-pet-shop">🐾 TIENDA DE MASCOTAS</button>
      <button class="menu-btn" id="btn-pet-guide">📖 GUÍA DE MASCOTAS</button>
      <div style="margin-top:1rem;color:#666;font-size:0.8rem;">
        Monedas: <span id="menu-coins" style="color:#f0c040;">${this.game.coins}</span>
      </div>
    `;
    document.getElementById('ui-overlay').appendChild(el);
    this.element = el;

    document.getElementById('btn-new-game').onclick = () => this.startQuickGame();
    document.getElementById('btn-char-select').onclick = () => {
      this.hide();
      this.game.charSelect.show();
    };
    document.getElementById('btn-dungeon-select').onclick = () => {
      this.hide();
      this.game.dungeonSelect.show();
    };
    document.getElementById('btn-pet-shop').onclick = () => {
      this.hide();
      this.showPetShop();
    };
    document.getElementById('btn-pet-guide').onclick = () => {
      this.hide();
      this.game.petGuide.show();
    };
  }

  showPetShop() {
    this.hide();
    const el = document.createElement('div');
    el.className = 'menu-screen';
    el.id = 'menu-pet-shop';
    const unlockedPets = this.game.saveSystem.getUnlockedPets();
    const activePets = this.game.saveSystem.getActivePets();
    const coins = this.game.coins;

    let petsHtml = `<div class="pet-shop-info">Elegí hasta 2 mascotas para llevar a la partida</div>`;
    petsHtml += '<div class="pet-shop-grid">';
    const sortedPets = Object.entries(PET_TEMPLATES).sort((a, b) => a[1].cost - b[1].cost);
    for (const [id, def] of sortedPets) {
      const owned = unlockedPets.includes(id);
      const isActive = activePets.includes(id);
      const canBuy = coins >= def.cost && !owned;
      const activeCount = activePets.length;

      let actionHtml;
      if (owned) {
        if (isActive) {
          actionHtml = `<div class="pet-active-badge pet-toggle" data-pet="${id}">✓ SELECCIONADA</div>`;
        } else {
          const canSelect = activeCount < 2;
          actionHtml = `<div class="pet-select-btn ${canSelect ? '' : 'disabled'}" data-pet="${id}">${canSelect ? 'SELECCIONAR' : 'LLENO'}</div>`;
        }
      } else {
        actionHtml = `<button class="menu-btn pet-buy-btn" data-pet="${id}" ${!canBuy ? 'disabled' : ''}>
          ${canBuy ? `COMPRAR (${def.cost} 🪙)` : (coins < def.cost ? `${def.cost} 🪙` : '---')}
        </button>`;
      }

      petsHtml += `
        <div class="pet-shop-card ${owned ? 'owned' : ''} ${isActive ? 'active' : ''}">
          <div class="pet-shop-icon">${def.icon}</div>
          <div class="pet-shop-name">${def.name}</div>
          <div class="pet-shop-stats">❤${def.hp} ⚔${def.damage} 👟${def.speed}</div>
          <div class="pet-shop-type">${def.petType === 'melee' ? 'Cuerpo a cuerpo' : 'A distancia'}</div>
          ${actionHtml}
        </div>
      `;
    }
    petsHtml += '</div>';

    el.innerHTML = `
      <h2>🐾 TIENDA DE MASCOTAS</h2>
      <div class="pet-shop-coins">Tus monedas: <span style="color:#f0c040;">${coins}</span></div>
      ${petsHtml}
      <button class="back-btn" id="btn-pet-shop-back">GUARDAR Y VOLVER</button>
    `;
    document.getElementById('ui-overlay').appendChild(el);
    this.element = el;

    el.querySelectorAll('.pet-toggle').forEach(el2 => {
      el2.onclick = () => {
        const petId = el2.dataset.pet;
        const active = this.game.saveSystem.getActivePets();
        const idx = active.indexOf(petId);
        if (idx !== -1) {
          active.splice(idx, 1);
          this.game.saveSystem.setActivePets(active);
          this.showPetShop();
        }
      };
    });

    el.querySelectorAll('.pet-select-btn:not(.disabled)').forEach(el2 => {
      el2.onclick = () => {
        const petId = el2.dataset.pet;
        const active = this.game.saveSystem.getActivePets();
        if (active.length < 2 && !active.includes(petId)) {
          active.push(petId);
          this.game.saveSystem.setActivePets(active);
          this.showPetShop();
        }
      };
    });

    el.querySelectorAll('.pet-buy-btn').forEach(btn => {
      btn.onclick = () => {
        const petId = btn.dataset.pet;
        const def = PET_TEMPLATES[petId];
        if (this.game.saveSystem.spendCoins(def.cost)) {
          this.game.saveSystem.unlockPet(petId);
          this.game.coins = this.game.saveSystem.getCoins();
          const active = this.game.saveSystem.getActivePets();
          if (active.length < 2) {
            active.push(petId);
            this.game.saveSystem.setActivePets(active);
          }
          this.showPetShop();
        }
      };
    });

    document.getElementById('btn-pet-shop-back').onclick = () => {
      this.refresh();
      this.show();
    };
  }

  refresh() {
    const span = document.getElementById('menu-coins');
    if (span) span.textContent = this.game.coins;
  }

  hide() {
    this.element?.remove();
    this.element = null;
  }

  startQuickGame() {
    const chars = this.game.saveSystem.getUnlockedChars();
    const dungeons = this.game.saveSystem.getUnlockedDungeons();
    const charDef = CHARACTERS.find(c => c.id === chars[0]);
    const dungeonDef = DUNGEONS.find(d => d.id === dungeons[0]);
    if (charDef && dungeonDef) {
      this.hide();
      this.game.dungeonSelect.hide();
      this.game.charSelect.hide();
      this.game.startRun(dungeonDef.id, charDef);
    }
  }
}
