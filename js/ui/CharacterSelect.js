import { CHARACTERS, WEAPONS } from '../utils/constants.js';

export class CharacterSelect {
  constructor(game) {
    this.game = game;
    this.element = null;
  }

  show() {
    this.hide();
    const el = document.createElement('div');
    el.className = 'menu-screen';
    el.id = 'menu-char';
    el.innerHTML = `
      <h1 style="font-size:1.8rem;">SELECCIONA TU PERSONAJE</h1>
      <div class="char-grid" id="char-grid"></div>
      <button class="menu-btn" id="btn-select-char" disabled>ELEGIR</button>
      <button class="back-btn" id="btn-back-char">Volver</button>
    `;
    document.getElementById('ui-overlay').appendChild(el);
    this.element = el;

    const grid = document.getElementById('char-grid');
    let selectedId = null;

    for (const char of CHARACTERS) {
      const card = document.createElement('div');
      card.className = 'char-card';
      const unlocked = this.game.saveSystem.isCharUnlocked(char.id);

      if (!unlocked && char.cost > 0) card.classList.add('locked');

      card.innerHTML = `
        <div class="char-name" style="color:${char.color}">${char.name}</div>
        <div class="char-desc">${char.desc}</div>
        <div class="char-stats">❤${char.hp} ⚡${char.speed.toFixed(1)} ${WEAPONS[char.weaponId]?.icon ?? '🔫'}${WEAPONS[char.weaponId]?.name ?? ''}</div>
        ${unlocked ? '<div class="char-owned">✓ Desbloqueado</div>' : `<div class="char-cost"><button class="menu-btn buy-char-btn" data-char="${char.id}" ${this.game.coins < char.cost ? 'disabled' : ''}>COMPRAR (${char.cost} 🪙)</button></div>`}
      `;

      if (unlocked || char.cost === 0) {
        card.onclick = () => {
          document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          selectedId = char.id;
          document.getElementById('btn-select-char').disabled = false;
        };
      }

      grid.appendChild(card);
    }

    el.querySelectorAll('.buy-char-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const charId = btn.dataset.char;
        const char = CHARACTERS.find(c => c.id === charId);
        if (char && this.game.coins >= char.cost) {
          this.game.saveSystem.spendCoins(char.cost);
          this.game.coins = this.game.saveSystem.getCoins();
          this.game.saveSystem.unlockChar(charId);
          this.show();
          this.game.menu.refresh();
        }
      };
    });

    document.getElementById('btn-select-char').onclick = () => {
      if (selectedId) {
        const char = CHARACTERS.find(c => c.id === selectedId);
        this.game.selectedCharacter = char;
        this.hide();
        this.game.dungeonSelect.show();
      }
    };

    document.getElementById('btn-back-char').onclick = () => {
      this.hide();
      this.game.menu.show();
    };
  }

  hide() {
    this.element?.remove();
    this.element = null;
  }
}
