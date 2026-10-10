import { sound } from '../audio/soundEngine.js';
import confetti from 'canvas-confetti';

export class ReelModal {
  constructor(containerEl, onFinishCallback) {
    this.container = containerEl;
    this.onFinish = onFinishCallback;
    this.isSpinning = false;
    this.cardWidth = 190; // width + gap
  }

  spin({ items, winnerIndex, onComplete }) {
    if (this.isSpinning) return;
    this.isSpinning = true;

    sound.playSpinStart();

    // Create modal HTML
    this.container.innerHTML = `
      <div class="reel-overlay">
        <div class="reel-backdrop"></div>
        <div class="reel-box">
          <div class="reel-header">
            <div class="reel-title-tag">
              <span class="r6-tag-box">6</span>
              <span>TACTICAL OPERATIONAL ROLL // TACTICAL DISPATCH</span>
            </div>
            <div class="reel-sub">RANDOMIZING OPERATOR, WEAPONS & CURSED RESTRICTIONS...</div>
          </div>

          <div class="reel-viewport-wrapper">
            <!-- Center Laser Pointer Target Brackets -->
            <div class="reel-pointer-top"></div>
            <div class="reel-pointer-bottom"></div>
            <div class="reel-laser-line"></div>

            <div class="reel-viewport">
              <div class="reel-track" id="reel-track">
                ${items.map((item, idx) => `
                  <div class="reel-card rarity-${item.rarity || 'rare'}" data-index="${idx}">
                    <div class="card-side-tag ${item.side}">${item.side === 'attacker' ? 'ATK' : item.side === 'defender' ? 'DEF' : 'R6'}</div>
                    <div class="card-icon">${item.iconSymbol || '🎯'}</div>
                    <div class="card-name">${item.name}</div>
                    <div class="card-sub">${item.unit || item.tierName || 'SPECIAL FORCES'}</div>
                    <div class="card-rarity-bar"></div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <div class="reel-footer">
            <div class="reel-scanner-text">
              <span class="pulse-dot"></span>
              <span id="reel-status-text">ACQUIRING TARGET PATTERN...</span>
            </div>
          </div>
        </div>
      </div>
    `;

    const track = this.container.querySelector('#reel-track');
    const viewport = this.container.querySelector('.reel-viewport');
    const statusText = this.container.querySelector('#reel-status-text');

    // Calculate exact scroll target to land winner in the exact center of viewport
    const viewportWidth = viewport.offsetWidth || 800;
    const cardCenterOffset = this.cardWidth / 2;
    // Add small random offset inside the winning card (±35px) for natural reel randomness
    const randomCardOffset = (Math.random() - 0.5) * 60;
    const targetTranslateX = -(winnerIndex * this.cardWidth - (viewportWidth / 2 - cardCenterOffset) + randomCardOffset);

    // Audio ticking simulator during spin
    const startTime = performance.now();
    const duration = 4300; // 4.3 seconds
    let lastTickCard = -1;

    // Trigger animation via CSS
    requestAnimationFrame(() => {
      track.style.transition = `transform ${duration}ms cubic-bezier(0.12, 0.85, 0.18, 1.0)`;
      track.style.transform = `translateX(${targetTranslateX}px)`;
    });

    const checkTick = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Current approximate card under cursor
      const currentPos = Math.abs(track.getBoundingClientRect().left - viewport.getBoundingClientRect().left);
      const currentCardIdx = Math.floor(currentPos / this.cardWidth);

      if (currentCardIdx !== lastTickCard && progress < 0.96) {
        lastTickCard = currentCardIdx;
        const pitch = 0.8 + (1 - progress) * 0.4;
        sound.playReelTick(pitch);
      }

      if (progress < 1) {
        requestAnimationFrame(checkTick);
      } else {
        // Spin finished!
        const winner = items[winnerIndex];
        statusText.innerHTML = `TARGET LOCKED: <span style="color:#FF3B30; font-weight:bold;">${winner.name}</span>`;
        sound.playReveal(winner.rarity || 'legendary');

        if (winner.rarity === 'blackice') {
          confetti({
            particleCount: 80,
            spread: 90,
            origin: { y: 0.6 },
            colors: ['#00F0FF', '#FFFFFF', '#0F52BA', '#A5F3FC']
          });
        } else if (winner.rarity === 'legendary') {
          confetti({
            particleCount: 60,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#FFB800', '#FF3B30', '#FFFFFF']
          });
        }

        setTimeout(() => {
          this.close();
          this.isSpinning = false;
          if (onComplete) {
            onComplete(winner);
          } else if (this.onFinish) {
            this.onFinish(winner);
          }
        }, 900);
      }
    };

    requestAnimationFrame(checkTick);
  }

  close() {
    this.container.innerHTML = '';
  }
}
