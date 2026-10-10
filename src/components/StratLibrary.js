import { sound } from '../audio/soundEngine.js';
import { CHALLENGES } from '../data/challenges.js';

export class StratLibrary {
  constructor(containerEl, onSelectChallenge) {
    this.container = containerEl;
    this.onSelectChallenge = onSelectChallenge;
    this.isOpen = false;
    this.filterTier = 'all';
    this.customChallenges = JSON.parse(localStorage.getItem('r6_custom_challenges') || '[]');
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

  getAllChallenges() {
    return [...CHALLENGES, ...this.customChallenges];
  }

  render() {
    if (!this.isOpen) return;

    let list = this.getAllChallenges();
    if (this.filterTier !== 'all') {
      list = list.filter(c => c.tier === this.filterTier);
    }

    this.container.innerHTML = `
      <div class="strats-modal">
        <div class="strats-backdrop"></div>
        <div class="strats-content">
          <div class="strats-header">
            <div class="strats-title">
              <span class="r6-tag-box">6</span>
              <span>АРХИВ ЕБАНУТЫХ СТРАТОК // CURSED TACTICS CODEX</span>
            </div>
            <button class="strats-close" id="btn-close-strats">✕ ESC</button>
          </div>

          <!-- Filter tier tabs & Add Custom button -->
          <div class="strats-toolbar">
            <div class="tier-tabs">
              <button class="tier-tab-btn ${this.filterTier === 'all' ? 'active' : ''}" data-tier="all">ВСЕ ПРАВИЛА (${list.length})</button>
              <button class="tier-tab-btn ${this.filterTier === 'extreme' ? 'active' : ''}" data-tier="extreme">🔴 ПОЛНЫЙ ПИЗДЕЦ</button>
              <button class="tier-tab-btn ${this.filterTier === 'hard' ? 'active' : ''}" data-tier="hard">🟠 ЖЁСТКИЙ УГАР</button>
              <button class="tier-tab-btn ${this.filterTier === 'soft' ? 'active' : ''}" data-tier="soft">🟡 МЯГКИЙ БРЕД</button>
            </div>
            <button class="hud-btn hud-btn-accent" id="btn-add-custom-rule">
              ➕ СОЗДАТЬ СВОЙ ЧЕЛЛЕНДЖ
            </button>
          </div>

          <!-- Add rule form (toggleable) -->
          <div class="custom-rule-form-wrap" id="custom-rule-form" style="display: none;">
            <div class="custom-form-title">⚡ ДОБАВЛЕНИЕ ПОЛЬЗОВАТЕЛЬСКОГО ПРАВИЛА</div>
            <input type="text" id="custom-rule-title" placeholder="Название челленджа (напр. 'Слепой ниндзя')...">
            <textarea id="custom-rule-desc" rows="2" placeholder="Подробное описание правила и ограничений..."></textarea>
            <div class="form-row">
              <select id="custom-rule-tier">
                <option value="extreme">🔴 ПОЛНЫЙ ПИЗДЕЦ</option>
                <option value="hard">🟠 ЖЁСТКИЙ УГАР</option>
                <option value="soft">🟡 МЯГКИЙ БРЕД</option>
              </select>
              <button class="hud-btn hud-btn-accent" id="btn-save-custom-rule">СОХРАНИТЬ В БАЗУ</button>
              <button class="hud-btn" id="btn-cancel-custom-rule">ОТМЕНА</button>
            </div>
          </div>

          <!-- Challenges list -->
          <div class="strats-list-grid">
            ${list.map(c => `
              <div class="strat-card tier-${c.tier}">
                <div class="strat-card-header">
                  <div class="strat-tier-pill">${c.tierName}</div>
                  <div class="strat-xp">+${c.xp} XP</div>
                </div>
                <div class="strat-card-title">${c.title}</div>
                <div class="strat-card-desc">${c.desc}</div>
                <button class="strat-pick-btn" data-id="${c.id}">АКТИВИРОВАТЬ ЭТО ПРАВИЛО</button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    this.container.querySelector('#btn-close-strats')?.addEventListener('click', () => this.close());
    this.container.querySelector('.strats-backdrop')?.addEventListener('click', () => this.close());

    // Tier filters
    this.container.querySelectorAll('.tier-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        sound.playClick();
        this.filterTier = btn.getAttribute('data-tier');
        this.render();
      });
    });

    // Custom rule toggle
    const addBtn = this.container.querySelector('#btn-add-custom-rule');
    const formWrap = this.container.querySelector('#custom-rule-form');
    addBtn?.addEventListener('click', () => {
      sound.playClick();
      formWrap.style.display = formWrap.style.display === 'none' ? 'block' : 'none';
    });

    this.container.querySelector('#btn-cancel-custom-rule')?.addEventListener('click', () => {
      formWrap.style.display = 'none';
    });

    this.container.querySelector('#btn-save-custom-rule')?.addEventListener('click', () => {
      const title = this.container.querySelector('#custom-rule-title').value.trim();
      const desc = this.container.querySelector('#custom-rule-desc').value.trim();
      const tier = this.container.querySelector('#custom-rule-tier').value;

      if (!title || !desc) {
        alert('Заполните название и описание челенджа!');
        return;
      }

      const tierNames = { extreme: 'ПОЛНЫЙ ПИЗДЕЦ', hard: 'ЖЁСТКИЙ УГАР', soft: 'МЯГКИЙ БРЕД' };
      const newChallenge = {
        id: 'custom_' + Date.now(),
        title,
        desc,
        tier,
        tierName: tierNames[tier],
        side: 'all',
        rarity: tier === 'extreme' ? 'blackice' : 'epic',
        xp: 2000
      };

      this.customChallenges.push(newChallenge);
      localStorage.setItem('r6_custom_challenges', JSON.stringify(this.customChallenges));
      sound.playReveal('epic');
      this.render();
    });

    // Select rule
    this.container.querySelectorAll('.strat-pick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const c = this.getAllChallenges().find(item => item.id === id);
        if (c) {
          sound.playClick();
          this.close();
          if (this.onSelectChallenge) this.onSelectChallenge(c);
        }
      });
    });
  }
}
