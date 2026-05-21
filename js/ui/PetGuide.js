import { PET_TEMPLATES, PET_SYNERGIES } from '../utils/constants.js';

export class PetGuide {
  constructor(game) {
    this.game = game;
    this.element = null;
  }

  show() {
    this.hide();
    const el = document.createElement('div');
    el.className = 'menu-screen';
    el.id = 'menu-pet-guide';

    const sortedPets = Object.entries(PET_TEMPLATES).sort((a, b) => a[1].cost - b[1].cost);

    let html = `<h2>🐾 GUÍA DE MASCOTAS</h2>`;
    html += `<div style="color:#888;font-size:0.75rem;margin-bottom:1rem;letter-spacing:1px;">Conocé tus compañeros y sus sinergias</div>`;

    html += `<div style="display:flex;gap:1rem;flex-wrap:wrap;justify-content:center;max-width:800px;margin:0 auto;">`;
    html += `<div style="flex:1;min-width:280px;max-width:400px;">`;
    html += `<div style="color:#aaa;font-size:0.85rem;margin-bottom:0.5rem;border-bottom:1px solid #333;padding-bottom:0.3rem;">MASCOTAS</div>`;
    for (const [id, def] of sortedPets) {
      html += `<div style="display:flex;align-items:center;gap:0.5rem;padding:0.4rem 0.5rem;border-bottom:1px solid #1a1a1a;text-align:left;">
        <span style="font-size:1.5rem;">${def.icon}</span>
        <div style="flex:1;">
          <div style="color:#eee;font-size:0.85rem;font-weight:bold;">${def.name}</div>
          <div style="color:#666;font-size:0.65rem;">❤${def.hp} ⚔${def.damage} 👟${def.speed} | ${def.petType === 'melee' ? 'Cuerpo a cuerpo' : 'A distancia'}</div>
        </div>
        <div style="color:#f0c040;font-size:0.7rem;">${def.cost}🪙</div>
      </div>`;
    }
    html += `</div>`;

    html += `<div style="flex:1;min-width:280px;max-width:400px;">`;
    html += `<div style="color:#aaa;font-size:0.85rem;margin-bottom:0.5rem;border-bottom:1px solid #333;padding-bottom:0.3rem;">SINERGIAS (combinaciones de 2)</div>`;
    for (const syn of PET_SYNERGIES) {
      const pet1 = PET_TEMPLATES[syn.ids[0]];
      const pet2 = PET_TEMPLATES[syn.ids[1]];
      html += `<div style="padding:0.5rem;border-bottom:1px solid #1a1a1a;text-align:left;">
        <div style="display:flex;align-items:center;gap:0.4rem;">
          <span>${pet1?.icon ?? '?'}</span>
          <span style="color:#666;font-size:0.7rem;">+</span>
          <span>${pet2?.icon ?? '?'}</span>
          <span style="color:#f0c040;font-size:0.8rem;font-weight:bold;margin-left:0.3rem;">${syn.name}</span>
        </div>
        <div style="color:#888;font-size:0.7rem;margin-top:0.15rem;">${syn.desc}</div>
      </div>`;
    }
    html += `</div>`;
    html += `</div>`;

    html += `<button class="back-btn" id="btn-guide-back" style="margin-top:1.5rem;">VOLVER</button>`;

    el.innerHTML = html;
    document.getElementById('ui-overlay').appendChild(el);
    this.element = el;

    document.getElementById('btn-guide-back').onclick = () => {
      this.hide();
      this.game.menu.refresh();
      this.game.menu.show();
    };
  }

  hide() {
    this.element?.remove();
    this.element = null;
  }
}
