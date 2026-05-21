import { DUNGEONS } from '../utils/constants.js';

export class Victory {
  constructor(game) {
    this.game = game;
    this.element = null;
  }

  show() {
    this.hide();
    const stats = this.game;
    const dungeon = DUNGEONS.find(d => d.id === stats.selectedDungeon);

    const el = document.createElement('div');
    el.className = 'victory-screen';
    el.id = 'victory-screen';
    el.innerHTML = `
      <h1>VICTORIA</h1>
      <div class="victory-subtitle">¡Has conquistado ${dungeon?.name ?? 'la mazmorra'}!</div>
      <div class="gameover-stats">
        Mazmorra: <span>${dungeon?.name ?? '—'}</span><br>
        Piso alcanzado: <span>${stats.currentFloor}</span><br>
        Enemigos eliminados: <span>${stats.kills}</span><br>
        Nivel alcanzado: <span>${stats.player?.level ?? 1}</span><br>
        Monedas obtenidas: <span>🪙 ${stats.coins}</span>
      </div>
      <button class="menu-btn" id="btn-victory-menu">MENÚ PRINCIPAL</button>
    `;
    document.getElementById('ui-overlay').appendChild(el);
    this.element = el;

    document.getElementById('btn-victory-menu').onclick = () => {
      stats.returnToMenu();
    };
  }

  hide() {
    this.element?.remove();
    this.element = null;
  }
}
