import { sound } from '../audio/soundEngine.js';
import confetti from 'canvas-confetti';
import { BATTLEPASS_TIERS, UBISOFT_SUPPORT_RESPONSES } from '../data/battlePassData.js';

export class BattlePassModal {
  constructor(mountEl, getCurrenciesCallback, updateCurrenciesCallback) {
    this.mount = mountEl;
    this.getCurrencies = getCurrenciesCallback;
    this.updateCurrencies = updateCurrenciesCallback;

    this.isOpen = false;
    this.isPremium = false;
    this.currentLevel = 7; // Out of 10
    this.claimedItems = new Set(['bp_t1_free', 'bp_t2_free']);

    // Currently inspected item (defaults to Tier 1 Free)
    this.selectedItem = BATTLEPASS_TIERS[0].free;
    this.selectedTierNum = 1;
    this.selectedTrackType = 'free';

    this.activeComplaint = null;
  }

  open() {
    this.isOpen = true;
    sound.playReveal('epic');
    sound.speakTactical('Добро пожаловать в баттлпасс! Приготовьтесь к девяноста девяти процентам чистейшего мусора!', 'announcer');
    this.render();
  }

  close() {
    this.isOpen = false;
    this.mount.innerHTML = '';
    sound.playClick();
  }

  render() {
    if (!this.isOpen) return;

    const currencies = this.getCurrencies ? this.getCurrencies() : { renown: 25000, r6Credits: 540 };

    this.mount.innerHTML = `
      <div class="bp-modal" id="bp-modal">
        <div class="bp-backdrop" id="bp-backdrop"></div>
        <div class="bp-content">
          <!-- Top Header -->
          <div class="bp-header">
            <div class="bp-header-left">
              <span class="bp-star-badge">⭐</span>
              <div>
                <div class="bp-title-main">СКУФ-ПАСС // OPERATION DUNG BEETLE</div>
                <div class="bp-title-sub">СЕЗОН 4: «ПОЛНАЯ ХУЕТА» • ТАКТИЧЕСКИЙ ГРИНД МУСОРА</div>
              </div>
            </div>

            <!-- Level & Premium Status -->
            <div class="bp-status-cluster">
              <div class="bp-level-badge">
                <span class="lvl-label">УРОВЕНЬ:</span>
                <span class="lvl-val">${this.currentLevel} / 10</span>
              </div>
              <div class="bp-premium-tag ${this.isPremium ? 'premium-active' : ''}">
                ${this.isPremium ? '🌟 ПРЕМИУМ-СКУФ' : '🔒 НИЩИЙ ЧУШПАН (БЕСПЛАТНЫЙ)'}
              </div>
            </div>

            <!-- Balances & Actions -->
            <div class="bp-header-actions">
              ${!this.isPremium ? `
                <button class="bp-buy-premium-btn" id="btn-buy-bp-premium">
                  🌟 КУПИТЬ ПРЕМИУМ (1200 CREDITS)
                </button>
              ` : `
                <div class="bp-premium-owned-badge">✅ ПРЕМИУМ АКТИВЕН</div>
              `}
              <button class="bp-complaint-btn" id="btn-open-complaint" title="Пожаловаться в Ubisoft">
                🤬 ПОЖАЛОВАТЬСЯ В UBISOFT
              </button>
              <button class="bp-close-btn" id="btn-close-bp" title="Закрыть">✕</button>
            </div>
          </div>

          <!-- Main Body: Split between Track and Inspector -->
          <div class="bp-body-grid">
            <!-- Left: Tier Progression Track -->
            <div class="bp-track-column">
              <div class="bp-track-scroll-header">
                <span>ТРЕК НАГРАД (ВЫБЕРИТЕ ПРЕДМЕТ ДЛЯ ОСМОТРА):</span>
                <span style="color:#F59E0B">КЛИКАЙТЕ ДЛЯ ОЗВУЧКИ</span>
              </div>
              <div class="bp-tiers-scroll" id="bp-tiers-scroll">
                ${this.renderTiersTrack()}
              </div>
            </div>

            <!-- Right: Trash Inspector Podium -->
            <div class="bp-inspector-column">
              ${this.renderInspectorPodium()}
            </div>
          </div>

          <!-- Complaint Dialog Overlay (if active) -->
          ${this.activeComplaint ? this.renderComplaintOverlay() : ''}
        </div>
      </div>
    `;

    this.bindEvents();
  }

  renderTiersTrack() {
    return BATTLEPASS_TIERS.map(t => {
      const isUnlocked = this.currentLevel >= t.tier;
      const freeClaimed = this.claimedItems.has(t.free.id);
      const premClaimed = this.claimedItems.has(t.premium.id);
      const isSelectedFree = this.selectedItem?.id === t.free.id;
      const isSelectedPrem = this.selectedItem?.id === t.premium.id;

      return `
        <div class="bp-tier-card ${isUnlocked ? 'tier-unlocked' : 'tier-locked'} ${t.tier === 10 ? 'final-tier' : ''}">
          <div class="tier-number-banner">
            <span>ТИР ${t.tier}</span>
            ${t.tier === 10 ? '<span class="final-glow">ФИНАЛ</span>' : ''}
          </div>

          <!-- Free Row -->
          <div class="bp-reward-slot slot-free ${isSelectedFree ? 'slot-selected' : ''}" 
               data-tier="${t.tier}" data-track="free">
            <div class="slot-badge-track">FREE</div>
            <div class="slot-icon">${t.free.icon}</div>
            <div class="slot-info">
              <div class="slot-name">${t.free.name}</div>
              <div class="slot-rarity rarity-${t.free.rarity}">${t.free.rarityName}</div>
            </div>
            ${freeClaimed ? '<span class="slot-check">✓</span>' : ''}
          </div>

          <!-- Premium Row -->
          <div class="bp-reward-slot slot-prem ${isSelectedPrem ? 'slot-selected' : ''}" 
               data-tier="${t.tier}" data-track="premium">
            <div class="slot-badge-track prem-badge">PREMIUM</div>
            <div class="slot-icon">${t.premium.icon}</div>
            <div class="slot-info">
              <div class="slot-name">${t.premium.name}</div>
              <div class="slot-rarity rarity-${t.premium.rarity}">${t.premium.rarityName}</div>
            </div>
            ${!this.isPremium ? '<span class="slot-lock">🔒</span>' : (premClaimed ? '<span class="slot-check">✓</span>' : '')}
          </div>
        </div>
      `;
    }).join('');
  }

  renderInspectorPodium() {
    const item = this.selectedItem;
    if (!item) return '';

    const isClaimed = this.claimedItems.has(item.id);
    const canClaim = (this.selectedTrackType === 'free' || this.isPremium) && 
                     (this.currentLevel >= this.selectedTierNum) && !isClaimed;

    return `
      <div class="trash-podium-card rarity-border-${item.rarity}">
        <div class="podium-header">
          <div class="podium-badge">ИНСПЕКТОР МУСОРА // TRASH 3000</div>
          <div class="podium-rarity-pill rarity-${item.rarity}">${item.rarityName}</div>
        </div>

        <!-- Rotating Halo & Big Icon -->
        <div class="podium-halo-stage">
          <div class="halo-ring"></div>
          <span class="podium-icon">${item.icon}</span>
        </div>

        <!-- Name & Type -->
        <div class="podium-title-box">
          <div class="podium-item-name">${item.name}</div>
          <div class="podium-item-type">ТИП ПРЕДМЕТА: ${item.type} // ТИР ${this.selectedTierNum}</div>
        </div>

        <!-- Savage Roast Description -->
        <div class="podium-roast-box">
          <div class="roast-label">🔥 БЕЗЖАЛОСТНАЯ ПРАВДА ОБ ЭТОМ ЛУТЕ:</div>
          <div class="roast-text">«${item.roast}»</div>
        </div>

        <!-- Absurd Trash Stats -->
        <div class="podium-stats-grid">
          <div class="pstat-item">
            <div class="pstat-val">${item.uselessRating}</div>
            <div class="pstat-lbl">УРОВЕНЬ БЕСПОЛЕЗНОСТИ</div>
          </div>
          <div class="pstat-item">
            <div class="pstat-val">${item.timeWasted}</div>
            <div class="pstat-lbl">ПОТРАЧЕНО ВРЕМЕНИ</div>
          </div>
          <div class="pstat-item">
            <div class="pstat-val">${item.blackMarketPrice}</div>
            <div class="pstat-lbl">ЦЕНА НА РЫНКЕ</div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="podium-actions">
          <button class="btn-voice-roast" id="btn-voice-roast">
            🔊 ПОСЛУШАТЬ ПОЯСНЕНИЕ ЗА ЭТУ ХУЕТУ
          </button>

          ${isClaimed ? `
            <button class="btn-claim-trash btn-claimed" disabled>
              ✅ ЭТОТ МУСОР УЖЕ В ВАШЕМ ИНВЕНТАРЕ
            </button>
          ` : (canClaim ? `
            <button class="btn-claim-trash" id="btn-claim-trash">
              🎁 ЗАБРАТЬ ЭТОТ МУСОР (+150 RENOWN)
            </button>
          ` : `
            <button class="btn-claim-trash btn-locked" disabled>
              ${this.selectedTrackType === 'premium' && !this.isPremium ? '🔒 ТРЕБУЕТСЯ ПРЕМИУМ-ПАСС' : '🔒 ДОСТИГНИТЕ НУЖНОГО УРОВНЯ'}
            </button>
          `)}
        </div>
      </div>
    `;
  }

  renderComplaintOverlay() {
    return `
      <div class="complaint-overlay">
        <div class="complaint-letter-card">
          <div class="letter-top">
            <div class="ubisoft-logo-text">UBISOFT MONTREAL // CUSTOMER CARE</div>
            <div class="letter-stamp">ОТКЛОНЕНО</div>
          </div>

          <div class="letter-title">ОФИЦИАЛЬНЫЙ ОТВЕТ НА ВАШУ ЖАЛОБУ:</div>
          <div class="letter-body">${this.activeComplaint}</div>

          <div class="letter-footer">
            <button class="letter-ok-btn" id="btn-close-complaint">
              СПАСИБО, Я ПОНЯЛ, ЧТО Я ЧУШПАН
            </button>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    const root = this.mount;

    // Close
    root.querySelector('#btn-close-bp')?.addEventListener('click', () => this.close());
    root.querySelector('#bp-backdrop')?.addEventListener('click', () => this.close());

    // Slot click: inspect item
    root.querySelectorAll('.bp-reward-slot').forEach(slot => {
      slot.addEventListener('click', () => {
        sound.playClick();
        const tierNum = parseInt(slot.getAttribute('data-tier'), 10);
        const track = slot.getAttribute('data-track');
        const tierData = BATTLEPASS_TIERS.find(t => t.tier === tierNum);
        if (tierData) {
          this.selectedTierNum = tierNum;
          this.selectedTrackType = track;
          this.selectedItem = track === 'free' ? tierData.free : tierData.premium;

          // Auto voice speak on inspect!
          sound.speakTactical(this.selectedItem.voiceRoast, 'zoomer');
          this.render();
        }
      });
    });

    // Voice roast button
    root.querySelector('#btn-voice-roast')?.addEventListener('click', () => {
      if (this.selectedItem) {
        sound.playReveal('common');
        sound.speakTactical(this.selectedItem.voiceRoast, 'zoomer');
      }
    });

    // Claim Trash button
    root.querySelector('#btn-claim-trash')?.addEventListener('click', () => {
      if (!this.selectedItem) return;
      this.claimedItems.add(this.selectedItem.id);

      sound.playReveal('epic');
      confetti({ particleCount: 80, spread: 90 });
      sound.speakTactical('Мусор успешно добавлен в ваш инвентарь! Не забудьте помыть руки!', 'announcer');

      if (this.updateCurrencies && this.getCurrencies) {
        const cur = this.getCurrencies();
        this.updateCurrencies(cur.renown + 150, cur.r6Credits);
      }

      this.render();
    });

    // Buy Premium
    root.querySelector('#btn-buy-bp-premium')?.addEventListener('click', () => {
      const cur = this.getCurrencies ? this.getCurrencies() : { renown: 0, r6Credits: 0 };
      if (cur.r6Credits >= 1200 || true) { // Allow purchase for maximum fun!
        this.isPremium = true;
        sound.playLegendaryFanfare();
        confetti({ particleCount: 200, spread: 140, origin: { y: 0.4 } });
        sound.speakTactical('ГОООЙДА! Премиум баттлпасс активирован! Теперь весь премиальный шлак ваш!', 'hype');

        if (this.updateCurrencies && cur.r6Credits >= 1200) {
          this.updateCurrencies(cur.renown, cur.r6Credits - 1200);
        }
        this.render();
      }
    });

    // Complaint Button
    root.querySelector('#btn-open-complaint')?.addEventListener('click', () => {
      sound.playPneumaticHiss(0.2);
      const resp = UBISOFT_SUPPORT_RESPONSES[Math.floor(Math.random() * UBISOFT_SUPPORT_RESPONSES.length)];
      this.activeComplaint = resp;
      sound.speakTactical(resp, 'announcer');
      this.render();
    });

    // Close complaint
    root.querySelector('#btn-close-complaint')?.addEventListener('click', () => {
      this.activeComplaint = null;
      sound.playClick();
      this.render();
    });
  }
}
