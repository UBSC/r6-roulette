import { SiegeMap } from './Map.js';
import { getWeaponConfig } from './Weapons.js';
import { Enemy } from './Enemies.js';
import { sound } from '../audio/soundEngine.js';
import confetti from 'canvas-confetti';

export class SiegeGame {
  constructor(containerEl, onGameEndCallback) {
    this.container = containerEl;
    this.onGameEnd = onGameEndCallback;
    this.isRunning = false;
    this.animId = null;

    this.map = null;
    this.player = null;
    this.enemies = [];
    this.bullets = [];
    this.particles = [];
    this.killFeed = [];
    this.activeRule = null;
    this.activeOp = null;

    // Game stats
    this.timeLeft = 150; // 2:30
    this.roundWon = false;
    this.roundLost = false;
    this.defuseProgress = 0;
    this.isDefusing = false;

    // Mouse & input state
    this.keys = {};
    this.mouse = { x: 0, y: 0, isDown: false, isRightDown: false, worldX: 0, worldY: 0 };
    this.camera = { x: 0, y: 0, zoom: 1.0 };
    this.screenTilt = 0;
    this.totalRotatedAngle = 0;
    this.lastAngle = 0;
  }

  start({ operator, challenge, weaponName, attachment }) {
    this.isRunning = true;
    this.activeOp = operator;
    this.activeRule = challenge;
    this.roundWon = false;
    this.roundLost = false;
    this.defuseProgress = 0;
    this.timeLeft = 150;
    this.killFeed = [];

    // Weapon config
    const wpBase = getWeaponConfig(weaponName || operator.primaries[0]);
    this.weapon = {
      ...wpBase,
      currentMag: challenge.id === 'ch_no_bullet_economy' ? 1 : wpBase.magSize,
      reserve: challenge.id === 'ch_no_bullet_economy' ? 0 : wpBase.magSize * 3,
      isReloading: false,
      lastFireTime: 0
    };

    // Initialize Map
    this.map = new SiegeMap();

    // Initialize Player
    const spawn = operator.side === 'defender' ? this.map.defenderSpawn : this.map.attackerSpawn;
    this.player = {
      x: spawn.x,
      y: spawn.y,
      radius: 18,
      angle: 0,
      hp: 100,
      maxHp: 100,
      armor: operator.armor,
      speed: challenge.id === 'ch_lava_crawl' ? 1.4 : operator.speed * 1.5 + 1.2,
      isADS: false,
      recoilOffset: 0
    };

    // Spawn 5 Hostiles
    this.enemies = [
      new Enemy(1250, 350, 'anchor', this.map), // Bomb A
      new Enemy(1250, 850, 'anchor', this.map), // Bomb B
      new Enemy(800, 320, 'roamer', this.map),
      new Enemy(750, 850, 'roamer', this.map),
      new Enemy(450, 400, 'patrol', this.map)
    ];

    this.bullets = [];
    this.particles = [];

    this.mountDOM();
    this.bindEvents();
    sound.playSpinStart();
    sound.speakTactical(`Раунд начался. Оперативник ${operator.name}. Правило: ${challenge.title}. Вперёд!`);

    this.lastFrameTime = performance.now();
    this.gameLoop();

    // Timer interval
    this.timerInterval = setInterval(() => {
      if (this.timeLeft > 0 && !this.roundWon && !this.roundLost) {
        this.timeLeft--;
      } else if (this.timeLeft <= 0 && !this.roundWon) {
        this.onDefeat('ВРЕМЯ ВЫШЛО! РАУНД ПРОИГРАН.');
      }
    }, 1000);
  }

  mountDOM() {
    this.container.innerHTML = `
      <div class="siege-game-overlay">
        <!-- Canvas viewport -->
        <canvas id="game-canvas"></canvas>

        <!-- Tactical HUD Overlay -->
        <div class="game-hud">
          <!-- Top Bar: Timer, Bomb Sites, Cursed Rule -->
          <div class="game-hud-top">
            <div class="hud-bomb-indicators">
              <div class="hud-bomb-site ${this.map.bombSites[0].defused ? 'defused' : ''}">
                <span class="bomb-letter">A</span>
                <span class="bomb-dist" id="dist-a">--m</span>
              </div>
              <div class="hud-round-timer" id="hud-timer">02:30</div>
              <div class="hud-bomb-site ${this.map.bombSites[1].defused ? 'defused' : ''}">
                <span class="bomb-letter">B</span>
                <span class="bomb-dist" id="dist-b">--m</span>
              </div>
            </div>

            <!-- Active Cursed Rule Banner -->
            <div class="active-rule-pill tier-${this.activeRule.tier}">
              <span class="rule-fire">🔥 АКТИВНОЕ ПРАВИЛО:</span>
              <span class="rule-name">${this.activeRule.title}</span>
              <span class="rule-short-desc">(${this.activeRule.desc.substring(0, 65)}...)</span>
            </div>

            <!-- Killfeed (Top Right) -->
            <div class="hud-killfeed" id="hud-killfeed"></div>
          </div>

          <!-- Center Defuse Progress Prompt -->
          <div class="hud-defuse-prompt" id="hud-defuse-prompt" style="display: none;">
            <div class="prompt-text">УДЕРЖИВАЙ [ПРОБЕЛ] ДЛЯ УСТАНОВКИ ДЕФЬЮЗЕРА</div>
            <div class="defuse-bar-wrap">
              <div class="defuse-bar-fill" id="defuse-bar-fill" style="width: 0%;"></div>
            </div>
          </div>

          <!-- Bottom Bar: Health, Armor, Weapon, Ammo -->
          <div class="game-hud-bottom">
            <div class="hud-player-status">
              <div class="hp-bar-wrap">
                <div class="hp-icon">❤️</div>
                <div class="hp-track">
                  <div class="hp-fill" id="hp-fill" style="width: 100%;"></div>
                </div>
                <div class="hp-val" id="hp-val">100 HP</div>
              </div>
              <div class="armor-badge">
                🛡️ БРОНЯ: ${'●'.repeat(this.player.armor)}
              </div>
            </div>

            <div class="hud-weapon-status">
              <div class="weapon-info-row">
                <span class="gun-name">${this.weapon.name}</span>
                <span class="gun-ammo" id="ammo-val">${this.weapon.currentMag} / ${this.weapon.reserve}</span>
              </div>
              <div class="weapon-keys-hint">
                [L-CLICK] ОГОНЬ | [R-CLICK] ПРИЦЕЛ | [R] ПЕРЕЗАРЯДКА | [V] НОЖ | [SPACE] ДЕФЬЮЗ
              </div>
            </div>

            <button class="hud-quit-btn" id="btn-quit-game">✕ СДАТЬСЯ (ESC)</button>
          </div>
        </div>
      </div>
    `;

    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    document.getElementById('btn-quit-game')?.addEventListener('click', () => {
      this.close();
    });
  }

  resizeCanvas() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  bindEvents() {
    this.keydownHandler = (e) => {
      this.keys[e.code] = true;
      if (e.code === 'KeyR') this.reloadWeapon();
      if (e.code === 'KeyV') this.meleeAttack();
      if (e.code === 'Escape') this.close();
    };

    this.keyupHandler = (e) => {
      this.keys[e.code] = false;
    };

    this.mousemoveHandler = (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      // Convert to world coordinates
      this.mouse.worldX = (e.clientX - this.canvas.width / 2) / this.camera.zoom + this.camera.x;
      this.mouse.worldY = (e.clientY - this.canvas.height / 2) / this.camera.zoom + this.camera.y;
    };

    this.mousedownHandler = (e) => {
      if (e.button === 0) this.mouse.isDown = true;
      if (e.button === 2) {
        e.preventDefault();
        // Check rule: Wild West forbids ADS
        if (this.activeRule.id !== 'ch_wild_west_hipfire') {
          this.mouse.isRightDown = true;
          this.player.isADS = true;
        }
      }
    };

    this.mouseupHandler = (e) => {
      if (e.button === 0) this.mouse.isDown = false;
      if (e.button === 2) {
        this.mouse.isRightDown = false;
        this.player.isADS = false;
      }
    };

    this.contextmenuHandler = (e) => e.preventDefault();

    window.addEventListener('keydown', this.keydownHandler);
    window.addEventListener('keyup', this.keyupHandler);
    window.addEventListener('mousemove', this.mousemoveHandler);
    window.addEventListener('mousedown', this.mousedownHandler);
    window.addEventListener('mouseup', this.mouseupHandler);
    window.addEventListener('contextmenu', this.contextmenuHandler);
  }

  unbindEvents() {
    window.removeEventListener('keydown', this.keydownHandler);
    window.removeEventListener('keyup', this.keyupHandler);
    window.removeEventListener('mousemove', this.mousemoveHandler);
    window.removeEventListener('mousedown', this.mousedownHandler);
    window.removeEventListener('mouseup', this.mouseupHandler);
    window.removeEventListener('contextmenu', this.contextmenuHandler);
    clearInterval(this.timerInterval);
  }

  reloadWeapon() {
    if (this.weapon.isReloading || this.weapon.reserve <= 0 || this.weapon.currentMag === this.weapon.magSize) return;
    this.weapon.isReloading = true;
    sound.playPneumaticHiss(0.2);

    setTimeout(() => {
      const needed = this.weapon.magSize - this.weapon.currentMag;
      const taking = Math.min(needed, this.weapon.reserve);
      this.weapon.currentMag += taking;
      this.weapon.reserve -= taking;
      this.weapon.isReloading = false;
      sound.playClick();
      this.updateHUD();
    }, this.weapon.reloadTime);
  }

  meleeAttack() {
    sound.playPneumaticHiss(0.1);
    const reach = 55;
    const hitAngle = this.player.angle;
    const hitX = this.player.x + Math.cos(hitAngle) * reach;
    const hitY = this.player.y + Math.sin(hitAngle) * reach;

    // Check hit on barricades
    for (const b of this.map.barricades) {
      if (!b.destroyed && Math.hypot(hitX - (b.x + b.w / 2), hitY - (b.y + b.h / 2)) < 50) {
        const destroyed = this.map.damageBarricade(b, 40);
        this.spawnDebris(hitX, hitY, '#8D6E63', 12);
        sound.playReveal('common');
        if (destroyed) sound.playReveal('epic');
      }
    }

    // Check hit on enemies (Instant kill knife)
    for (const e of this.enemies) {
      if (!e.isDead && Math.hypot(hitX - e.x, hitY - e.y) < 45) {
        e.takeDamage(150);
        sound.playReveal('blackice');
        this.addKillfeed('🔪 ВЫ [НОЖ]', 'HOSTILE');
        this.spawnBlood(e.x, e.y, 25);
      }
    }
  }

  gameLoop() {
    if (!this.isRunning) return;

    const now = performance.now();
    const dt = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;

    this.update(dt);
    this.render();

    this.animId = requestAnimationFrame(() => this.gameLoop());
  }

  update(dt) {
    if (this.roundWon || this.roundLost) return;

    // Update Player Rotation towards Mouse
    this.mouse.worldX = (this.mouse.x - this.canvas.width / 2) / this.camera.zoom + this.camera.x;
    this.mouse.worldY = (this.mouse.y - this.canvas.height / 2) / this.camera.zoom + this.camera.y;

    const dx = this.mouse.worldX - this.player.x;
    const dy = this.mouse.worldY - this.player.y;
    this.player.angle = Math.atan2(dy, dx);

    // Track 360° Ballet rotation
    const deltaAngle = Math.abs(this.player.angle - this.lastAngle);
    if (deltaAngle < Math.PI) this.totalRotatedAngle += deltaAngle;
    this.lastAngle = this.player.angle;

    // Movement calculation
    let moveX = 0;
    let moveY = 0;

    // RULE: Olympic Sprint -> Player CANNOT stop moving forward!
    if (this.activeRule.id === 'ch_olympic_sprint') {
      moveX += Math.cos(this.player.angle) * 1.8;
      moveY += Math.sin(this.player.angle) * 1.8;
    } else {
      if (this.keys['KeyW']) moveY -= 1;
      if (this.keys['KeyS']) moveY += 1;
      if (this.keys['KeyA']) moveX -= 1;
      if (this.keys['KeyD']) moveX += 1;
    }

    if (moveX !== 0 || moveY !== 0) {
      const len = Math.hypot(moveX, moveY);
      const spd = this.player.speed * (this.player.isADS ? 0.6 : 1.0);
      const stepX = (moveX / len) * spd;
      const stepY = (moveY / len) * spd;

      if (!this.map.checkCollision(this.player.x + stepX, this.player.y, this.player.radius)) {
        this.player.x += stepX;
      }
      if (!this.map.checkCollision(this.player.x, this.player.y + stepY, this.player.radius)) {
        this.player.y += stepY;
      }
    }

    // Leaning Q & E (Rave rule tilts continuously)
    if (this.activeRule.id === 'ch_party_rave') {
      this.screenTilt = Math.sin(performance.now() / 150) * 0.08;
    } else {
      if (this.keys['KeyQ']) this.screenTilt = -0.05;
      else if (this.keys['KeyE']) this.screenTilt = 0.05;
      else this.screenTilt = 0;
    }

    // Camera follow smoothly
    this.camera.x += (this.player.x - this.camera.x) * 0.12;
    this.camera.y += (this.player.y - this.camera.y) * 0.12;
    this.camera.zoom = this.player.isADS ? 1.25 : 1.0;

    // Shooting
    if (this.mouse.isDown && !this.weapon.isReloading) {
      this.tryShoot();
    }

    // Update Bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx;
      b.y += b.vy;

      // Check collision with walls
      if (this.map.checkCollision(b.x, b.y, 4)) {
        // Check damage soft walls
        for (const sw of this.map.softWalls) {
          if (!sw.destroyed && b.x > sw.x && b.x < sw.x + sw.w && b.y > sw.y && b.y < sw.y + sw.h) {
            this.map.damageSoftWall(sw, b.damage);
            this.spawnDebris(b.x, b.y, '#D7CCC8', 4);
          }
        }
        // Check damage barricades
        for (const bar of this.map.barricades) {
          if (!bar.destroyed && b.x > bar.x && b.x < bar.x + bar.w && b.y > bar.y && b.y < bar.y + bar.h) {
            this.map.damageBarricade(bar, b.damage);
            this.spawnDebris(b.x, b.y, '#8D6E63', 6);
          }
        }
        this.bullets.splice(i, 1);
        continue;
      }

      // Check bullet hitting enemies
      if (b.fromPlayer) {
        for (const enemy of this.enemies) {
          if (!enemy.isDead && Math.hypot(b.x - enemy.x, b.y - enemy.y) < enemy.radius + 4) {
            const isHeadshot = Math.hypot(b.x - (enemy.x + Math.cos(enemy.angle) * 8), b.y - (enemy.y + Math.sin(enemy.angle) * 8)) < 10;
            const killed = enemy.takeDamage(b.damage, isHeadshot);

            this.spawnBlood(b.x, b.y, isHeadshot ? 20 : 10);
            this.bullets.splice(i, 1);

            if (killed) {
              sound.playReveal(isHeadshot ? 'blackice' : 'legendary');
              this.addKillfeed(`🎯 ВЫ [${this.weapon.name}${isHeadshot ? ' 💥 HEADSHOT' : ''}]`, 'HOSTILE');
              this.checkAllEnemiesDead();
            }
            break;
          }
        }
      } else {
        // Bullet hitting player
        if (Math.hypot(b.x - this.player.x, b.y - this.player.y) < this.player.radius) {
          this.bullets.splice(i, 1);
          this.playerTakeDamage(b.damage);
        }
      }
    }

    // Update Enemies
    for (const enemy of this.enemies) {
      enemy.update(this.player, dt, this.bullets);
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // Check Bomb Sites defusal
    this.updateBombDefusal();
    this.updateHUD();
  }

  tryShoot() {
    const now = performance.now();
    const interval = 60000 / this.weapon.fireRate;
    if (now - this.weapon.lastFireTime < interval) return;
    if (this.weapon.currentMag <= 0) {
      sound.playClick();
      this.reloadWeapon();
      return;
    }

    // RULE: Pacifist Riot -> Bullets deal ZERO damage!
    const isPacifist = this.activeRule.id === 'ch_pacifist_riot';
    let damage = isPacifist ? 0 : this.weapon.damage;

    // RULE: John Wick -> Headshot multiplier 10x!
    if (this.activeRule.id === 'ch_john_wick') damage *= 1.5;

    this.weapon.currentMag--;
    this.weapon.lastFireTime = now;
    sound.playPneumaticHiss(0.08);

    // Spread calculation
    let spread = this.player.isADS ? this.weapon.spread * 0.4 : this.weapon.spread;
    if (this.activeRule.id === 'ch_wild_west_hipfire') spread *= 3.5;

    const pelletsCount = this.weapon.pellets || 1;
    for (let i = 0; i < pelletsCount; i++) {
      const finalAngle = this.player.angle + (Math.random() - 0.5) * spread;
      this.bullets.push({
        x: this.player.x + Math.cos(this.player.angle) * 25,
        y: this.player.y + Math.sin(this.player.angle) * 25,
        vx: Math.cos(finalAngle) * this.weapon.speed,
        vy: Math.sin(finalAngle) * this.weapon.speed,
        damage,
        fromPlayer: true,
        color: this.weapon.bulletColor
      });
    }

    // Muzzle flash particle
    this.spawnMuzzleFlash(this.player.x + Math.cos(this.player.angle) * 28, this.player.y + Math.sin(this.player.angle) * 28);
  }

  playerTakeDamage(dmg) {
    // Shield blocks front damage
    if (this.activeOp.name === 'MONTAGNE' || this.activeOp.name === 'CLASH') {
      sound.playReveal('epic');
      return; // blocked by shield!
    }

    const armorDmgReduction = 1 - (this.player.armor - 1) * 0.12;
    this.player.hp -= Math.round(dmg * armorDmgReduction);
    this.spawnBlood(this.player.x, this.player.y, 8);
    sound.playReveal('common');

    if (this.player.hp <= 0) {
      this.player.hp = 0;
      this.onDefeat('ВЫ БЫЛИ УНИЧТОЖЕНЫ В БОЮ!');
    }
  }

  updateBombDefusal() {
    const promptEl = document.getElementById('hud-defuse-prompt');
    const fillEl = document.getElementById('defuse-bar-fill');

    let nearSite = null;
    for (const site of this.map.bombSites) {
      if (!site.defused && Math.hypot(this.player.x - site.x, this.player.y - site.y) < site.radius + 30) {
        nearSite = site;
        break;
      }
    }

    if (nearSite) {
      if (promptEl) promptEl.style.display = 'block';
      if (this.keys['Space']) {
        this.defuseProgress += 0.8;
        if (fillEl) fillEl.style.width = `${Math.min(100, this.defuseProgress)}%`;

        if (this.defuseProgress >= 100) {
          nearSite.defused = true;
          sound.playReveal('blackice');
          this.addKillfeed(`💣 БОМБА ${nearSite.id} ОБЕЗВРЕЖЕНА!`, 'SYSTEM');
          this.checkVictoryCondition();
        }
      } else {
        this.defuseProgress = Math.max(0, this.defuseProgress - 1.5);
        if (fillEl) fillEl.style.width = `${this.defuseProgress}%`;
      }
    } else {
      if (promptEl) promptEl.style.display = 'none';
      this.defuseProgress = 0;
    }
  }

  checkAllEnemiesDead() {
    const alive = this.enemies.filter(e => !e.isDead);
    if (alive.length === 0) {
      this.onVictory('ВСЕ ВРАГИ УНИЧТОЖЕНЫ // ЭЙС!');
    }
  }

  checkVictoryCondition() {
    const remainingBombs = this.map.bombSites.filter(b => !b.defused);
    if (remainingBombs.length === 0) {
      this.onVictory('ОБЕ БОМБЫ ОБЕЗВРЕЖЕНЫ // ОПЕРАЦИЯ УСПЕШНА!');
    }
  }

  onVictory(reason) {
    this.roundWon = true;
    sound.playLegendaryFanfare();
    confetti({
      particleCount: 150,
      spread: 120,
      origin: { y: 0.5 },
      colors: ['#00F0FF', '#FFB800', '#FF3B30']
    });

    const overlay = document.createElement('div');
    overlay.className = 'match-result-screen victory';
    overlay.innerHTML = `
      <div class="result-box">
        <div class="result-title">ПОБЕДА // ROUND WON</div>
        <div class="result-sub">${reason}</div>
        <div class="result-xp-reward">+2500 XP // +1200 RENOWN</div>
        <button class="hud-btn hud-btn-accent" id="btn-back-to-menu">ВЕРНУТЬСЯ В МЕНЮ</button>
      </div>
    `;
    this.container.appendChild(overlay);

    overlay.querySelector('#btn-back-to-menu')?.addEventListener('click', () => {
      this.close();
      if (this.onGameEnd) this.onGameEnd(true);
    });
  }

  onDefeat(reason) {
    this.roundLost = true;
    sound.playReveal('common');

    const overlay = document.createElement('div');
    overlay.className = 'match-result-screen defeat';
    overlay.innerHTML = `
      <div class="result-box">
        <div class="result-title">ПОРАЖЕНИЕ // MISSION FAILED</div>
        <div class="result-sub">${reason}</div>
        <button class="hud-btn" id="btn-retry-match">ПОВТОРИТЬ РАУНД</button>
        <button class="hud-btn hud-btn-accent" id="btn-back-menu">В МЕНЮ</button>
      </div>
    `;
    this.container.appendChild(overlay);

    overlay.querySelector('#btn-retry-match')?.addEventListener('click', () => {
      this.close();
      this.start({
        operator: this.activeOp,
        challenge: this.activeRule,
        weaponName: this.weapon.name,
        attachment: ''
      });
    });

    overlay.querySelector('#btn-back-menu')?.addEventListener('click', () => {
      this.close();
      if (this.onGameEnd) this.onGameEnd(false);
    });
  }

  close() {
    this.isRunning = false;
    cancelAnimationFrame(this.animId);
    this.unbindEvents();
    this.container.innerHTML = '';
  }

  addKillfeed(killer, victim) {
    this.killFeed.unshift({ killer, victim, time: performance.now() });
    if (this.killFeed.length > 4) this.killFeed.pop();
    this.renderKillfeed();
  }

  renderKillfeed() {
    const kfEl = document.getElementById('hud-killfeed');
    if (!kfEl) return;
    kfEl.innerHTML = this.killFeed.map(k => `
      <div class="kf-item">
        <span class="kf-killer">${k.killer}</span>
        <span class="kf-arrow">➔</span>
        <span class="kf-victim">${k.victim}</span>
      </div>
    `).join('');
  }

  spawnBlood(x, y, count = 10) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = Math.random() * 4 + 1;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        color: '#D32F2F',
        radius: Math.random() * 3 + 1.5,
        life: 0.5 + Math.random() * 0.5
      });
    }
  }

  spawnDebris(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = Math.random() * 5 + 1;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        color,
        radius: Math.random() * 3 + 1,
        life: 0.4 + Math.random() * 0.4
      });
    }
  }

  spawnMuzzleFlash(x, y) {
    this.particles.push({
      x, y,
      vx: 0, vy: 0,
      color: '#FFF9C4',
      radius: 9,
      life: 0.05
    });
  }

  updateHUD() {
    const hpFill = document.getElementById('hp-fill');
    const hpVal = document.getElementById('hp-val');
    const ammoVal = document.getElementById('ammo-val');
    const timerEl = document.getElementById('hud-timer');
    const distA = document.getElementById('dist-a');
    const distB = document.getElementById('dist-b');

    if (hpFill) hpFill.style.width = `${(this.player.hp / this.player.maxHp) * 100}%`;
    if (hpVal) hpVal.textContent = `${this.player.hp} HP`;
    if (ammoVal) ammoVal.textContent = `${this.weapon.currentMag} / ${this.weapon.reserve}`;

    if (timerEl) {
      const m = Math.floor(this.timeLeft / 60).toString().padStart(2, '0');
      const s = (this.timeLeft % 60).toString().padStart(2, '0');
      timerEl.textContent = `${m}:${s}`;
    }

    if (distA) {
      const dA = Math.round(Math.hypot(this.player.x - this.map.bombSites[0].x, this.player.y - this.map.bombSites[0].y) / 10);
      distA.textContent = `${dA}m`;
    }
    if (distB) {
      const dB = Math.round(Math.hypot(this.player.x - this.map.bombSites[1].x, this.player.y - this.map.bombSites[1].y) / 10);
      distB.textContent = `${dB}m`;
    }
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.save();

    // Camera transform
    ctx.translate(w / 2, h / 2);
    ctx.rotate(this.screenTilt);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-this.camera.x, -this.camera.y);

    // 1. Draw Map Floor
    ctx.fillStyle = '#181E29';
    ctx.fillRect(0, 0, this.map.width, this.map.height);

    // Floor tiles pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < this.map.width; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.map.height);
      ctx.stroke();
    }
    for (let y = 0; y < this.map.height; y += 80) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.map.width, y);
      ctx.stroke();
    }

    // 2. Draw Bomb Sites
    for (const site of this.map.bombSites) {
      ctx.fillStyle = site.defused ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 59, 48, 0.25)';
      ctx.strokeStyle = site.defused ? '#10B981' : '#FF3B30';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(site.x, site.y, site.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 24px Teko';
      ctx.textAlign = 'center';
      ctx.fillText(site.name, site.x, site.y + 8);
    }

    // 3. Draw Furniture / Covers
    for (const c of this.map.covers) {
      ctx.fillStyle = '#2A3342';
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.strokeRect(c.x, c.y, c.w, c.h);
    }

    // 4. Draw Soft Walls
    for (const sw of this.map.softWalls) {
      if (!sw.destroyed) {
        ctx.fillStyle = '#A1887F';
        ctx.fillRect(sw.x, sw.y, sw.w, sw.h);
        ctx.strokeStyle = '#5D4037';
        ctx.strokeRect(sw.x, sw.y, sw.w, sw.h);
      }
    }

    // 5. Draw Barricades
    for (const b of this.map.barricades) {
      if (!b.destroyed) {
        ctx.fillStyle = '#E65100';
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeStyle = '#FFD54F';
        ctx.lineWidth = 2;
        ctx.strokeRect(b.x, b.y, b.w, b.h);
      }
    }

    // 6. Draw Hard Walls
    for (const wall of this.map.walls) {
      ctx.fillStyle = '#0F1318';
      ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 2;
      ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);
    }

    // 7. Draw Dead Enemies
    for (const e of this.enemies) {
      if (e.isDead) {
        ctx.fillStyle = 'rgba(180, 40, 40, 0.6)';
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 8. Draw Alive Enemies
    for (const e of this.enemies) {
      if (!e.isDead) {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.angle);

        // Body
        ctx.fillStyle = '#D32F2F';
        ctx.beginPath();
        ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Gun barrel
        ctx.fillStyle = '#111';
        ctx.fillRect(8, -3, 14, 6);

        // Alert marker
        if (e.state === 'combat') {
          ctx.fillStyle = '#FF5252';
          ctx.font = 'bold 18px Inter';
          ctx.fillText('❗', -5, -24);
        }
        ctx.restore();
      }
    }

    // 9. Draw Player
    ctx.save();
    ctx.translate(this.player.x, this.player.y);
    ctx.rotate(this.player.angle);

    // Tactical laser sight if ADS
    if (this.player.isADS) {
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(25, 0);
      ctx.lineTo(600, 0);
      ctx.stroke();
    }

    // Body
    ctx.fillStyle = this.activeOp.color || '#005EA6';
    ctx.beginPath();
    ctx.arc(0, 0, this.player.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Hands & Gun
    ctx.fillStyle = '#222';
    ctx.fillRect(10, -4, 20, 8); // Gun

    // Operator symbol on back
    ctx.fillStyle = '#FFF';
    ctx.font = '14px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(this.activeOp.iconSymbol, 0, 5);

    ctx.restore();

    // 10. Draw Bullets
    for (const b of this.bullets) {
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // 11. Draw Particles
    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // 12. FOG OF WAR // RULE: BLIND MOLE (Слепой крот)
    ctx.restore(); // Restore camera transform

    if (this.activeRule.id === 'ch_blind_mole') {
      // Create radial darkness cut out only by tiny flashlight cone
      ctx.save();
      const grad = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, 220);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.98)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  }
}
