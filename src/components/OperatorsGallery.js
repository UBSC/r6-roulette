import { sound } from '../audio/soundEngine.js';
import { OPERATORS } from '../data/operators.js';

export class OperatorsGallery {
  constructor(containerEl, onSelectOpCallback) {
    this.container = containerEl;
    this.onSelectOp = onSelectOpCallback;
    this.isOpen = false;
    this.filterSide = 'all';
    this.searchQuery = '';
  }

  open() {
    this.isOpen = true;
    sound.playModeSwitch();
    this.render();
  }

  close() {
    this.isOpen = false;
    this.container.innerHTML = '';
    sound.playClick();
  }

  render() {
    if (!this.isOpen) return;

    let filtered = OPERATORS;
    if (this.filterSide !== 'all') {
      const target = this.filterSide === 'defense' ? 'defender' : this.filterSide;
      filtered = filtered.filter(op => op.side === target);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(op => op.name.toLowerCase().includes(q) || op.unit.toLowerCase().includes(q) || op.ability.toLowerCase().includes(q));
    }

    this.container.innerHTML = `
      <div class="gallery-modal">
        <div class="gallery-backdrop"></div>
        <div class="gallery-content">
          <div class="gallery-header">
            <div class="gallery-title">
              <span class="r6-tag-box">6</span>
              <span>OPERATOR ROSTER // РАСПИСАНИЕ ОПЕРАТИВНИКОВ</span>
            </div>
            <button class="gallery-close" id="btn-close-gallery">✕ ESC</button>
          </div>

          <!-- Filter & Search Bar -->
          <div class="gallery-filters">
            <div class="side-selector">
              <button class="side-btn ${this.filterSide === 'all' ? 'active' : ''}" data-side="all">ВСЕ (${OPERATORS.length})</button>
              <button class="side-btn ${this.filterSide === 'attacker' ? 'active' : ''}" data-side="attacker">ШТУРМОТРЯД</button>
              <button class="side-btn ${this.filterSide === 'defense' ? 'active' : ''}" data-side="defense">ЗАЩИТНИКИ</button>
            </div>
            <div class="search-input-wrap">
              <input type="text" id="op-search-input" placeholder="Поиск оперативника, спецназа или гаджета..." value="${this.searchQuery}">
            </div>
          </div>

          <!-- Operators Grid -->
          <div class="op-gallery-grid">
            ${filtered.map(op => `
              <div class="op-grid-card ${op.side}" data-id="${op.id}">
                <div class="op-card-top">
                  <span class="op-side-tag">${op.side === 'attacker' ? 'ATK' : 'DEF'}</span>
                  <span class="op-unit-tag">${op.unit}</span>
                </div>
                
                <div class="op-avatar-circle" style="border-color: ${op.color}">
                  <span>${op.iconSymbol}</span>
                </div>

                <div class="op-grid-name">${op.name}</div>
                <div class="op-grid-ability">${op.ability}</div>

                <div class="op-stats-row">
                  <span>⚡ ${'●'.repeat(op.speed)}${'○'.repeat(3 - op.speed)}</span>
                  <span>🛡️ ${'●'.repeat(op.armor)}${'○'.repeat(3 - op.armor)}</span>
                </div>

                <div class="op-grid-actions">
                  <button class="op-action-select" data-id="${op.id}">ВЫБРАТЬ ДЛЯ РУЛЕТКИ</button>
                  <button class="op-action-voice" data-id="${op.id}" title="Послушать кринж-реплику">🔊</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    this.container.querySelector('#btn-close-gallery')?.addEventListener('click', () => this.close());
    this.container.querySelector('.gallery-backdrop')?.addEventListener('click', () => this.close());

    // Search input
    const searchInput = this.container.querySelector('#op-search-input');
    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      this.render();
      const updatedInput = this.container.querySelector('#op-search-input');
      if (updatedInput) {
        updatedInput.focus();
        updatedInput.setSelectionRange(this.searchQuery.length, this.searchQuery.length);
      }
    });

    // Side filter buttons
    this.container.querySelectorAll('.side-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        sound.playClick();
        this.filterSide = btn.getAttribute('data-side');
        this.render();
      });
    });

    // Action select
    this.container.querySelectorAll('.op-action-select').forEach(btn => {
      btn.addEventListener('click', () => {
        const opId = btn.getAttribute('data-id');
        const op = OPERATORS.find(o => o.id === opId);
        if (op) {
          sound.playClick();
          this.close();
          if (this.onSelectOp) this.onSelectOp(op);
        }
      });
    });

    // Voice button with meme voicelines & mood
    this.container.querySelectorAll('.op-action-voice').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        sound.playClick();
        const opId = btn.getAttribute('data-id');
        const op = OPERATORS.find(o => o.id === opId);
        if (op) {
          const lines = op.cringeVoicelines || [op.quoteRu];
          const line = lines[Math.floor(Math.random() * lines.length)];
          sound.speakTactical(line, op.voiceMood || 'announcer');
        }
      });
    });
  }
}
