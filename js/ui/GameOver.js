import { DUNGEONS } from '../utils/constants.js';

export class GameOver {
  constructor(game) {
    this.game = game;
    this.element = null;
  }

  show() {
    this.hide();
    const stats = this.game;
    const dungeon = DUNGEONS.find(d => d.id === stats.selectedDungeon);

    const el = document.createElement('div');
    el.className = 'gameover-screen';
    el.id = 'gameover-screen';
    el.innerHTML = `
      <h1>HAS MUERTO</h1>
      <div class="gameover-stats">
        Mazmorra: <span>${dungeon?.name ?? '—'}</span><br>
        Piso alcanzado: <span>${stats.currentFloor}</span><br>
        Enemigos eliminados: <span>${stats.kills}</span><br>
        Nivel alcanzado: <span>${stats.player?.level ?? 1}</span><br>
        Monedas obtenidas: <span>🪙 ${stats.coins}</span>
      </div>
      <button class="menu-btn" id="btn-retry">VOLVER A INTENTARLO</button>
      <button class="menu-btn" id="btn-menu">MENÚ PRINCIPAL</button>
    `;
    document.getElementById('ui-overlay').appendChild(el);
    this.element = el;

    document.getElementById('btn-retry').onclick = () => {
      this.hide();
      if (stats.selectedCharacter && stats.selectedDungeon) {
        stats.startRun(stats.selectedDungeon, stats.selectedCharacter);
      } else {
        stats.returnToMenu();
      }
    };

    document.getElementById('btn-menu').onclick = () => {
      stats.returnToMenu();
    };
  }

  hide() {
    this.element?.remove();
    this.element = null;
  }
}
