import { DUNGEONS, CHARACTERS } from '../utils/constants.js';

export class DungeonSelect {
  constructor(game) {
    this.game = game;
    this.element = null;
  }

  show() {
    this.hide();
    const el = document.createElement('div');
    el.className = 'menu-screen';
    el.id = 'menu-dungeon';
    el.innerHTML = `
      <h1 style="font-size:1.8rem;">SELECCIONA MAZMORRA</h1>
      <div class="dungeon-grid" id="dungeon-grid"></div>
      <button class="menu-btn" id="btn-enter-dungeon" disabled>ENTRAR</button>
      <button class="back-btn" id="btn-back-dungeon">Volver</button>
    `;
    document.getElementById('ui-overlay').appendChild(el);
    this.element = el;

    const grid = document.getElementById('dungeon-grid');
    let selectedId = null;

    for (const dungeon of DUNGEONS) {
      const card = document.createElement('div');
      card.className = 'dungeon-card';
      const unlocked = this.game.saveSystem.isDungeonUnlocked(dungeon.id);

      if (!unlocked) card.classList.add('locked');

      card.innerHTML = `
        <div class="dungeon-name">${dungeon.name}</div>
        <div class="dungeon-theme">Tema: ${dungeon.theme}</div>
        <div class="dungeon-floors">${dungeon.floors} pisos · ×${dungeon.coinMultiplier} monedas</div>
        ${!unlocked ? '<div class="char-cost" style="margin-top:0.3rem;">🔒 Derrota al jefe anterior</div>' : ''}
      `;

      if (unlocked) {
        card.onclick = () => {
          document.querySelectorAll('.dungeon-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          selectedId = dungeon.id;
          document.getElementById('btn-enter-dungeon').disabled = false;
        };
      }

      grid.appendChild(card);
    }

    document.getElementById('btn-enter-dungeon').onclick = () => {
      if (selectedId) {
        const char = this.game.selectedCharacter ?? CHARACTERS.find(c => this.game.saveSystem.isCharUnlocked(c.id));
        if (char) {
          this.hide();
          this.game.startRun(selectedId, char);
        }
      }
    };

    document.getElementById('btn-back-dungeon').onclick = () => {
      this.hide();
      if (this.game.selectedCharacter) {
        this.game.charSelect.show();
      } else {
        this.game.menu.show();
      }
    };
  }

  hide() {
    this.element?.remove();
    this.element = null;
  }
}
