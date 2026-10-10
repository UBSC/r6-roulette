import { sound } from './audio/soundEngine.js';
import { BackgroundCanvas } from './components/BackgroundCanvas.js';
import { ReelModal } from './components/ReelModal.js';
import { ResultCard } from './components/ResultCard.js';
import { SquadModal } from './components/SquadModal.js';
import { AlphaPackModal } from './components/AlphaPackModal.js';
import { OperatorsGallery } from './components/OperatorsGallery.js';
import { StratLibrary } from './components/StratLibrary.js';
import { ShopModal } from './components/ShopModal.js';
import { FreakZoneModal } from './components/FreakZoneModal.js';
import { BattlePassModal } from './components/BattlePassModal.js';
import { Siege3DGame } from './game3d/Siege3DGame.js';
import { OPERATORS, getRandomOperator } from './data/operators.js';
import { CHALLENGES, generateRouletteRoll, CURSED_ATTACHMENTS } from './data/challenges.js';

class SiegeRouletteApp {
  constructor() {
    this.currentMode = 'core'; // 'core', 'attack', 'defense', 'extreme'
    this.currentMadness = 'all'; // 'all', 'extreme', 'hard', 'soft'
    this.xp = 125;
    this.level = 1;
    this.renown = 25480;
    this.r6Credits = 540;
    this.history = [];
    this.lastResult = null;

    this.initDOM();
    this.initComponents();
    this.initEvents();
    this.updateHUD();
  }

  initDOM() {
    // Canvas
    const canvas = document.getElementById('bg-canvas');
    if (canvas) {
      this.bgCanvas = new BackgroundCanvas(canvas);
    }

    // Slots
    this.reelMount = document.getElementById('reel-mount-point');
    this.modalMount = document.getElementById('modal-mount-point');
    this.briefingSlot = document.getElementById('result-briefing-slot');
  }

  initComponents() {
    this.reelModal = new ReelModal(this.reelMount);
    this.squadModal = new SquadModal(this.modalMount);
    this.alphaPackModal = new AlphaPackModal(this.modalMount, (bonusRenown) => {
      this.renown += bonusRenown;
      this.updateHUD();
    });
    this.operatorsGallery = new OperatorsGallery(this.modalMount, (op) => this.onSelectOperatorFromGallery(op));
    this.stratLibrary = new StratLibrary(this.modalMount, (strat) => this.onSelectStratFromLibrary(strat));
    this.shopModal = new ShopModal(
      this.modalMount,
      () => ({ renown: this.renown, r6Credits: this.r6Credits }),
      (newRenown, newCredits) => {
        this.renown = newRenown;
        this.r6Credits = newCredits;
        this.updateHUD();
      }
    );
    this.freakZoneModal = new FreakZoneModal(
      this.modalMount,
      () => ({ renown: this.renown, r6Credits: this.r6Credits }),
      (newRenown, newCredits) => {
        this.renown = newRenown;
        this.r6Credits = newCredits;
        this.updateHUD();
      }
    );
    this.battlePassModal = new BattlePassModal(
      this.modalMount,
      () => ({ renown: this.renown, r6Credits: this.r6Credits }),
      (newRenown, newCredits) => {
        this.renown = newRenown;
        this.r6Credits = newCredits;
        this.updateHUD();
      }
    );
    this.siegeGame = new Siege3DGame(this.modalMount, (won) => this.onMatchFinish(won));
    this.resultCard = new ResultCard(this.briefingSlot, (data) => this.startInBrowserGame(data));
  }

  initEvents() {
    // Sound on hover over interactive elements
    document.addEventListener('mouseover', (e) => {
      const target = e.target.closest('button, .mode-pill, .playlist-card-outer, .squad-counter-badge');
      if (target) {
        sound.playHover();
      }
    });

    // Top Nav Tabs
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        sound.playClick();
        const tab = btn.getAttribute('data-tab');
        this.switchTab(tab, btn);
      });
    });

    // Sub-navbar mode pills
    document.querySelectorAll('.mode-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        sound.playClick();
        document.querySelectorAll('.mode-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentMode = btn.getAttribute('data-mode');
      });
    });

    // Left/Right bumper buttons for modes
    document.getElementById('btn-lt-mode')?.addEventListener('click', () => this.cycleMode(-1));
    document.getElementById('btn-rt-mode')?.addEventListener('click', () => this.cycleMode(1));

    // Madness tier buttons
    document.querySelectorAll('.madness-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        sound.playClick();
        document.querySelectorAll('.madness-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentMadness = btn.getAttribute('data-madness');
      });
    });

    // Main SPIN Button (Bottom Left Card)
    document.getElementById('btn-main-spin')?.addEventListener('click', () => {
      this.spinRoulette();
    });

    // Squad Panel Triggers
    document.getElementById('btn-open-squad-panel')?.addEventListener('click', () => {
      this.squadModal.open();
    });
    document.getElementById('btn-top-squad')?.addEventListener('click', () => {
      this.squadModal.open();
    });

    // Audio & Voice toggles
    const audioBtn = document.getElementById('btn-toggle-audio');
    audioBtn?.addEventListener('click', () => {
      sound.muted = !sound.muted;
      audioBtn.querySelector('.icon-label').textContent = sound.muted ? 'SFX: OFF' : 'SFX: ON';
      sound.playClick();
    });

    const voiceBtn = document.getElementById('btn-toggle-voice');
    voiceBtn?.addEventListener('click', () => {
      sound.voiceEnabled = !sound.voiceEnabled;
      voiceBtn.querySelector('.icon-label').textContent = sound.voiceEnabled ? '🔊 ГОЛОС' : '🔇 ТИХО';
      sound.playClick();
    });

    // Quest checklist buttons
    document.querySelectorAll('.track-check-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!btn.classList.contains('completed')) {
          btn.classList.add('completed');
          sound.playReveal('epic');
          this.addXP(1000);
          this.renown += 350;
          this.updateHUD();
        }
      });
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      // Enter to start match in browser
      if (e.code === 'Enter' && this.lastResult && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        e.preventDefault();
        this.startInBrowserGame(this.lastResult);
      }
      // Space to spin (if not typing in input)
      if (e.code === 'Space' && !this.siegeGame.isRunning && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        e.preventDefault();
        this.spinRoulette();
      }
      // F2 or Q for squad
      if ((e.code === 'F2' || e.key === 'q' || e.key === 'Q') && !this.siegeGame.isRunning && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        e.preventDefault();
        this.squadModal.open();
      }
      // R to reroll rule only
      if ((e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') && this.lastResult && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        this.resultCard.rerollRuleOnly();
      }
      // T to voice speak
      if ((e.key === 't' || e.key === 'T' || e.key === 'е' || e.key === 'Е') && this.lastResult && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        this.resultCard.speakBriefing();
      }
      // Escape to close modals
      if (e.code === 'Escape') {
        this.squadModal.close();
        this.alphaPackModal.close();
        this.operatorsGallery.close();
        this.stratLibrary.close();
        this.shopModal.close();
        this.freakZoneModal.close();
        this.battlePassModal.close();
        this.siegeGame.close();
      }
    });
  }

  startInBrowserGame(data) {
    if (!data) return;
    sound.playModeSwitch();
    this.siegeGame.start({
      operator: data.operator,
      challenge: data.challenge,
      weaponName: data.primaryWeapon,
      attachment: data.attachment
    });
  }

  onMatchFinish(won) {
    if (won) {
      this.addXP(2500);
      this.renown += 1200;
      this.updateHUD();
    }
  }

  cycleMode(direction) {
    const modes = ['core', 'attack', 'defense', 'extreme'];
    let idx = modes.indexOf(this.currentMode) + direction;
    if (idx < 0) idx = modes.length - 1;
    if (idx >= modes.length) idx = 0;
    this.currentMode = modes[idx];

    document.querySelectorAll('.mode-pill').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-mode') === this.currentMode);
    });
    sound.playModeSwitch();
  }

  switchTab(tab, btn) {
    document.querySelectorAll('.nav-tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    if (tab === 'operators') {
      this.operatorsGallery.open();
    } else if (tab === 'strats') {
      this.stratLibrary.open();
    } else if (tab === 'alphapack') {
      this.alphaPackModal.open();
    } else if (tab === 'squad') {
      this.squadModal.open();
    } else if (tab === 'history') {
      this.showHistoryModal();
    } else if (tab === 'shop') {
      this.shopModal.open();
    } else if (tab === 'freakzone') {
      this.freakZoneModal.open();
    } else if (tab === 'battlepass') {
      this.battlePassModal.open();
    }
  }

  spinRoulette() {
    if (this.reelModal.isSpinning) return;

    // Determine target side from mode
    let targetSide = 'all';
    if (this.currentMode === 'attack') targetSide = 'attacker';
    if (this.currentMode === 'defense') targetSide = 'defender';

    let targetTier = this.currentMadness;
    if (this.currentMode === 'extreme') targetTier = 'extreme';

    // Generate winning roll
    const winningOp = getRandomOperator(targetSide);
    const { challenge, attachment } = generateRouletteRoll(winningOp.side, targetTier);
    const primaryWeapon = winningOp.primaries[Math.floor(Math.random() * winningOp.primaries.length)];
    const secondaryWeapon = winningOp.secondaries[Math.floor(Math.random() * winningOp.secondaries.length)];
    const gadget = winningOp.gadgets[Math.floor(Math.random() * winningOp.gadgets.length)];

    const winnerData = {
      operator: winningOp,
      challenge,
      attachment,
      primaryWeapon,
      secondaryWeapon,
      gadget
    };

    this.pendingWinner = winnerData;

    // Build 50 reel cards for the reel tape
    const reelItems = [];
    const winnerIndex = 36; // Lands near end of 50-card tape

    for (let i = 0; i < 50; i++) {
      if (i === winnerIndex) {
        reelItems.push({
          name: winningOp.name,
          side: winningOp.side,
          unit: winningOp.unit,
          iconSymbol: winningOp.iconSymbol,
          rarity: challenge.rarity || 'legendary',
          tierName: challenge.tierName
        });
      } else {
        const dummyOp = getRandomOperator('all');
        const dummyRarities = ['rare', 'epic', 'legendary', 'blackice'];
        reelItems.push({
          name: dummyOp.name,
          side: dummyOp.side,
          unit: dummyOp.unit,
          iconSymbol: dummyOp.iconSymbol,
          rarity: dummyRarities[Math.floor(Math.random() * dummyRarities.length)],
          tierName: dummyOp.role
        });
      }
    }

    this.reelModal.spin({
      items: reelItems,
      winnerIndex,
      onComplete: () => {
        this.onReelComplete(this.pendingWinner);
      }
    });
  }

  onReelComplete(winnerData) {
    this.lastResult = winnerData;
    this.history.unshift(winnerData);

    // Update center stage operator visuals
    const stageName = document.getElementById('stage-op-name');
    const stageRole = document.getElementById('stage-op-role');
    const dynamicIcon = document.getElementById('op-dynamic-icon');
    const watermark = document.getElementById('op-watermark');

    if (stageName) stageName.textContent = winnerData.operator.name;
    if (stageRole) stageRole.textContent = `${winnerData.operator.unit} // ${winnerData.operator.side.toUpperCase()} // ${winnerData.operator.role}`;
    if (dynamicIcon) dynamicIcon.textContent = winnerData.operator.iconSymbol;
    if (watermark) watermark.textContent = winnerData.operator.name[0];

    // Render result HUD
    this.resultCard.render(winnerData);

    // Give XP and Renown
    this.addXP(winnerData.challenge.xp || 1500);
    this.renown += 250;
    this.updateHUD();

    // Voice announcement
    setTimeout(() => {
      this.resultCard.speakBriefing();
    }, 400);
  }

  onSelectOperatorFromGallery(op) {
    const { challenge, attachment } = generateRouletteRoll(op.side, this.currentMadness);
    const primaryWeapon = op.primaries[Math.floor(Math.random() * op.primaries.length)];
    const secondaryWeapon = op.secondaries[Math.floor(Math.random() * op.secondaries.length)];
    const gadget = op.gadgets[Math.floor(Math.random() * op.gadgets.length)];

    this.onReelComplete({
      operator: op,
      challenge,
      attachment,
      primaryWeapon,
      secondaryWeapon,
      gadget
    });
  }

  onSelectStratFromLibrary(strat) {
    const op = getRandomOperator(strat.side);
    const attachment = CURSED_ATTACHMENTS[Math.floor(Math.random() * CURSED_ATTACHMENTS.length)];
    const primaryWeapon = op.primaries[Math.floor(Math.random() * op.primaries.length)];
    const secondaryWeapon = op.secondaries[Math.floor(Math.random() * op.secondaries.length)];
    const gadget = op.gadgets[Math.floor(Math.random() * op.gadgets.length)];

    this.onReelComplete({
      operator: op,
      challenge: strat,
      attachment,
      primaryWeapon,
      secondaryWeapon,
      gadget
    });
  }

  addXP(amount) {
    this.xp += amount;
    const xpPerLevel = 500;
    while (this.xp >= xpPerLevel) {
      this.xp -= xpPerLevel;
      this.level += 1;
      sound.playLegendaryFanfare();
    }
  }

  updateHUD() {
    const levelEl = document.getElementById('user-level');
    const nextLevelEl = document.getElementById('next-level-badge');
    const xpFillEl = document.getElementById('xp-bar-fill');
    const xpCounterEl = document.getElementById('xp-counter-text');
    const renownEl = document.getElementById('renown-val');
    const r6CredEl = document.getElementById('r6-credits-val');

    if (levelEl) levelEl.textContent = this.level;
    if (nextLevelEl) nextLevelEl.textContent = this.level + 1;
    if (xpFillEl) xpFillEl.style.width = `${(this.xp / 500) * 100}%`;
    if (xpCounterEl) xpCounterEl.textContent = `${this.xp} / 500 XP`;
    if (renownEl) renownEl.textContent = this.renown.toLocaleString('ru-RU');
    if (r6CredEl) r6CredEl.textContent = this.r6Credits.toLocaleString('ru-RU');
  }

  showHistoryModal() {
    if (this.history.length === 0) {
      alert('📜 История пуста! Сделай свой первый спин рулетки (нажми ПРОБЕЛ).');
      return;
    }

    const html = `
      <div class="strats-modal">
        <div class="strats-backdrop"></div>
        <div class="strats-content">
          <div class="strats-header">
            <div class="strats-title">
              <span class="r6-tag-box">6</span>
              <span>ИСТОРИЯ ВЫПАВШИХ СТРАТОК // MATCH HISTORY (${this.history.length})</span>
            </div>
            <button class="strats-close" id="btn-close-hist">✕ ESC</button>
          </div>
          <div class="strats-list-grid">
            ${this.history.map((h, i) => `
              <div class="strat-card tier-${h.challenge.tier}">
                <div class="strat-card-header">
                  <span class="strat-tier-pill">#${i + 1} ${h.operator.name}</span>
                  <span class="strat-xp">${h.challenge.tierName}</span>
                </div>
                <div class="strat-card-title">${h.challenge.title}</div>
                <div class="strat-card-desc"><b>Пушка:</b> ${h.primaryWeapon} (${h.attachment})<br>${h.challenge.desc}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    this.modalMount.innerHTML = html;
    this.modalMount.querySelector('#btn-close-hist')?.addEventListener('click', () => {
      this.modalMount.innerHTML = '';
    });
    this.modalMount.querySelector('.strats-backdrop')?.addEventListener('click', () => {
      this.modalMount.innerHTML = '';
    });
  }
}

// Boot application
window.addEventListener('DOMContentLoaded', () => {
  new SiegeRouletteApp();
});
