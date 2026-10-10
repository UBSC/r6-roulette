import { sound } from '../audio/soundEngine.js';
import { OPERATORS, getRandomOperator } from '../data/operators.js';
import { CHALLENGES, SQUAD_ROLES, CURSED_ATTACHMENTS } from '../data/challenges.js';

export class SquadModal {
  constructor(containerEl) {
    this.container = containerEl;
    this.isOpen = false;
    this.squadSide = 'all';
    this.players = ['Я (Капитан)', 'Тиммейт 2', 'Тиммейт 3', 'Тиммейт 4', 'Тиммейт 5'];
    this.squadRoll = null;
  }

  open() {
    this.isOpen = true;
    sound.playModeSwitch();
    if (!this.squadRoll) {
      this.generateSquad();
    } else {
      this.render();
    }
  }

  close() {
    this.isOpen = false;
    this.container.innerHTML = '';
    sound.playClick();
  }

  generateSquad() {
    sound.playSpinStart();
    const side = this.squadSide;
    
    // Pick 5 unique operators
    let pool = [...OPERATORS];
    if (side !== 'all') {
      const target = side === 'defense' ? 'defender' : side;
      pool = pool.filter(op => op.side === target);
    }
    
    // Shuffle pool
    pool.sort(() => Math.random() - 0.5);
    const chosenOps = pool.slice(0, 5);

    // Pick 1 grand team strat
    const grandTeamStrats = [
      'ПАРОВОЗИК В ОДНУ ДВЕРЬ: Вся команда заходит строго друг за другом через один вход!',
      'РУССКИЙ ОРКЕСТР: Все обязаны стрелять одновременно, одиночный огонь карается тимкиллом!',
      'ПОЛ ЭТО ЛАВА ДЛЯ ВСЕХ: Вся команда передвигается исключительно лёжа или на корточках!',
      'ЩИТОВАЯ СТЕНА: Максимальное количество щитов, двигаемся плотной черепахой!',
      'ГЛУХОЙ СТЕЙДЖ: Никто не использует голосовую связь, ориентируемся только на маркеры Z!',
      'СПРИНТ НА 0:02 СЕКУНДЕ: Забежать на плент и поставить пачку за первые 25 секунд раунда!'
    ];
    const teamRule = grandTeamStrats[Math.floor(Math.random() * grandTeamStrats.length)];

    const members = chosenOps.map((op, idx) => {
      const role = SQUAD_ROLES[idx % SQUAD_ROLES.length];
      const primary = op.primaries[Math.floor(Math.random() * op.primaries.length)];
      const attachment = CURSED_ATTACHMENTS[Math.floor(Math.random() * CURSED_ATTACHMENTS.length)];

      return {
        playerName: this.players[idx] || `Боец ${idx + 1}`,
        operator: op,
        roleTitle: role.role,
        roleTask: role.task,
        primary,
        attachment
      };
    });

    this.squadRoll = {
      teamRule,
      members
    };

    setTimeout(() => {
      sound.playReveal('epic');
      this.render();
    }, 400);
  }

  render() {
    if (!this.isOpen) return;

    this.container.innerHTML = `
      <div class="squad-panel-modal">
        <div class="squad-panel-backdrop"></div>
        <div class="squad-panel-content">
          <div class="squad-panel-header">
            <div class="squad-panel-title">
              <span class="r6-tag-box">6</span>
              <span>ФУЛЛ СТАК РУЛЕТКА // SQUAD CHAOS ROSTER (5 ИГРОКОВ)</span>
            </div>
            <button class="squad-close-btn" id="btn-close-squad">✕ ESC</button>
          </div>

          <!-- Controls row -->
          <div class="squad-controls-bar">
            <div class="side-selector">
              <button class="side-btn ${this.squadSide === 'all' ? 'active' : ''}" data-side="all">СЛУЧАЙНО</button>
              <button class="side-btn ${this.squadSide === 'attacker' ? 'active' : ''}" data-side="attacker">АТАКА</button>
              <button class="side-btn ${this.squadSide === 'defense' ? 'active' : ''}" data-side="defense">ЗАЩИТА</button>
            </div>
            <button class="hud-btn hud-btn-accent" id="btn-reroll-squad">
              ⚡ ПЕРЕКРУТИТЬ ВСЮ ПАТИ
            </button>
            <button class="hud-btn" id="btn-copy-squad">
              📋 СКОПИРОВАТЬ ДЛЯ DISCORD
            </button>
          </div>

          <!-- Grand team rule banner -->
          <div class="team-rule-banner">
            <div class="team-rule-tag">🏆 ОБЩАЯ ЕБАНУТАЯ ТАКТИКА НА РАУНД:</div>
            <div class="team-rule-text">${this.squadRoll?.teamRule || ''}</div>
          </div>

          <!-- 5 Players Grid -->
          <div class="squad-grid">
            ${(this.squadRoll?.members || []).map((m, idx) => `
              <div class="squad-player-card">
                <div class="card-player-head">
                  <div class="player-num">#${idx + 1}</div>
                  <div class="player-name">${m.playerName}</div>
                  <div class="player-role-badge">${m.roleTitle}</div>
                </div>
                
                <div class="player-op-hero">
                  <div class="op-symbol">${m.operator.iconSymbol}</div>
                  <div class="op-name-box">
                    <div class="op-name">${m.operator.name}</div>
                    <div class="op-sub">${m.operator.unit} // ${m.operator.side.toUpperCase()}</div>
                  </div>
                </div>

                <div class="player-loadout-brief">
                  <div class="loadout-line"><b>🔫 Оружие:</b> ${m.primary}</div>
                  <div class="loadout-line"><b>⚠️ Обвес:</b> ${m.attachment}</div>
                  <div class="loadout-task"><b>🎯 Задача:</b> ${m.roleTask}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    // Handlers
    this.container.querySelector('#btn-close-squad')?.addEventListener('click', () => this.close());
    this.container.querySelector('.squad-panel-backdrop')?.addEventListener('click', () => this.close());

    this.container.querySelectorAll('.side-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        sound.playClick();
        this.squadSide = btn.getAttribute('data-side');
        this.generateSquad();
      });
    });

    this.container.querySelector('#btn-reroll-squad')?.addEventListener('click', () => {
      this.generateSquad();
    });

    const copyBtn = this.container.querySelector('#btn-copy-squad');
    copyBtn?.addEventListener('click', () => {
      this.copySquadText(copyBtn);
    });
  }

  copySquadText(btn) {
    if (!this.squadRoll) return;
    let text = `⚡ [R6 SQUAD STRAT // 5-MAN CHAOS]\n`;
    text += `🔥 ОБЩАЯ СТРАТКА: ${this.squadRoll.teamRule}\n\n`;

    this.squadRoll.members.forEach((m, idx) => {
      text += `Игрок ${idx + 1} [${m.playerName}] -> ${m.operator.name} (${m.roleTitle})\n`;
      text += `  • Пушка: ${m.primary} (${m.attachment})\n`;
      text += `  • Задача: ${m.roleTask}\n\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      const orig = btn.innerHTML;
      btn.innerHTML = '✅ СКОПИРОВАНО!';
      setTimeout(() => btn.innerHTML = orig, 2000);
    });
  }
}
