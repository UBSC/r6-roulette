import { sound } from '../audio/soundEngine.js';
import { rollAlphaPack } from '../data/alphaPackLoot.js';
import confetti from 'canvas-confetti';

export class AlphaPackModal {
  constructor(containerEl, updateCurrenciesCb) {
    this.container = containerEl;
    this.updateCurrencies = updateCurrenciesCb;
    this.isOpen = false;
    this.chance = 12.5; // starting %
    this.isSpinning = false;
    this.openedItem = null;
  }

  open() {
    this.isOpen = true;
    sound.playModeSwitch();
    this.render();
  }

  close() {
    this.isOpen = false;
    this.isSpinning = false;
    this.openedItem = null;
    this.container.innerHTML = '';
    sound.playClick();
  }

  render() {
    if (!this.isOpen) return;

    this.container.innerHTML = `
      <div class="alphapack-modal">
        <div class="alphapack-backdrop"></div>
        <div class="alphapack-content">
          <div class="alphapack-header">
            <div class="alphapack-title">
              <span class="r6-tag-box">6</span>
              <span>ALPHA PACK SIMULATOR // СИМУЛЯТОР АЛЬФА-ПАКА СИДЖА</span>
            </div>
            <button class="alphapack-close" id="btn-close-pack">✕ ESC</button>
          </div>

          <div class="alphapack-body">
            ${this.openedItem ? this.renderLootResult() : this.renderSpinner()}
          </div>
        </div>
      </div>
    `;

    this.container.querySelector('#btn-close-pack')?.addEventListener('click', () => this.close());
    this.container.querySelector('.alphapack-backdrop')?.addEventListener('click', () => this.close());

    if (!this.openedItem) {
      this.container.querySelector('#btn-spin-pack')?.addEventListener('click', () => this.handleSpin());
    } else {
      this.container.querySelector('#btn-pack-again')?.addEventListener('click', () => {
        this.openedItem = null;
        this.render();
      });
    }
  }

  renderSpinner() {
    return `
      <div class="pack-wheel-container">
        <!-- Visual Wheel Pointer -->
        <div class="wheel-pointer">▼</div>

        <!-- Wheel Canvas / SVG -->
        <div class="pack-wheel" id="pack-wheel">
          <div class="wheel-center-hub">
            <div class="hub-icon">🎲</div>
            <div class="hub-percent">${this.chance.toFixed(1)}%</div>
            <div class="hub-label">ШАНС ВЫПАДЕНИЯ</div>
          </div>
        </div>

        <div class="pack-controls">
          <div class="pack-chances-bar">
            <span>ВЕРОЯТНОСТЬ:</span>
            <div class="progress-bar-wrap">
              <div class="progress-fill" style="width: ${Math.min(100, this.chance)}%"></div>
            </div>
            <span class="pct-val">${this.chance.toFixed(1)}%</span>
          </div>

          ${this.missMessage ? `<div style="color:var(--siege-orange); font-family:var(--font-tactical); font-weight:700; text-align:center; margin-bottom:8px;">${this.missMessage}</div>` : ''}

          <button class="hud-btn hud-btn-accent pack-spin-btn" id="btn-spin-pack" ${this.isSpinning ? 'disabled' : ''}>
            <span>⚡ КРУТИТЬ КОЛЕСО ПАКА</span>
          </button>
        </div>
      </div>
    `;
  }

  renderLootResult() {
    const item = this.openedItem;
    const isBlackIce = item.rarity === 'blackice';
    const isLegendary = item.rarity === 'legendary';

    return `
      <div class="loot-reveal-box ${item.rarity} ${isBlackIce ? 'black-ice-anim' : ''}">
        <div class="loot-beam"></div>
        <div class="loot-category-tag" style="color: ${item.color}">${item.rarityLabel}</div>
        <div class="loot-icon-huge">${item.icon}</div>
        <div class="loot-title" style="color: ${item.color}">${item.name}</div>
        <div class="loot-weapon">${item.weapon} // ${item.type}</div>
        <div class="loot-desc">${item.desc}</div>

        <div class="loot-actions">
          <button class="hud-btn hud-btn-accent" id="btn-pack-again">
            <span>🎁 КРУТИТЬ ЕЩЁ РАЗ</span>
          </button>
        </div>
      </div>
    `;
  }

  handleSpin() {
    if (this.isSpinning) return;
    this.isSpinning = true;

    sound.playSpinStart();

    const wheel = this.container.querySelector('#pack-wheel');
    const spinBtn = this.container.querySelector('#btn-spin-pack');
    if (spinBtn) spinBtn.disabled = true;

    // Simulate 3 seconds wheel rotation
    const result = rollAlphaPack(this.chance);
    const rotationDeg = 1440 + Math.random() * 360;

    wheel.style.transition = 'transform 3.2s cubic-bezier(0.15, 0.85, 0.2, 1.0)';
    wheel.style.transform = `rotate(${rotationDeg}deg)`;

    // Audio ticking
    let ticks = 0;
    const tickInterval = setInterval(() => {
      ticks++;
      sound.playReelTick(1.0 + Math.random() * 0.3);
      if (ticks > 25) clearInterval(tickInterval);
    }, 120);

    setTimeout(() => {
      clearInterval(tickInterval);
      this.isSpinning = false;

      if (result.won) {
        // Won pack!
        this.chance = result.newChance;
        this.openedItem = result.item;
        sound.playReveal(result.item.rarity);

        if (this.updateCurrencies) {
          this.updateCurrencies(1200); // add renown
        }

        if (result.item.rarity === 'blackice') {
          confetti({
            particleCount: 120,
            spread: 100,
            origin: { y: 0.5 },
            colors: ['#00F0FF', '#FFFFFF', '#0EA5E9', '#38BDF8']
          });
          sound.speakTactical('ЧИНАЗЕС СЮДААА! ВЫПАЛ БЛЭК АЙС! ТЯГИ БАРХАТНЫЕ!', 'hype');
        } else if (result.item.rarity === 'legendary') {
          sound.speakTactical('Опа, легендарка! Сигма-дроп подъехал!', 'hype');
        } else {
          sound.speakTactical(`Выпало: ${result.item.name}! Ну хоть не дефолт, сойдёт!`, 'announcer');
        }

        this.render();
      } else {
        // Missed! Chance increases
        this.chance = result.newChance;
        sound.playRadioChirp();
        sound.speakTactical('Промах, тюбик! Тапай хомяка дальше!', 'screamer');
        this.missMessage = `❌ ПРОМАХ! Шанс увеличился до ${this.chance.toFixed(1)}%!`;
        this.render();
      }
    }, 3300);
  }
}
