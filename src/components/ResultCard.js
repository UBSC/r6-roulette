import { sound } from '../audio/soundEngine.js';
import { generateRouletteRoll, CURSED_ATTACHMENTS } from '../data/challenges.js';

export class ResultCard {
  constructor(containerEl, onPlayGame) {
    this.container = containerEl;
    this.onPlayGame = onPlayGame;
    this.currentData = null;
  }

  render(data) {
    this.currentData = data;
    const { operator, challenge, attachment, primaryWeapon, secondaryWeapon, gadget } = data;

    const sideBadge = operator.side === 'attacker' 
      ? '<span class="badge-atk">АТАКА // ATTACK</span>' 
      : '<span class="badge-def">ЗАЩИТА // DEFENSE</span>';

    const tierClass = challenge.tier === 'extreme' 
      ? 'tier-extreme' 
      : challenge.tier === 'hard' 
      ? 'tier-hard' 
      : 'tier-soft';

    this.container.innerHTML = `
      <div class="result-hud-card ${tierClass}">
        <div class="result-card-glow"></div>
        
        <!-- Top Bar of Card -->
        <div class="result-card-header">
          <div class="result-card-title-left">
            <span class="hud-corner-bracket"></span>
            <div class="operator-badge-icon">${operator.iconSymbol}</div>
            <div>
              <div class="operator-codename">${operator.name}</div>
              <div class="operator-realname">${operator.realName} // ${operator.unit}</div>
            </div>
          </div>
          <div class="result-card-title-right">
            ${sideBadge}
            <div class="stat-bars">
              <span title="Скорость">⚡ ${'●'.repeat(operator.speed)}${'○'.repeat(3 - operator.speed)}</span>
              <span title="Броня">🛡️ ${'●'.repeat(operator.armor)}${'○'.repeat(3 - operator.armor)}</span>
            </div>
          </div>
        </div>

        <!-- Ability quote -->
        <div class="operator-quote">
          <span class="quote-mark">“</span>${operator.quoteRu}<span class="quote-mark">”</span>
        </div>

        <!-- Loadout row -->
        <div class="loadout-grid">
          <div class="loadout-slot">
            <div class="slot-label">ОСНОВНОЕ ОРУЖИЕ</div>
            <div class="slot-val primary-gun">${primaryWeapon}</div>
            <div class="slot-attachment">⚠️ ОБВЕС: <span>${attachment}</span></div>
          </div>

          <div class="loadout-slot">
            <div class="slot-label">ВТОРИЧКА & ГАДЖЕТ</div>
            <div class="slot-val">${secondaryWeapon}</div>
            <div class="slot-gadget">📦 ${gadget}</div>
          </div>
        </div>

        <!-- THE CURSED CHALLENGE (ЕБАНУТОЕ ПРАВИЛО) -->
        <div class="cursed-challenge-block">
          <div class="challenge-header-bar">
            <div class="challenge-tier-badge ${tierClass}">
              🔥 ${challenge.tierName}
            </div>
            <div class="challenge-xp-badge">+${challenge.xp} XP</div>
          </div>
          
          <div class="challenge-title-text">${challenge.title}</div>
          <div class="challenge-desc-text">${challenge.desc}</div>
        </div>

        <!-- Footer interactive actions -->
        <div class="result-card-actions">
          <button class="hud-btn hud-btn-accent hud-btn-glow" id="btn-play-game" title="Сыграть в полноценном 3D от первого лица!">
            <span>🎮 В 3D БОЙ [ENTER]</span>
          </button>
          <button class="hud-btn" id="btn-reroll-rule" title="Поменять только челендж">
            <span>🔄 ПЕРЕКРУТИТЬ ПРАВИЛО [R]</span>
          </button>
          <button class="hud-btn" id="btn-reroll-gun" title="Поменять пушку">
            <span>🔫 ОБВЕС</span>
          </button>
          <button class="hud-btn" id="btn-voice-announce" title="Озвучить тактическую команду">
            <span>📢 ОЗВУЧИТЬ [T]</span>
          </button>
          <button class="hud-btn" id="btn-copy-discord" title="Скопировать для дискорда/тимы">
            <span>📋 СКОПИРОВАТЬ ДЛЯ СКВАДА</span>
          </button>
        </div>
      </div>
    `;

    // Hook events
    const playBtn = this.container.querySelector('#btn-play-game');
    playBtn?.addEventListener('click', () => {
      sound.playClick();
      if (this.onPlayGame) this.onPlayGame(this.currentData);
    });

    const rerollRuleBtn = this.container.querySelector('#btn-reroll-rule');
    rerollRuleBtn?.addEventListener('click', () => {
      sound.playClick();
      this.rerollRuleOnly();
    });

    const rerollGunBtn = this.container.querySelector('#btn-reroll-gun');
    rerollGunBtn?.addEventListener('click', () => {
      sound.playClick();
      this.rerollGunOnly();
    });

    const voiceBtn = this.container.querySelector('#btn-voice-announce');
    voiceBtn?.addEventListener('click', () => {
      sound.playClick();
      this.speakBriefing();
    });

    const copyBtn = this.container.querySelector('#btn-copy-discord');
    copyBtn?.addEventListener('click', () => {
      sound.playClick();
      this.copyToClipboard(copyBtn);
    });
  }

  rerollRuleOnly() {
    const newRoll = generateRouletteRoll(this.currentData.operator.side);
    this.currentData.challenge = newRoll.challenge;
    this.render(this.currentData);
    sound.playReveal('epic');
  }

  rerollGunOnly() {
    const op = this.currentData.operator;
    this.currentData.primaryWeapon = op.primaries[Math.floor(Math.random() * op.primaries.length)];
    this.currentData.attachment = CURSED_ATTACHMENTS[Math.floor(Math.random() * CURSED_ATTACHMENTS.length)];
    this.render(this.currentData);
    sound.playClick();
  }

  speakBriefing(forceOpVoice = false) {
    if (!this.currentData) return;
    const { operator, challenge } = this.currentData;

    this.voiceClickCount = (this.voiceClickCount || 0) + 1;

    // Alternate or pick operator's personal voice line
    if (forceOpVoice || (this.voiceClickCount % 2 === 0 && operator.cringeVoicelines && operator.cringeVoicelines.length > 0)) {
      const line = operator.cringeVoicelines[Math.floor(Math.random() * operator.cringeVoicelines.length)];
      sound.speakTactical(line, operator.voiceMood || 'announcer');
      return;
    }

    const cringeIntros = [
      `Чиназес сюдааа! На позиции сигма ${operator.name}! Твоя задача на раунд: ${challenge.title}! ${challenge.desc}! Тапай хомяка и погнали разносить чушпанов!`,
      `Опа, пасхалко 1488! На связь вышел ${operator.name}! Зарубись по правилу: ${challenge.title}! ${challenge.desc}! Скуфы в слезах, альтушки на базе!`,
      `ГООООЙДА! Лорд благословил этот пик! Оперативник ${operator.name}! Челлендж раунда: ${challenge.title}! ${challenge.desc}! Поясни за шмот или удали игру!`,
      `Я пердоле який бобр! Выпал ${operator.name}! Твоя тактика: ${challenge.title}! ${challenge.desc}! Мьюинг на максимуме, погнали на плент!`,
      `Скибиди доп доп ес ес! На позиции ${operator.name}! Правило: ${challenge.title}! ${challenge.desc}! Если сольёшь раунд — ты официальный тюбик!`,
      `Осторожно, зафиксирован лютый кринж! Оперативник ${operator.name}! Задача: ${challenge.title}! ${challenge.desc}! Не забудь про бархатные тяги, кефтеме!`,
      `Здорово, омежка! Тебе выпал гигачад ${operator.name}! Правило раунда: ${challenge.title}! ${challenge.desc}! Делай эйс под фонк и беги в тикток!`
    ];

    const chosenIntro = cringeIntros[Math.floor(Math.random() * cringeIntros.length)];
    sound.speakTactical(chosenIntro, 'announcer');
  }

  copyToClipboard(btn) {
    if (!this.currentData) return;
    const { operator, challenge, primaryWeapon, attachment, secondaryWeapon, gadget } = this.currentData;
    const shareText = `🎯 [R6 СТРАТ РУЛЕТКА]
👤 Оперативник: ${operator.name} (${operator.side.toUpperCase()})
🔫 Оружие: ${primaryWeapon} [Обвес: ${attachment}]
📦 Вторичка: ${secondaryWeapon} + ${gadget}
🔥 ЕБАНУТОЕ ПРАВИЛО: ${challenge.title} (${challenge.tierName})
⚠️ ИНСТРУКЦИЯ: ${challenge.desc}`;

    navigator.clipboard.writeText(shareText).then(() => {
      const origText = btn.innerHTML;
      btn.innerHTML = '<span>✅ СКОПИРОВАНО!</span>';
      setTimeout(() => {
        btn.innerHTML = origText;
      }, 2000);
    });
  }
}
