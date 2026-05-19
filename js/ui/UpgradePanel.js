import { UPGRADE_POOL } from '../utils/constants.js';

export class UpgradePanel {
  constructor(game) {
    this.game = game;
    this.element = null;
  }

  show(player) {
    this.hide();
    const options = this.#getOptions(player);

    const el = document.createElement('div');
    el.className = 'upgrade-panel';
    el.id = 'upgrade-panel';
    el.innerHTML = `
      <h2>↑ NIVEL ${player.level} ↑</h2>
      <p style="color:#666;font-size:0.75rem;margin-bottom:1rem;">Elige una mejora:</p>
      <div class="upgrade-options" id="upgrade-options"></div>
    `;
    document.getElementById('ui-overlay').appendChild(el);
    this.element = el;

    const container = document.getElementById('upgrade-options');

    for (const opt of options) {
      const card = document.createElement('div');
      card.className = 'upgrade-card';
      card.innerHTML = `
        <div class="upgrade-name">${opt.icon} ${opt.name}</div>
        <div class="upgrade-desc">${opt.desc}</div>
      `;
      card.onclick = () => {
        this.game.applyUpgrade(opt.id);
      };
      container.appendChild(card);
    }
  }

  #getOptions(player) {
    const hasPets = (player.pets?.length ?? 0) > 0;
    const available = UPGRADE_POOL.filter(u => {
      if (u.id.startsWith('pet_') && !hasPets) return false;
      if (player.upgrades[u.id] ?? 0 >= u.maxStack) return false;
      if (!u.prereq) return true;
      const prereqs = Array.isArray(u.prereq) ? u.prereq : [u.prereq];
      return prereqs.every(p => player.hasUpgrade(p));
    });

    const shuffled = [...available].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }

  hide() {
    this.element?.remove();
    this.element = null;
  }
}
