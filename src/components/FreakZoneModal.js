import { sound } from '../audio/soundEngine.js';
import confetti from 'canvas-confetti';
import { TINDER_PROFILES, EPSTEIN_FLIGHT_LOGS, TERMINAL_COMMANDS } from '../data/freakZoneData.js';

export class FreakZoneModal {
  constructor(mountEl, getCurrenciesCallback, updateCurrenciesCallback) {
    this.mount = mountEl;
    this.getCurrencies = getCurrenciesCallback;
    this.updateCurrencies = updateCurrenciesCallback;

    this.isOpen = false;
    this.currentSubTab = 'tinder'; // 'tinder', 'terminal', 'calculator'

    // Tinder state
    this.profileIndex = 0;
    this.matchedProfile = null;
    this.activeChat = null;

    // Terminal state
    this.terminalHistory = [
      'LOLITA-EXPRESS OS v4.20 // TERMINAL READY.',
      'CONNECTED TO: EPSTEIN_PRIVATE_SATELLITE_09',
      'TYPE "help" OR CLICK BUTTONS BELOW TO ACCESS DECLASSIFIED DOSSIERS.'
    ];
    this.hasHackedRenown = false;

    // Calculator state
    this.calcWeight = 85;
    this.calcHours = 600;
    this.calcSkuf = 50;
    this.calcRank = 'Gold';
    this.calcResult = null;
  }

  open() {
    this.isOpen = true;
    sound.playReveal('epic');
    sound.speakTactical('Добро пожаловать во Фрик-Зону! Держите масло наготове и не теряйте бархатные тяги!', 'hype');
    this.render();
  }

  close() {
    this.isOpen = false;
    this.mount.innerHTML = '';
    sound.playClick();
  }

  render() {
    if (!this.isOpen) return;

    this.mount.innerHTML = `
      <div class="freak-modal" id="freak-modal">
        <div class="freak-backdrop" id="freak-backdrop"></div>
        <div class="freak-content">
          <!-- Modal Header -->
          <div class="freak-header">
            <div class="freak-title-row">
              <span class="freak-fire-icon">🔥</span>
              <div>
                <div class="freak-title-main">ФРИК-ЗОНА // FREAK-ZONE 18+</div>
                <div class="freak-title-sub">СИДЖ-ДАЙВИНЧИК • СЛИВЫ ЭПШТЕЙНА • КАЛЬКУЛЯТОР ДИДДИ</div>
              </div>
            </div>

            <!-- Navigation Sub-tabs -->
            <div class="freak-subtabs">
              <button class="freak-subtab-btn ${this.currentSubTab === 'tinder' ? 'active' : ''}" data-subtab="tinder">
                <span>💘 СИДЖ-ДАЙВИНЧИК</span>
              </button>
              <button class="freak-subtab-btn ${this.currentSubTab === 'terminal' ? 'active' : ''}" data-subtab="terminal">
                <span>🕵️ ТЕРМИНАЛ ЭПШТЕЙНА</span>
              </button>
              <button class="freak-subtab-btn ${this.currentSubTab === 'calculator' ? 'active' : ''}" data-subtab="calculator">
                <span>🛢️ DIDDY-КАЛЬКУЛЯТОР</span>
              </button>
            </div>

            <button class="freak-close-btn" id="btn-close-freak" title="Закрыть">✕</button>
          </div>

          <!-- Body View Container -->
          <div class="freak-body-view" id="freak-body-view">
            ${this.renderActiveSubTab()}
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  renderActiveSubTab() {
    if (this.currentSubTab === 'tinder') {
      return this.renderTinderView();
    } else if (this.currentSubTab === 'terminal') {
      return this.renderTerminalView();
    } else if (this.currentSubTab === 'calculator') {
      return this.renderCalculatorView();
    }
    return '';
  }

  // =========================================================================
  // 1. TINDER DATING SUB-TAB
  // =========================================================================
  renderTinderView() {
    if (this.activeChat) {
      return this.renderChatMessenger(this.activeChat);
    }

    const p = TINDER_PROFILES[this.profileIndex % TINDER_PROFILES.length];

    return `
      <div class="tinder-container">
        <!-- Tinder Card -->
        <div class="tinder-card" id="tinder-active-card">
          <!-- Top Hero Card Header -->
          <div class="tinder-card-hero" style="border-top: 4px solid ${p.badgeColor}">
            <div class="tinder-avatar-halo" style="background: ${p.badgeColor}22">
              <span class="tinder-avatar-icon">${p.avatar}</span>
            </div>
            <div class="tinder-hero-info">
              <div class="tinder-name-row">
                <span class="tinder-name">${p.name}</span>
                <span class="tinder-age">, ${p.age}</span>
                ${p.verified ? '<span class="tinder-verified-badge" title="Верифицирован White Party">✓</span>' : ''}
              </div>
              <div class="tinder-role">${p.role}</div>
              <div class="tinder-rank-badge" style="border-color: ${p.badgeColor}; color: ${p.badgeColor}">
                🎖️ ${p.rank}
              </div>
            </div>
          </div>

          <!-- Bio & Details -->
          <div class="tinder-card-body">
            <div class="tinder-bio-section">
              <div class="tinder-section-title">О СЕБЕ // BIO:</div>
              <p class="tinder-bio-text">${p.bio}</p>
            </div>

            <!-- Tags -->
            <div class="tinder-tags-row">
              ${p.tags.map(t => `<span class="tinder-tag">${t}</span>`).join('')}
            </div>

            <!-- Red Flags -->
            <div class="tinder-flags-section">
              <div class="tinder-flags-title">🚩 КРАСНЫЕ ФЛАГИ (RED FLAGS):</div>
              <div class="tinder-flags-list">
                ${p.redFlags.map(rf => `<div class="tinder-flag-item"><span class="flag-icon">🚩</span> ${rf}</div>`).join('')}
              </div>
            </div>

            <!-- Pickup Line -->
            <div class="tinder-pickup-bubble">
              <span class="pickup-quote">💬 «${p.pickupLine}»</span>
            </div>
          </div>

          <!-- Swipe Controls -->
          <div class="tinder-controls-bar">
            <button class="tinder-btn btn-swipe-left" id="btn-tinder-dislike" title="Скип чушпана (влево)">
              <span class="tinder-btn-icon">❌</span>
              <span class="tinder-btn-label">СКИП ТЮБИКА</span>
            </button>

            <button class="tinder-btn btn-super-like" id="btn-tinder-superlike" title="Супер-Гойда">
              <span class="tinder-btn-icon">⭐</span>
              <span class="tinder-btn-label">СУПЕР-ГОЙДА</span>
            </button>

            <button class="tinder-btn btn-swipe-right" id="btn-tinder-like" title="Чиназес / Мэтч (вправо)">
              <span class="tinder-btn-icon">💚</span>
              <span class="tinder-btn-label">ЧИНАЗЕС! МЭТЧ</span>
            </button>
          </div>
        </div>

        <!-- Mini-Deck Side Preview -->
        <div class="tinder-deck-preview">
          <div class="deck-counter-badge">
            АНКЕТА ${this.profileIndex + 1} ИЗ ${TINDER_PROFILES.length}
          </div>
          <div class="deck-tip-box">
            💡 <strong>ЛАЙФХАК:</strong> Свайп вправо [ЧИНАЗЕС] открывает приватный диалог с оператором. За удачный флирт можно получить до <strong>1000 Renown</strong>!
          </div>
        </div>
      </div>
    `;
  }

  renderChatMessenger(profile) {
    return `
      <div class="chat-messenger-box">
        <!-- Chat Header -->
        <div class="chat-header">
          <div class="chat-header-user">
            <span class="chat-avatar">${profile.avatar}</span>
            <div>
              <div class="chat-username">${profile.name} ${profile.verified ? '✓' : ''}</div>
              <div class="chat-status">🟢 В СЕТИ // СКОЛЬЗИТ ПО ПЛЕНТУ</div>
            </div>
          </div>
          <button class="chat-back-btn" id="btn-chat-back">➔ К АНКЕТАМ</button>
        </div>

        <!-- Chat History -->
        <div class="chat-messages-scroll" id="chat-messages-scroll">
          <div class="chat-bubble bot-bubble">
            <div class="bubble-sender">${profile.name}:</div>
            <div class="bubble-text">${profile.chatDialogue.greeting}</div>
          </div>
          <div id="chat-replies-mount"></div>
        </div>

        <!-- Reply Options -->
        <div class="chat-replies-tray" id="chat-replies-tray">
          <div class="replies-prompt">ВЫБЕРИТЕ ВАШ ОТВЕТ:</div>
          <div class="replies-options-grid">
            ${profile.chatDialogue.replies.map((r, idx) => `
              <button class="chat-option-btn" data-reply-idx="${idx}">
                <span class="option-bullet">💬</span>
                <span>${r.text}</span>
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // 2. RETRO CRT HACKER TERMINAL (EPSTEIN & DIDDY LEAKS)
  // =========================================================================
  renderTerminalView() {
    return `
      <div class="terminal-screen-container">
        <!-- CRT Screen -->
        <div class="terminal-crt">
          <div class="crt-scanlines"></div>
          <div class="crt-glow-overlay"></div>

          <!-- Terminal Output Area -->
          <div class="terminal-output" id="terminal-output">
            ${this.terminalHistory.map(line => `<div class="term-line">${line}</div>`).join('')}
          </div>

          <!-- Terminal Prompt Row -->
          <div class="terminal-input-row">
            <span class="term-prompt-symbol">EPSTEIN_NET:~$</span>
            <input type="text" class="term-cli-input" id="term-input" placeholder="Введите команду: logs, diddy, hack, goyda, whoami, clear..." autofocus />
            <button class="term-submit-btn" id="btn-term-submit">ВВОД</button>
          </div>
        </div>

        <!-- Quick Access Hacker Buttons -->
        <div class="terminal-dock-bar">
          <button class="term-quick-btn" data-cmd="logs">📋 БОРТОВЫЕ ЛИСТЫ</button>
          <button class="term-quick-btn" data-cmd="diddy">🛢️ СКЛАД ДИДДИ</button>
          <button class="term-quick-btn" data-cmd="hack">💸 ВЗЛОМАТЬ RENOWN</button>
          <button class="term-quick-btn" data-cmd="goyda">🚨 АВАРИЯ ГОЙДА</button>
          <button class="term-quick-btn" data-cmd="help">❓ СПРАВКА</button>
          <button class="term-quick-btn" data-cmd="clear">🧹 ОЧИСТИТЬ</button>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // 3. DIDDY BABY OIL CALCULATOR
  // =========================================================================
  renderCalculatorView() {
    return `
      <div class="calc-container">
        <div class="calc-panel">
          <div class="calc-header-title">
            <span class="calc-icon">🛢️</span>
            <div>
              <div class="calc-main-title">КАЛЬКУЛЯТОР ДЕТСКОГО МАСЛА P. DIDDY</div>
              <div class="calc-sub-title">ТОЧНЫЙ РАСЧЁТ ОБЪЁМА ДЛЯ ТАКТИЧЕСКОГО СЛАЙДА ПО ПОЛУ СИДЖА</div>
            </div>
          </div>

          <!-- Inputs Grid -->
          <div class="calc-grid">
            <!-- Weight Slider -->
            <div class="calc-input-card">
              <div class="input-label-row">
                <span>ВЕС ОПЕРАТИВНИКА:</span>
                <span class="input-val-badge" id="val-weight">${this.calcWeight} КГ</span>
              </div>
              <input type="range" class="calc-range" id="slider-weight" min="45" max="160" value="${this.calcWeight}" />
              <div class="slider-ticks"><span>45 кг (Эш)</span><span>100 кг (Скуф)</span><span>160 кг (Монтань)</span></div>
            </div>

            <!-- Hours Played Slider -->
            <div class="calc-input-card">
              <div class="input-label-row">
                <span>ЧАСОВ В РАДУГЕ:</span>
                <span class="input-val-badge" id="val-hours">${this.calcHours} ЧАСОВ</span>
              </div>
              <input type="range" class="calc-range" id="slider-hours" min="10" max="4000" step="50" value="${this.calcHours}" />
              <div class="slider-ticks"><span>10 ч (Тюбик)</span><span>1500 ч (Задрот)</span><span>4000 ч (Дед Инсайд)</span></div>
            </div>

            <!-- Skuf Level Slider -->
            <div class="calc-input-card">
              <div class="input-label-row">
                <span>УРОВЕНЬ СКУФНОСТИ:</span>
                <span class="input-val-badge" id="val-skuf">${this.calcSkuf}%</span>
              </div>
              <input type="range" class="calc-range" id="slider-skuf" min="0" max="100" value="${this.calcSkuf}" />
              <div class="slider-ticks"><span>0% (Альтушка)</span><span>50% (Валера)</span><span>100% (Лорд Тачанка)</span></div>
            </div>

            <!-- Rank Select -->
            <div class="calc-input-card">
              <div class="input-label-row">
                <span>ТЕКУЩИЙ РАНГ:</span>
                <span class="input-val-badge" id="val-rank">${this.calcRank}</span>
              </div>
              <select class="calc-select" id="select-rank">
                <option value="Copper" ${this.calcRank === 'Copper' ? 'selected' : ''}>Медь (Тюбик)</option>
                <option value="Bronze" ${this.calcRank === 'Bronze' ? 'selected' : ''}>Бронза (Пивной воин)</option>
                <option value="Silver" ${this.calcRank === 'Silver' ? 'selected' : ''}>Серебро (Нормис)</option>
                <option value="Gold" ${this.calcRank === 'Gold' ? 'selected' : ''}>Золото (Чиназес)</option>
                <option value="Platinum" ${this.calcRank === 'Platinum' ? 'selected' : ''}>Платина (Забивной)</option>
                <option value="Diamond" ${this.calcRank === 'Diamond' ? 'selected' : ''}>Алмаз (Фрик-офф мастер)</option>
                <option value="Champion" ${this.calcRank === 'Champion' ? 'selected' : ''}>Чемпион (1000 банок масла)</option>
              </select>
            </div>
          </div>

          <!-- Action Button -->
          <button class="calc-calculate-btn" id="btn-run-calculation">
            ⚡ РАССЧИТАТЬ ПОТРЕБНОСТЬ В ДЕТСКОМ МАСЛЕ
          </button>

          <!-- Result Mount Area -->
          <div class="calc-result-box" id="calc-result-mount" style="${this.calcResult ? '' : 'display: none;'}">
            ${this.calcResult ? this.renderCalculationResult() : ''}
          </div>
        </div>
      </div>
    `;
  }

  renderCalculationResult() {
    if (!this.calcResult) return '';
    const r = this.calcResult;

    return `
      <div class="calc-result-inner">
        <div class="res-stat-row">
          <div class="res-stat-card">
            <div class="stat-num">${r.bottles}</div>
            <div class="stat-lbl">БАНОК JOHNSON'S BABY</div>
          </div>
          <div class="res-stat-card">
            <div class="stat-num">${r.slideDist} м</div>
            <div class="stat-lbl">ДАЛЬНОСТЬ СКОЛЬЖЕНИЯ</div>
          </div>
          <div class="res-stat-card">
            <div class="stat-num">${r.speed} км/ч</div>
            <div class="stat-lbl">СКОРОСТЬ СЛАЙДА</div>
          </div>
        </div>

        <div class="res-verdict-banner">
          <div class="verdict-title">ВЕРДИКТ P. DIDDY:</div>
          <div class="verdict-text">${r.verdict}</div>
        </div>

        <button class="res-order-btn" id="btn-order-oil">
          🛒 ЗАКАЗАТЬ ПАРТИЮ ЧЕРЕЗ ГОСУСЛУГИ (+300 RENOWN)
        </button>
      </div>
    `;
  }

  // =========================================================================
  // EVENT BINDINGS & LOGIC
  // =========================================================================
  bindEvents() {
    const root = this.mount;

    // Close buttons
    root.querySelector('#btn-close-freak')?.addEventListener('click', () => this.close());
    root.querySelector('#freak-backdrop')?.addEventListener('click', () => this.close());

    // Sub-tab buttons
    root.querySelectorAll('.freak-subtab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        sound.playClick();
        this.currentSubTab = btn.getAttribute('data-subtab');
        this.activeChat = null;
        this.render();
      });
    });

    // 1. Tinder Events
    if (this.currentSubTab === 'tinder' && !this.activeChat) {
      root.querySelector('#btn-tinder-dislike')?.addEventListener('click', () => {
        this.swipeLeft();
      });

      root.querySelector('#btn-tinder-like')?.addEventListener('click', () => {
        this.swipeRight(false);
      });

      root.querySelector('#btn-tinder-superlike')?.addEventListener('click', () => {
        this.swipeRight(true);
      });
    }

    // Chat Messenger Events
    if (this.activeChat) {
      root.querySelector('#btn-chat-back')?.addEventListener('click', () => {
        this.activeChat = null;
        this.profileIndex++;
        this.render();
      });

      root.querySelectorAll('.chat-option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.getAttribute('data-reply-idx'), 10);
          this.handleChatReply(idx);
        });
      });
    }

    // 2. Terminal Events
    if (this.currentSubTab === 'terminal') {
      const input = root.querySelector('#term-input');
      const submit = root.querySelector('#btn-term-submit');

      const executeCmd = () => {
        const cmd = input.value.trim().toLowerCase();
        if (cmd) {
          this.handleTerminalCommand(cmd);
          input.value = '';
        }
      };

      submit?.addEventListener('click', executeCmd);
      input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') executeCmd();
      });

      root.querySelectorAll('.term-quick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const cmd = btn.getAttribute('data-cmd');
          this.handleTerminalCommand(cmd);
        });
      });
    }

    // 3. Calculator Events
    if (this.currentSubTab === 'calculator') {
      const sw = root.querySelector('#slider-weight');
      const sh = root.querySelector('#slider-hours');
      const ss = root.querySelector('#slider-skuf');
      const sr = root.querySelector('#select-rank');

      sw?.addEventListener('input', (e) => {
        this.calcWeight = parseInt(e.target.value, 10);
        root.querySelector('#val-weight').textContent = `${this.calcWeight} КГ`;
      });

      sh?.addEventListener('input', (e) => {
        this.calcHours = parseInt(e.target.value, 10);
        root.querySelector('#val-hours').textContent = `${this.calcHours} ЧАСОВ`;
      });

      ss?.addEventListener('input', (e) => {
        this.calcSkuf = parseInt(e.target.value, 10);
        root.querySelector('#val-skuf').textContent = `${this.calcSkuf}%`;
      });

      sr?.addEventListener('change', (e) => {
        this.calcRank = e.target.value;
        root.querySelector('#val-rank').textContent = this.calcRank;
      });

      root.querySelector('#btn-run-calculation')?.addEventListener('click', () => {
        this.runOilCalculation();
      });

      root.querySelector('#btn-order-oil')?.addEventListener('click', () => {
        sound.playLegendaryFanfare();
        confetti({ particleCount: 120, spread: 100 });
        sound.speakTactical('Заказ на масло оформлен! Скуфы уже грузят бочки в Газель!', 'hype');
        if (this.updateCurrencies && this.getCurrencies) {
          const cur = this.getCurrencies();
          this.updateCurrencies(cur.renown + 300, cur.r6Credits);
        }
        const b = root.querySelector('#btn-order-oil');
        if (b) {
          b.textContent = '✅ ОПЛАЧЕНО! ОЖИДАЙТЕ ГАЗЕЛЬ С МАСЛОМ';
          b.disabled = true;
          b.style.background = '#10B981';
        }
      });
    }
  }

  // Swipe Left (Skip)
  swipeLeft() {
    sound.playPneumaticHiss(0.12);
    const card = this.mount.querySelector('#tinder-active-card');
    if (card) {
      card.classList.add('swipe-out-left');
      setTimeout(() => {
        this.profileIndex++;
        this.render();
      }, 250);
    }
  }

  // Swipe Right (Match!)
  swipeRight(isSuperLike = false) {
    const p = TINDER_PROFILES[this.profileIndex % TINDER_PROFILES.length];
    this.matchedProfile = p;

    sound.playReveal('blackice');
    confetti({ particleCount: 150, spread: 120, origin: { y: 0.5 } });

    const matchShouts = [
      `Чиназес сюдааа! Это мэтч с ${p.name}!`,
      `ГОООЙДА! Твой профиль лайкнул сам ${p.name}!`,
      `Внимание! На линии ${p.name}! Вы подходите друг другу на 100%!`,
      `Супер-мэтч! ${p.name} приглашает тебя на закрытый плент!`
    ];
    const matchLine = matchShouts[Math.floor(Math.random() * matchShouts.length)];
    sound.speakTactical(matchLine, p.voiceMood || 'hype');

    // Show Match Modal Overlay
    const overlay = document.createElement('div');
    overlay.className = 'tinder-match-overlay';
    overlay.innerHTML = `
      <div class="match-popup-card">
        <div class="match-badge-fire">🔥 IT'S A MATCH! 🔥</div>
        <div class="match-sub">ВЫ ПОНРАВИЛИСЬ ДРУГ ДРУГУ!</div>
        <div class="match-avatars-clash">
          <span class="user-av">😎</span>
          <span class="heart-pulse">❤️</span>
          <span class="bot-av">${p.avatar}</span>
        </div>
        <div class="match-name">${p.name}</div>
        <div class="match-quote">«${p.pickupLine}»</div>
        <div class="match-buttons-row">
          <button class="match-chat-btn" id="btn-open-match-chat">💬 НАЧАТЬ ДИАЛОГ В ЛС</button>
          <button class="match-skip-btn" id="btn-skip-match">СЛЕДУЮЩАЯ АНКЕТА</button>
        </div>
      </div>
    `;
    this.mount.querySelector('.freak-content')?.appendChild(overlay);

    overlay.querySelector('#btn-open-match-chat')?.addEventListener('click', () => {
      this.activeChat = p;
      overlay.remove();
      this.render();
    });

    overlay.querySelector('#btn-skip-match')?.addEventListener('click', () => {
      overlay.remove();
      this.profileIndex++;
      this.render();
    });
  }

  handleChatReply(replyIdx) {
    if (!this.activeChat) return;
    const p = this.activeChat;
    const r = p.chatDialogue.replies[replyIdx];
    if (!r) return;

    sound.playClick();

    const scroll = this.mount.querySelector('#chat-messages-scroll');
    const tray = this.mount.querySelector('#chat-replies-tray');

    // Append player message
    const playerMsg = document.createElement('div');
    playerMsg.className = 'chat-bubble user-bubble';
    playerMsg.innerHTML = `<div class="bubble-sender">ВЫ:</div><div class="bubble-text">${r.text}</div>`;
    scroll?.appendChild(playerMsg);

    // Disable reply tray
    if (tray) tray.style.display = 'none';

    // Delay bot response
    setTimeout(() => {
      const botMsg = document.createElement('div');
      botMsg.className = 'chat-bubble bot-bubble';
      botMsg.innerHTML = `<div class="bubble-sender">${p.name}:</div><div class="bubble-text">${r.botResponse}</div>`;
      scroll?.appendChild(botMsg);
      scroll.scrollTop = scroll.scrollHeight;

      sound.playReveal('epic');
      sound.speakTactical(r.botResponse, p.voiceMood || 'hype');

      // Grant rewards
      if (r.reward && this.updateCurrencies && this.getCurrencies) {
        const cur = this.getCurrencies();
        this.updateCurrencies(cur.renown + r.reward, cur.r6Credits);

        const rewardBanner = document.createElement('div');
        rewardBanner.className = 'chat-reward-pill';
        rewardBanner.textContent = `+${r.reward} RENOWN ПОЛУЧЕНО! 💰`;
        scroll?.appendChild(rewardBanner);
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
      }

      // Add "Next Profile" button inside chat
      const nextBtn = document.createElement('button');
      nextBtn.className = 'chat-next-profile-btn';
      nextBtn.textContent = '➔ ИСКАТЬ СЛЕДУЮЩЕГО ПАРТНЁРА В ДАЙВИНЧИКЕ';
      nextBtn.addEventListener('click', () => {
        this.activeChat = null;
        this.profileIndex++;
        this.render();
      });
      scroll?.appendChild(nextBtn);
      scroll.scrollTop = scroll.scrollHeight;
    }, 600);
  }

  // Terminal commands handling
  handleTerminalCommand(cmd) {
    sound.playPneumaticHiss(0.08);

    this.terminalHistory.push(`<span style="color:#38BDF8">EPSTEIN_NET:~$</span> ${cmd}`);

    if (cmd === 'clear') {
      this.terminalHistory = ['TERMINAL CLEARED. READY.'];
    } else if (cmd === 'logs') {
      this.terminalHistory.push('<span style="color:#FBBF24">=== РАССЕКРЕЧЕННЫЕ ПОЛЁТНЫЕ ЛИСТЫ N908JE ===</span>');
      EPSTEIN_FLIGHT_LOGS.forEach(log => {
        this.terminalHistory.push(`
✈️ <strong>${log.flightId}</strong> [${log.date}] - ${log.route}
   • Самолет: ${log.aircraft} | Пилот: ${log.pilot}
   • Пассажиры: <span style="color:#F43F5E">${log.passengers.join(', ')}</span>
   • Заметки спецслужб: ${log.notes}
   • Статус: [${log.classification}]
--------------------------------------------------`);
      });
      sound.speakTactical('Полётные журналы Эпштейна выведены на дисплей. Проверьте список пассажиров!', 'announcer');
    } else if (cmd === 'hack') {
      if (!this.hasHackedRenown) {
        this.hasHackedRenown = true;
        this.terminalHistory.push('<span style="color:#10B981">>>> ВЗЛОМ СЕРВЕРОВ UBISOFT УСПЕШЕН! +1500 RENOWN ЗАЧИСЛЕНО НА БАЛАНС! <<<</span>');
        sound.playLegendaryFanfare();
        confetti({ particleCount: 140, spread: 100 });
        if (this.updateCurrencies && this.getCurrencies) {
          const cur = this.getCurrencies();
          this.updateCurrencies(cur.renown + 1500, cur.r6Credits);
        }
      } else {
        this.terminalHistory.push('<span style="color:#F43F5E">ОШИБКА: Серверы безопасности Ubisoft заблокировали повторный взлом в этой сессии!</span>');
      }
    } else if (TERMINAL_COMMANDS[cmd]) {
      this.terminalHistory.push(TERMINAL_COMMANDS[cmd]);
      if (cmd === 'goyda') {
        sound.playReveal('blackice');
        sound.speakTactical('ГОООЙДА! ТЕРМИНАЛ ВЗОРВАН ПАТРИОТИЗМОМ!', 'screamer');
      }
    } else {
      this.terminalHistory.push(`<span style="color:#F87171">НЕИЗВЕСТНАЯ КОМАНДА: "${cmd}". Введите "help" для списка команд.</span>`);
    }

    const output = this.mount.querySelector('#terminal-output');
    if (output) {
      output.innerHTML = this.terminalHistory.map(l => `<div class="term-line">${l}</div>`).join('');
      output.scrollTop = output.scrollHeight;
    }
  }

  // Calculator logic
  runOilCalculation() {
    sound.playPneumaticHiss(0.18);

    const rankMultipliers = {
      Copper: 1.0, Bronze: 1.25, Silver: 1.5,
      Gold: 2.0, Platinum: 2.8, Diamond: 4.0, Champion: 6.5
    };
    const mult = rankMultipliers[this.calcRank] || 2.0;

    const baseBottles = Math.round((this.calcWeight * 3.2 + this.calcHours * 0.45 + this.calcSkuf * 4.8) * mult / 2.5);
    const slideDist = Math.round((this.calcWeight * 0.4 + this.calcHours * 0.03 + this.calcSkuf * 0.35) * mult);
    const speed = Math.round(24 + (slideDist * 0.8));

    let verdict = '';
    if (baseBottles < 400) {
      verdict = '«ТЮБИК СРЕДНЕЙ РУКИ. На таком запасе масла ты доскользишь максимум от спавна до первой забаррикадированной двери. Рекомендуется поднять вес на сосисках!»';
    } else if (baseBottles < 900) {
      verdict = '«ЧИНАЗЕС КЛАССА ВАЛЕРА. Отличный показатель! Ты сможешь проскользить через весь первый этаж, сбить Монтаня и вылететь через второй этаж прямо на лодку!»';
    } else {
      verdict = '«ПОЛНЫЙ ДИДДИ-МАСТЕР 1488. Твоя кожа будет скользить сквозь стены и текстуры Three.js! Спецслужбы уже выехали с полотенцами!»';
    }

    this.calcResult = {
      bottles: baseBottles,
      slideDist,
      speed,
      verdict
    };

    sound.playReveal('epic');
    sound.speakTactical(verdict, 'hype');

    const mount = this.mount.querySelector('#calc-result-mount');
    if (mount) {
      mount.style.display = 'block';
      mount.innerHTML = this.renderCalculationResult();
      this.bindEvents(); // Re-bind order button
    }
  }
}
