import * as THREE from 'three';
import { ProceduralMap3D } from './ProceduralMap3D.js';
import { GunViewmodel } from './GunViewmodel.js';
import { Enemy3D } from './Enemy3D.js';
import { AbilityManager } from './OperatorAbilities.js';
import { getWeaponConfig } from '../game/Weapons.js';
import { sound } from '../audio/soundEngine.js';
import { TacticalPostProcess } from './TacticalPostProcess.js';
import confetti from 'canvas-confetti';

export class Siege3DGame {
  constructor(containerEl, onGameEndCallback) {
    this.container = containerEl;
    this.onGameEnd = onGameEndCallback;
    this.isRunning = false;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.animId = null;
    this.postProcess = null;

    // Player state
    this.player = {
      pos: new THREE.Vector3(0, 1.65, 0),
      baseY: 0,
      vel: new THREE.Vector3(),
      yaw: 0,
      pitch: 0,
      height: 1.65,
      targetHeight: 1.65,
      leanAngle: 0,
      leanOffset: 0,
      speedBoost: 1.0,
      isADS: false,
      isCrouching: false,
      isProne: false,
      hp: 100,
      maxHp: 100,
      armor: 2
    };

    this.keys = {};
    this.mouse = { isDown: false, isRightDown: false };
    this.bullets = [];
    this.particles = [];
    this.enemies = [];
    this.killFeed = [];
    this.flashbangCount = 2;
    this.activeGrenades = [];

    this.timeLeft = 150;
    this.defuseProgress = 0;
    this.roundWon = false;
    this.roundLost = false;
  }

  start({ operator, challenge, weaponName, attachment }) {
    this.isRunning = true;
    this.activeOp = operator;
    this.activeRule = challenge;
    this.roundWon = false;
    this.roundLost = false;
    this.timeLeft = 150;
    this.defuseProgress = 0;
    this.killFeed = [];
    this.flashbangCount = 2;
    this.activeGrenades = [];
    this.player.baseY = 0;

    // Weapon setup with generous ammo
    const wpBase = getWeaponConfig(weaponName || operator.primaries[0]);
    const isKnifeOnly = challenge.id === 'ch_pacifist_riot';
    const mag = wpBase.magSize && wpBase.magSize > 0 ? wpBase.magSize : 30;
    const isOneBulletChallenge = challenge.id === 'ch_no_bullet_economy';

    this.weapon = {
      ...wpBase,
      magSize: mag,
      currentMag: isOneBulletChallenge ? 1 : mag,
      reserve: isOneBulletChallenge ? 0 : mag * 5,
      isReloading: false,
      lastFireTime: 0
    };

    // Height based on challenge
    if (challenge.id === 'ch_lava_crawl') {
      this.player.targetHeight = 0.55;
      this.player.height = 0.55;
    } else {
      this.player.targetHeight = 1.65;
      this.player.height = 1.65;
    }

    this.player.hp = 100;
    this.player.armor = operator.armor || 2;
    this.player.speedBoost = 1.0;
    this.player.yaw = -Math.PI / 2;
    this.player.pitch = 0;

    this.abilityManager = new AbilityManager(this);

    this.mountDOM();
    this.initThree(isKnifeOnly);
    this.bindEvents();

    const abInfo = this.abilityManager.getAbilityInfo(this.activeOp.id);
    sound.playSpinStart();

    const roundStartShouts = [
      `Боевая тревога! На поле боя гигачад ${operator.name}! Твоя абилка на F: ${abInfo.name}! Тапай хомяка и зачищай плент от чушпанов!`,
      `Внимание, сквад! Высаживается ${operator.name}! Врубай пасхалко 1488, жми F для абилки и не позорься перед скуфами!`,
      `Чиназес заказывали?! На позиции ${operator.name}! Способность: ${abInfo.name}! Если сольёшь раунд — ты официальный тюбик!`,
      `ГООООЙДА! Лорд благословил эту операцию! Оперативник ${operator.name}! Поясни за шмот местным белым маскам!`
    ];
    const startLine = roundStartShouts[Math.floor(Math.random() * roundStartShouts.length)];
    sound.speakTactical(startLine, operator.voiceMood || 'announcer');

    this.lastTime = performance.now();
    this.loop();

    this.timerInterval = setInterval(() => {
      if (this.timeLeft > 0 && !this.roundWon && !this.roundLost) {
        this.timeLeft--;
        this.updateHUDTimer();
      } else if (this.timeLeft <= 0 && !this.roundWon) {
        this.onDefeat('ВРЕМЯ ОПЕРАЦИИ ВЫШЛО!');
      }
    }, 1000);
  }

  mountDOM() {
    const abInfo = this.abilityManager.getAbilityInfo(this.activeOp.id);

    this.container.innerHTML = `
      <div class="siege-3d-overlay" id="siege-3d-wrapper">
        <canvas id="three-canvas"></canvas>

        <!-- Pointer Lock Center Click Prompt -->
        <div class="pointer-lock-prompt" id="pl-prompt">
          <div class="pl-box">
            <div class="pl-title">⚡ 3D CQB BREACH & CLEAR // FIRST-PERSON</div>
            <div class="pl-sub">КЛИКНИ МЫШЬЮ ПО ЭКРАНУ ДЛЯ ЗАХВАТА УПРАВЛЕНИЯ</div>
            <div class="pl-keys">
              <span>[W,A,S,D] Передвижение (Ц,Ф,Ы,В)</span>
              <span>[ЛКМ] Огонь</span>
              <span>[ПКМ] Прицеливание (ADS)</span>
              <span>[F] СПОСОБНОСТЬ: ${abInfo.name}</span>
              <span>[G] ⚡ ФЛЭШКА (x2)</span>
              <span>[N] 🥽 ПНВ (Ночное видение)</span>
              <span>[Q, E] Наклоны</span>
              <span>[C] Присед</span>
              <span>[V] Нож</span>
              <span>[R] Перезарядка</span>
            </div>
          </div>
        </div>

        <!-- In-game 3D Tactical HUD -->
        <div class="hud-3d-layer">
          <div class="hud-3d-top">
            <div class="hud-bombs-row">
              <div class="bomb-badge" id="b3d-dist-a">A [2F]: --m</div>
              <div class="hud-timer-3d" id="b3d-timer">02:30</div>
              <div class="bomb-badge" id="b3d-dist-b">B [1F]: --m</div>
            </div>

            <!-- Active Cursed Rule banner -->
            <div class="hud-3d-rule tier-${this.activeRule.tier}">
              <span class="rule-icon">🔥</span>
              <span class="rule-title-3d">${this.activeRule.title}</span>
              <span class="rule-desc-3d">(${this.activeRule.desc.substring(0, 60)}...)</span>
            </div>

            <!-- Killfeed -->
            <div class="hud-killfeed-3d" id="kf-3d"></div>
          </div>

          <!-- Crosshair -->
          <div class="tactical-crosshair" id="crosshair">
            <div class="ch-top"></div>
            <div class="ch-bottom"></div>
            <div class="ch-left"></div>
            <div class="ch-right"></div>
            <div class="ch-dot"></div>
          </div>

          <!-- Reload prompt banner -->
          <div class="reload-warning-banner" id="reload-banner" style="display: none;">
            ⚠️ НАЖМИ [R] ДЛЯ ПЕРЕЗАРЯДКИ!
          </div>

          <!-- Defuse prompt -->
          <div class="hud-defuse-3d" id="defuse-prompt-3d" style="display: none;">
            <div>УДЕРЖИВАЙ [ПРОБЕЛ] ДЛЯ РАЗМИНИРОВАНИЯ</div>
            <div class="defuse-bar-track">
              <div class="defuse-bar-prog" id="defuse-prog-3d" style="width: 0%;"></div>
            </div>
          </div>

          <!-- Bottom HUD with Ability Card -->
          <div class="hud-3d-bottom">
            <div class="hud-status-card">
              <div class="hp-row">
                <span class="hp-icon">❤️</span>
                <div class="hp-bar-3d">
                  <div class="hp-fill-3d" id="hp-3d-fill" style="width: 100%;"></div>
                </div>
                <span class="hp-num-3d" id="hp-3d-num">100 HP</span>
              </div>
              <div class="armor-line">🛡️ БРОНЯ: ${'●'.repeat(this.player.armor)}</div>
            </div>

            <!-- OPERATOR ABILITY WIDGET -->
            <div class="hud-ability-card" id="hud-ability-card">
              <div class="ability-badge-key">[F]</div>
              <div class="ability-text-block">
                <div class="ability-name" id="ab-name">⚡ ${abInfo.name}</div>
                <div class="ability-prog-track">
                  <div class="ability-prog-fill" id="ab-fill" style="width: 100%;"></div>
                </div>
              </div>
              <div class="ability-status" id="ab-status">ГОТОВО</div>
            </div>

            <!-- Tactical Equipment HUD (Flashbangs & NVG) -->
            <div class="hud-tactical-card" id="hud-tactical-card">
              <div class="tac-item-badge" id="badge-flashbang">
                <span class="tac-key">[G]</span>
                <span class="tac-icon">⚡</span>
                <span class="tac-val" id="flashbang-count">${this.flashbangCount}</span>
              </div>
              <div class="tac-item-badge" id="badge-nvg">
                <span class="tac-key">[N]</span>
                <span class="tac-icon">🥽</span>
                <span class="tac-val" id="nvg-status">ВЫКЛ</span>
              </div>
            </div>

            <div class="hud-gun-card">
              <div class="gun-name-3d">${this.weapon.name}</div>
              <div class="gun-ammo-3d" id="ammo-3d-val">${this.weapon.currentMag} / ${this.weapon.reserve}</div>
            </div>

            <button class="hud-exit-btn-3d" id="btn-exit-3d">✕ ВЫЙТИ (ESC)</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-exit-3d')?.addEventListener('click', () => this.close());
  }

  initThree(isKnifeOnly) {
    const canvas = document.getElementById('three-canvas');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = false;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x131924);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 100);
    this.scene.add(this.camera);

    // Procedural Map Generation!
    this.map = new ProceduralMap3D(this.scene);

    // Player Spawn from procedural layout
    this.player.pos.copy(this.map.getPlayerSpawn());
    this.player.baseY = 0;

    // Gun viewmodel
    this.viewmodel = new GunViewmodel(this.camera, this.weapon, isKnifeOnly);

    // Blind mode check
    const isBlind = this.activeRule.id === 'ch_blind_mole';
    this.map.setBlindMode(isBlind);
    this.viewmodel.setFlashlight(isBlind, 5.0);

    // Enemies spawned at procedural enemy points (multi-floor with Y)
    const enemySpawns = this.map.getEnemySpawns();
    this.enemies = enemySpawns.map((pos, idx) => {
      return new Enemy3D(this.scene, pos.x, pos.y, pos.z, idx < 2 ? 'anchor' : 'roamer');
    });

    // Tactical Post-Processing Pipeline
    this.postProcess = new TacticalPostProcess(this.renderer, window.innerWidth, window.innerHeight);
  }

  bindEvents() {
    const wrapper = document.getElementById('siege-3d-wrapper');
    const plPrompt = document.getElementById('pl-prompt');

    wrapper.addEventListener('click', () => {
      try {
        const p = wrapper.requestPointerLock();
        if (p && typeof p.catch === 'function') {
          p.catch(() => {});
        }
      } catch (e) {}
    });

    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement === wrapper) {
        if (plPrompt) plPrompt.style.display = 'none';
      } else {
        if (plPrompt && !this.roundWon && !this.roundLost) plPrompt.style.display = 'flex';
      }
    });

    this.onMouseMove = (e) => {
      if (document.pointerLockElement !== wrapper) return;
      const sens = 0.0022;
      this.player.yaw -= e.movementX * sens;
      this.player.pitch -= e.movementY * sens;
      this.player.pitch = Math.max(-1.45, Math.min(1.45, this.player.pitch));
    };

    this.onMouseDown = (e) => {
      if (document.pointerLockElement !== wrapper) return;
      if (e.button === 0) {
        this.mouse.isDown = true;
        this.tryShoot();
      }
      if (e.button === 2) {
        e.preventDefault();
        if (this.activeRule.id !== 'ch_wild_west_hipfire') {
          this.mouse.isRightDown = true;
          this.player.isADS = true;
          this.camera.fov = 52;
          this.camera.updateProjectionMatrix();
        }
      }
    };

    this.onMouseUp = (e) => {
      if (e.button === 0) this.mouse.isDown = false;
      if (e.button === 2) {
        this.mouse.isRightDown = false;
        this.player.isADS = false;
        this.camera.fov = 75;
        this.camera.updateProjectionMatrix();
      }
    };

    // Keyboard handling supporting both EN and RU layouts
    this.onKeyDown = (e) => {
      this.keys[e.code] = true;
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'ц') this.keys['KeyW'] = true;
      if (k === 's' || k === 'ы') this.keys['KeyS'] = true;
      if (k === 'a' || k === 'ф') this.keys['KeyA'] = true;
      if (k === 'd' || k === 'в') this.keys['KeyD'] = true;
      if (k === 'q' || k === 'й') this.keys['KeyQ'] = true;
      if (k === 'e' || k === 'у') this.keys['KeyE'] = true;
      if (k === ' ' || e.code === 'Space') this.keys['Space'] = true;

      // OPERATOR ABILITY on [F] or [А]
      if (e.code === 'KeyF' || k === 'f' || k === 'а') {
        this.abilityManager.triggerAbility(this.activeOp.id);
      }

      // Tactical Flashbang on [G] or [П] or [4]
      if (e.code === 'KeyG' || k === 'g' || k === 'п' || e.code === 'Digit4') {
        this.throwFlashbang();
      }

      // Night Vision on [N] or [Т]
      if (e.code === 'KeyN' || k === 'n' || k === 'т') {
        this.toggleNVG();
      }

      if (e.code === 'KeyR' || k === 'r' || k === 'к') this.reloadWeapon();
      if (e.code === 'KeyV' || k === 'v' || k === 'м') this.meleeAttack();
      if (e.code === 'KeyC' || k === 'c' || k === 'с') this.toggleCrouch();
      if (e.code === 'Escape') this.close();
    };

    this.onKeyUp = (e) => {
      this.keys[e.code] = false;
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'ц') this.keys['KeyW'] = false;
      if (k === 's' || k === 'ы') this.keys['KeyS'] = false;
      if (k === 'a' || k === 'ф') this.keys['KeyA'] = false;
      if (k === 'd' || k === 'в') this.keys['KeyD'] = false;
      if (k === 'q' || k === 'й') this.keys['KeyQ'] = false;
      if (k === 'e' || k === 'у') this.keys['KeyE'] = false;
      if (k === ' ' || e.code === 'Space') this.keys['Space'] = false;
    };

    this.onResize = () => {
      if (!this.renderer || !this.camera) return;
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      if (this.postProcess) {
        this.postProcess.resize(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('resize', this.onResize);
    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  unbindEvents() {
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('resize', this.onResize);
    clearInterval(this.timerInterval);
    if (document.exitPointerLock) document.exitPointerLock();
  }

  toggleCrouch() {
    if (this.activeRule.id === 'ch_lava_crawl') return;
    this.player.isCrouching = !this.player.isCrouching;
    this.player.targetHeight = this.player.isCrouching ? 0.95 : 1.65;
  }

  reloadWeapon() {
    if (this.weapon.isReloading || this.weapon.reserve <= 0 || this.weapon.currentMag === this.weapon.magSize) return;
    this.weapon.isReloading = true;
    sound.playPneumaticHiss(0.25);

    const reloadBanner = document.getElementById('reload-banner');
    if (reloadBanner) reloadBanner.style.display = 'none';

    setTimeout(() => {
      const needed = this.weapon.magSize - this.weapon.currentMag;
      const taking = Math.min(needed, this.weapon.reserve);
      this.weapon.currentMag += taking;
      this.weapon.reserve -= taking;
      this.weapon.isReloading = false;
      sound.playClick();
      this.updateHUDAmmo();
    }, this.weapon.reloadTime);
  }

  meleeAttack() {
    this.viewmodel.slashKnife();
    sound.playPneumaticHiss(0.12);

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    raycaster.far = 2.5;

    // Check hit on barricades
    for (const b of this.map.barricades) {
      if (!b.destroyed && raycaster.ray.intersectsBox(b.box)) {
        const destroyed = this.map.damageBarricade(b, 50);
        sound.playReveal('common');
        this.spawnWoodSplinters(this.player.pos.clone().add(this.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(1.5)));
        if (destroyed) sound.playReveal('epic');
      }
    }

    // Check hit on enemies
    for (const enemy of this.enemies) {
      if (!enemy.isDead && this.player.pos.distanceTo(enemy.group.position) < 2.5) {
        enemy.takeDamage(120);
        sound.playReveal('blackice');
        this.addKillfeed('🔪 ВЫ [НОЖ]', 'HOSTILE');
        this.spawnBloodSparks(enemy.group.position.clone().add(new THREE.Vector3(0, 1.4, 0)));
        this.checkAllEnemiesDead();
      }
    }
  }

  tryShoot() {
    const now = performance.now();
    const interval = 60000 / this.weapon.fireRate;
    if (now - this.weapon.lastFireTime < interval) return;

    if (this.weapon.currentMag <= 0) {
      sound.playClick();
      const reloadBanner = document.getElementById('reload-banner');
      if (reloadBanner) reloadBanner.style.display = 'block';

      if (this.weapon.reserve > 0 && !this.weapon.isReloading) {
        this.reloadWeapon();
      }
      return;
    }

    this.weapon.currentMag--;
    this.weapon.lastFireTime = now;
    this.updateHUDAmmo();

    this.viewmodel.fireKick();
    sound.playPneumaticHiss(0.06);

    let damage = this.activeRule.id === 'ch_pacifist_riot' ? 0 : this.weapon.damage;
    if (this.activeRule.id === 'ch_john_wick') damage *= 1.8;

    const raycaster = new THREE.Raycaster();
    const spread = this.player.isADS ? 0.004 : (this.activeRule.id === 'ch_wild_west_hipfire' ? 0.07 : 0.018);
    const screenCoord = new THREE.Vector2(
      (Math.random() - 0.5) * spread,
      (Math.random() - 0.5) * spread
    );
    raycaster.setFromCamera(screenCoord, this.camera);
    raycaster.far = 60;

    const startPos = new THREE.Vector3();
    this.viewmodel.root.getWorldPosition(startPos);
    const endPos = startPos.clone().add(raycaster.ray.direction.clone().multiplyScalar(40));
    this.spawnTracer(startPos, endPos);

    let hitEnemy = false;
    for (const enemy of this.enemies) {
      if (enemy.isDead) continue;

      const headBox = new THREE.Box3().setFromObject(enemy.headMesh);
      if (raycaster.ray.intersectsBox(headBox)) {
        hitEnemy = true;
        const killed = enemy.takeDamage(damage, true);
        sound.playReveal('blackice');
        this.spawnBloodSparks(headBox.getCenter(new THREE.Vector3()));
        if (killed) {
          const hsShouts = [
            'Откис тюбик!',
            'Чиназес в череп!',
            'Минус кабина, чушпан!',
            'Ван-тап в табло!',
            'Пояснил за шмот!',
            'Скибиди хедшот!'
          ];
          const hsText = hsShouts[Math.floor(Math.random() * hsShouts.length)];
          this.addKillfeed(`🎯 ВЫ [${this.weapon.name} 💥 ${hsText}]`, 'HOSTILE');
          if (Math.random() < 0.6) {
            sound.speakTactical(hsText, 'zoomer');
          }
          this.checkAllEnemiesDead();
        }
        break;
      }

      const bodyBox = new THREE.Box3().setFromObject(enemy.bodyMesh);
      if (raycaster.ray.intersectsBox(bodyBox)) {
        hitEnemy = true;
        const killed = enemy.takeDamage(damage, false);
        sound.playReveal('legendary');
        this.spawnBloodSparks(bodyBox.getCenter(new THREE.Vector3()));
        if (killed) {
          this.addKillfeed(`🎯 ВЫ [${this.weapon.name}]`, 'HOSTILE');
          this.checkAllEnemiesDead();
        }
        break;
      }
    }

    if (!hitEnemy) {
      for (const b of this.map.barricades) {
        if (!b.destroyed && raycaster.ray.intersectsBox(b.box)) {
          const destroyed = this.map.damageBarricade(b, damage);
          this.spawnWoodSplinters(raycaster.ray.at(5, new THREE.Vector3()));
          if (destroyed) sound.playReveal('epic');
          break;
        }
      }
    }
  }

  loop() {
    if (!this.isRunning) return;

    const now = performance.now();
    const dt = Math.min(0.1, (now - this.lastTime) / 1000);
    this.lastTime = now;

    this.update(dt);
    this.render(dt);

    this.animId = requestAnimationFrame(() => this.loop());
  }

  update(dt) {
    if (this.roundWon || this.roundLost) return;

    // Ability manager tick
    this.abilityManager.update(dt);
    this.updateAbilityHUD();

    // 1. Movement Vector Calculation
    const moveDir = new THREE.Vector3();
    const forward = new THREE.Vector3(-Math.sin(this.player.yaw), 0, -Math.cos(this.player.yaw));
    const right = new THREE.Vector3(Math.cos(this.player.yaw), 0, -Math.sin(this.player.yaw));

    if (this.activeRule.id === 'ch_olympic_sprint') {
      moveDir.add(forward.clone().multiplyScalar(1.6));
    } else {
      if (this.keys['KeyW']) moveDir.add(forward);
      if (this.keys['KeyS']) moveDir.sub(forward);
      if (this.keys['KeyD']) moveDir.add(right);
      if (this.keys['KeyA']) moveDir.sub(right);
    }

    const isMoving = moveDir.lengthSq() > 0.001;
    let speed = 5.2 * (this.player.speedBoost || 1.0);
    if (this.player.isADS) speed = 2.6;
    if (this.player.isCrouching) speed = 3.0;
    if (this.activeRule.id === 'ch_lava_crawl') speed = 1.8;

    if (isMoving) {
      moveDir.normalize().multiplyScalar(speed * dt);

      const nextX = this.player.pos.clone();
      nextX.x += moveDir.x;
      if (!this.map.checkCollision(nextX, 0.35)) {
        this.player.pos.x = nextX.x;
      }

      const nextZ = this.player.pos.clone();
      nextZ.z += moveDir.z;
      if (!this.map.checkCollision(nextZ, 0.35)) {
        this.player.pos.z = nextZ.z;
      }
    }

    // 2. Smooth Height and Floor Elevation
    const targetFloorY = this.map.getFloorHeight(this.player.pos);
    if (this.player.baseY > targetFloorY + 0.4) {
      this.player.baseY = THREE.MathUtils.lerp(this.player.baseY, targetFloorY, 0.35);
    } else {
      this.player.baseY = THREE.MathUtils.lerp(this.player.baseY, targetFloorY, 0.22);
    }
    this.player.height = THREE.MathUtils.lerp(this.player.height, this.player.targetHeight, 0.15);
    this.player.pos.y = this.player.baseY + this.player.height;

    // 3. Leaning (Q / E)
    let targetLeanAngle = 0;
    let targetLeanOffset = 0;
    if (this.activeRule.id === 'ch_party_rave') {
      targetLeanAngle = Math.sin(performance.now() / 180) * 0.18;
      targetLeanOffset = Math.sin(performance.now() / 180) * 0.35;
    } else {
      if (this.keys['KeyQ']) { targetLeanAngle = 0.15; targetLeanOffset = -0.32; }
      else if (this.keys['KeyE']) { targetLeanAngle = -0.15; targetLeanOffset = 0.32; }
    }
    this.player.leanAngle = THREE.MathUtils.lerp(this.player.leanAngle, targetLeanAngle, 0.18);
    this.player.leanOffset = THREE.MathUtils.lerp(this.player.leanOffset, targetLeanOffset, 0.18);

    // 4. Update Camera Position & Rotation
    const leanVec = right.clone().multiplyScalar(this.player.leanOffset);
    this.camera.position.copy(this.player.pos).add(leanVec);

    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.player.yaw;
    this.camera.rotation.x = this.player.pitch;
    this.camera.rotation.z = this.player.leanAngle;

    // 5. Update Gun Viewmodel
    this.viewmodel.update(dt, isMoving, this.player.isADS);

    // 6. Update Active Thrown Flashbangs
    this.updateGrenades(dt);

    // 7. Update Enemies
    for (const enemy of this.enemies) {
      enemy.update(this.player.pos, dt, this.map.colliders, (barrelPos, dir, dmg) => {
        this.spawnTracer(barrelPos, barrelPos.clone().add(dir.clone().multiplyScalar(25)), 0xFF5252);
        if (barrelPos.distanceTo(this.player.pos) < 25) {
          this.playerTakeDamage(dmg);
        }
      });
    }

    // 8. Update Bomb Defusal
    this.updateDefuseLogic();
    this.updateHUDDistances();

    // 9. Auto-fire
    if (this.mouse.isDown && !this.weapon.isReloading) {
      this.tryShoot();
    }
  }

  updateAbilityHUD() {
    const fill = document.getElementById('ab-fill');
    const status = document.getElementById('ab-status');
    if (!fill || !status) return;

    if (this.abilityManager.cooldown <= 0) {
      fill.style.width = '100%';
      fill.style.background = 'var(--siege-cyan)';
      status.textContent = 'ГОТОВО [F]';
      status.style.color = 'var(--siege-cyan)';
    } else {
      const pct = (1 - this.abilityManager.cooldown / this.abilityManager.maxCooldown) * 100;
      fill.style.width = `${pct}%`;
      fill.style.background = 'var(--siege-orange)';
      status.textContent = `${Math.ceil(this.abilityManager.cooldown)}s`;
      status.style.color = '#FFF';
    }
  }

  playerTakeDamage(dmg) {
    if (this.activeOp.name === 'MONTAGNE' || this.activeOp.name === 'CLASH') {
      sound.playReveal('epic');
      return;
    }

    const armorFactor = 1 - (this.player.armor - 1) * 0.14;
    this.player.hp -= Math.round(dmg * armorFactor);
    sound.playReveal('common');

    // Shader feedback: damage flash & low HP pulse
    if (this.postProcess) {
      this.postProcess.triggerDamageFlash(0.85);
      this.postProcess.setLowHp(this.player.hp <= 35);
    }

    // Low HP meme cry
    if (this.player.hp > 0 && this.player.hp <= 35 && !this.lowHpWarned) {
      this.lowHpWarned = true;
      sound.speakTactical('Ай блядь, маслину поймал! Срочно вызывайте альтушку или Дока!', 'screamer');
    }

    const hpFill = document.getElementById('hp-3d-fill');
    const hpNum = document.getElementById('hp-3d-num');
    if (hpFill) hpFill.style.width = `${Math.max(0, this.player.hp)}%`;
    if (hpNum) hpNum.textContent = `${Math.max(0, this.player.hp)} HP`;

    if (this.player.hp <= 0) {
      this.player.hp = 0;
      this.onDefeat('ВЫ ПОГИБЛИ В БОЮ!');
    }
  }

  updateDefuseLogic() {
    const prompt = document.getElementById('defuse-prompt-3d');
    const prog = document.getElementById('defuse-prog-3d');

    let nearSite = null;
    for (const s of this.map.bombSites) {
      if (!s.defused && this.player.pos.distanceTo(new THREE.Vector3(s.x, this.player.pos.y, s.z)) < 3.2) {
        nearSite = s;
        break;
      }
    }

    if (nearSite) {
      if (prompt) prompt.style.display = 'block';
      if (this.keys['Space']) {
        if (!this.hasAnnouncedDefuse) {
          this.hasAnnouncedDefuse = true;
          sound.speakTactical('Обезвреживаю бомбу, не мешайте тапать хомяка!', 'zoomer');
        }

        this.defuseProgress += 0.9;
        if (prog) prog.style.width = `${Math.min(100, this.defuseProgress)}%`;

        if (this.defuseProgress >= 100) {
          nearSite.defused = true;
          nearSite.light.color.setHex(0x00E676);
          sound.playReveal('blackice');
          sound.speakTactical(`Бомба ${nearSite.id} обезврежена, чиназес!`, 'hype');
          this.addKillfeed(`💣 БОМБА ${nearSite.id} ОБЕЗВРЕЖЕНА!`, 'SYSTEM');
          this.checkVictoryCondition();
        }
      } else {
        this.hasAnnouncedDefuse = false;
        this.defuseProgress = Math.max(0, this.defuseProgress - 1.5);
        if (prog) prog.style.width = `${this.defuseProgress}%`;
      }
    } else {
      if (prompt) prompt.style.display = 'none';
      this.hasAnnouncedDefuse = false;
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
    const remaining = this.map.bombSites.filter(b => !b.defused);
    if (remaining.length === 0) {
      this.onVictory('ОБЕ БОМБЫ ОБЕЗВРЕЖЕНЫ // ОПЕРАЦИЯ УСПЕШНА!');
    }
  }

  onVictory(reason) {
    this.roundWon = true;
    sound.playLegendaryFanfare();
    confetti({ particleCount: 160, spread: 130, origin: { y: 0.5 } });

    const winShouts = [
      'ГОООООЙДАААА! ПОБЕДА! ЭЙС ОФОРМЛЕН! ЧУШПАНЫ УНИЧТОЖЕНЫ, ВЫДАЙТЕ ЭТОМУ ГИГАЧАДУ ПИВО!',
      'ЧИНАЗЕС СЮДААА! РАУНД ВЗЯТ НА СУЕТЕ! ВСЕ СКУФЫ В ШОКЕ, АЛЬТУШКИ АПЛОДИРУЮТ!',
      'ПАЦАНСКАЯ ПОБЕДА! ВЫ ПОЯСНИЛИ ВСЕМУ ЗДАНИЮ ЗА ШМОТ И ВЫНЕСЛИ ПЛЕНТ!'
    ];
    const winLine = winShouts[Math.floor(Math.random() * winShouts.length)];
    sound.speakTactical(winLine, 'hype');

    const overlay = document.createElement('div');
    overlay.className = 'match-result-screen victory';
    overlay.innerHTML = `
      <div class="result-box">
        <div class="result-title">3D ПОБЕДА // ROUND WON</div>
        <div class="result-sub">${reason}</div>
        <div class="result-xp-reward">+3000 XP // +1500 RENOWN</div>
        <button class="hud-btn hud-btn-accent" id="btn-back-menu-3d">ВЕРНУТЬСЯ В МЕНЮ</button>
      </div>
    `;
    this.container.appendChild(overlay);

    overlay.querySelector('#btn-back-menu-3d')?.addEventListener('click', () => {
      this.close();
      if (this.onGameEnd) this.onGameEnd(true);
    });
  }

  onDefeat(reason) {
    this.roundLost = true;
    sound.playReveal('common');

    const lossRoasts = [
      'ПОЛНЕЙШИЙ КРИНЖ! СЛИЛИСЬ КАК ПОСЛЕДНИЕ ТЮБИКИ! БЫСТРО УДАЛЯЙТЕ СИДЖ И ИДИТЕ ПЛАКАТЬ В ТИКТОК!',
      'АНФОЛЛОВ ИЗ ЖИЗНИ! МАСЛИНУ ПОЙМАЛ, ХОМЯКА НЕ ДОТАПАЛ, РАУНД ПРОСРАН!',
      'ОМЕЖКА СЛИЛСЯ В ПЕРВУЮ МИНУТУ! СКУФЫ НА ДИВАНЕ В ТИЛЬТЕ!'
    ];
    const lossLine = lossRoasts[Math.floor(Math.random() * lossRoasts.length)];
    sound.speakTactical(lossLine, 'announcer');

    const overlay = document.createElement('div');
    overlay.className = 'match-result-screen defeat';
    overlay.innerHTML = `
      <div class="result-box">
        <div class="result-title">ПОРАЖЕНИЕ // MISSION FAILED</div>
        <div class="result-sub">${reason}</div>
        <button class="hud-btn hud-btn-accent" id="btn-defeat-back-3d">ВЕРНУТЬСЯ В МЕНЮ</button>
      </div>
    `;
    this.container.appendChild(overlay);

    overlay.querySelector('#btn-defeat-back-3d')?.addEventListener('click', () => {
      this.close();
      if (this.onGameEnd) this.onGameEnd(false);
    });
  }

  close() {
    this.isRunning = false;
    cancelAnimationFrame(this.animId);
    this.unbindEvents();
    if (this.postProcess) {
      this.postProcess.dispose();
      this.postProcess = null;
    }
    if (this.scene) {
      for (const g of this.activeGrenades) {
        if (g.mesh) this.scene.remove(g.mesh);
      }
    }
    this.activeGrenades = [];
    this.container.innerHTML = '';
  }

  throwFlashbang() {
    if (this.flashbangCount <= 0 || this.roundWon || this.roundLost) return;

    this.flashbangCount--;
    this.updateHUDTactical();
    sound.playPneumaticHiss(0.12);

    const flashShouts = [
      'Лови флэшку в ебало!',
      'Слеповая пошла, закрывайте глаза!',
      'Флэшка летит, держите чиназес!',
      'Лови детское масло Дидди в глаза, чушпан!',
      'Внимание, светошумовая от гигачада!'
    ];
    if (Math.random() < 0.6) {
      sound.speakTactical(flashShouts[Math.floor(Math.random() * flashShouts.length)], 'zoomer');
    }

    // Create 3D flashbang cylinder mesh
    const grenadeGroup = new THREE.Group();
    const bodyGeom = new THREE.CylinderGeometry(0.045, 0.045, 0.16, 12);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.3 });
    const bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
    grenadeGroup.add(bodyMesh);

    // Cyan tactical band
    const bandGeom = new THREE.CylinderGeometry(0.046, 0.046, 0.035, 12);
    const bandMat = new THREE.MeshBasicMaterial({ color: 0x00E5FF });
    const bandMesh = new THREE.Mesh(bandGeom, bandMat);
    grenadeGroup.add(bandMesh);

    // Pin spoon lever
    const spoonGeom = new THREE.BoxGeometry(0.012, 0.1, 0.035);
    const spoonMat = new THREE.MeshStandardMaterial({ color: 0x94A3B8, metalness: 0.9 });
    const spoonMesh = new THREE.Mesh(spoonGeom, spoonMat);
    spoonMesh.position.set(0.04, 0.03, 0);
    grenadeGroup.add(spoonMesh);

    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);

    // Initial position in front of camera
    grenadeGroup.position.copy(this.camera.position).add(camDir.clone().multiplyScalar(0.4));
    this.scene.add(grenadeGroup);

    // Throw velocity
    const throwVel = camDir.clone().multiplyScalar(15.5).add(new THREE.Vector3(0, 3.8, 0));

    this.activeGrenades.push({
      mesh: grenadeGroup,
      vel: throwVel,
      fuse: 1.45,
      bounces: 0
    });
  }

  updateGrenades(dt) {
    for (let i = this.activeGrenades.length - 1; i >= 0; i--) {
      const g = this.activeGrenades[i];
      g.fuse -= dt;

      // Gravity
      g.vel.y -= 19.6 * dt;

      // Predict next position
      const nextPos = g.mesh.position.clone().addScaledVector(g.vel, dt);

      // Floor check
      const floorY = this.map.getFloorHeight(nextPos);
      if (nextPos.y <= floorY + 0.1 && g.vel.y < 0) {
        nextPos.y = floorY + 0.1;
        g.vel.y = -g.vel.y * 0.42;
        g.vel.x *= 0.65;
        g.vel.z *= 0.65;
        g.bounces++;
        if (g.bounces <= 3) sound.playGrenadeBounce();
      }

      // Wall collision check
      if (this.map.checkCollision(nextPos, 0.2)) {
        g.vel.x = -g.vel.x * 0.5;
        g.vel.z = -g.vel.z * 0.5;
        g.bounces++;
        if (g.bounces <= 3) sound.playGrenadeBounce();
      } else {
        g.mesh.position.copy(nextPos);
      }

      // Tumbling rotation
      g.mesh.rotation.x += 10 * dt;
      g.mesh.rotation.z += 7 * dt;

      // Detonation
      if (g.fuse <= 0) {
        this.detonateFlashbang(g.mesh.position);
        this.scene.remove(g.mesh);
        this.activeGrenades.splice(i, 1);
      }
    }
  }

  detonateFlashbang(detPos) {
    // 1. Audio
    sound.playFlashbangDetonation();

    // 2. Visual explosion flash particle
    const flashSphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.95 })
    );
    flashSphere.position.copy(detPos);
    this.scene.add(flashSphere);

    const startTime = performance.now();
    const animFlash = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      if (elapsed < 0.22) {
        const scale = 1.0 + elapsed * 16;
        flashSphere.scale.set(scale, scale, scale);
        flashSphere.material.opacity = 0.95 * (1 - elapsed / 0.22);
        requestAnimationFrame(animFlash);
      } else {
        this.scene.remove(flashSphere);
        flashSphere.geometry.dispose();
        flashSphere.material.dispose();
      }
    };
    animFlash();

    // 3. Post-process shockwave & retinal flash for player
    const distToPlayer = this.camera.position.distanceTo(detPos);
    if (distToPlayer < 24) {
      const projected = detPos.clone().project(this.camera);
      const uvX = (projected.x + 1) / 2;
      const uvY = (projected.y + 1) / 2;

      const camDir = new THREE.Vector3();
      this.camera.getWorldDirection(camDir);
      const toFlash = new THREE.Vector3().subVectors(detPos, this.camera.position).normalize();
      const dot = camDir.dot(toFlash);

      // Line of sight check to player
      let hasLosToPlayer = true;
      const ray = new THREE.Raycaster(detPos, toFlash.clone().negate(), 0.1, distToPlayer);
      for (const box of this.map.colliders) {
        if (ray.ray.intersectsBox(box)) {
          hasLosToPlayer = false;
          break;
        }
      }

      if (hasLosToPlayer) {
        let flashAmount = 0;
        if (distToPlayer < 4.5) {
          flashAmount = 1.0;
        } else if (dot > 0.15) {
          flashAmount = THREE.MathUtils.clamp((1 - distToPlayer / 20) * 1.25, 0.35, 1.0);
        } else {
          flashAmount = 0.35;
        }

        if (this.postProcess) {
          this.postProcess.flashIntensity = Math.min(1.0, this.postProcess.flashIntensity + flashAmount);
          this.postProcess.triggerShockwave(new THREE.Vector2(
            THREE.MathUtils.clamp(uvX, 0.1, 0.9),
            THREE.MathUtils.clamp(uvY, 0.1, 0.9)
          ));
        }
      }
    }

    // 4. Stun enemies within 15 meters
    let stunnedCount = 0;
    for (const enemy of this.enemies) {
      if (enemy.isDead) continue;
      const dist = enemy.group.position.distanceTo(detPos);
      if (dist < 15) {
        enemy.stun(4.5);
        stunnedCount++;
      }
    }

    if (stunnedCount > 0) {
      this.addKillfeed(`⚡ ФЛЭШКА [${stunnedCount} ВРАГ. ОСЛЕПЛЕНО]`, 'HOSTILE');
    }
  }

  toggleNVG() {
    if (!this.postProcess) return;
    const active = this.postProcess.toggleNVG();
    sound.playRadioChirp();
    const badge = document.getElementById('nvg-status');
    if (badge) {
      badge.textContent = active ? 'ВКЛ' : 'ВЫКЛ';
      badge.style.color = active ? '#00FF66' : '#94A3B8';
    }
    const bannerText = active ? '🥽 ПНВ АКТИВИРОВАН' : '🥽 ПНВ ВЫКЛЮЧЕН';
    this.addKillfeed(bannerText, 'SYSTEM');
  }

  updateHUDTactical() {
    const el = document.getElementById('flashbang-count');
    if (el) el.textContent = this.flashbangCount;
  }

  spawnTracer(start, end, color = 0xFFD54F) {
    const dir = new THREE.Vector3().subVectors(end, start);
    const dist = dir.length();
    const geom = new THREE.CylinderGeometry(0.015, 0.015, Math.min(dist, 4), 6);
    const mat = new THREE.MeshBasicMaterial({ color });
    const tracer = new THREE.Mesh(geom, mat);

    tracer.position.copy(start).add(dir.clone().multiplyScalar(0.5));
    tracer.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    this.scene.add(tracer);

    setTimeout(() => {
      this.scene.remove(tracer);
    }, 50);
  }

  spawnBloodSparks(pos) {
    for (let i = 0; i < 8; i++) {
      const spark = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xD32F2F })
      );
      spark.position.copy(pos);
      this.scene.add(spark);
      setTimeout(() => this.scene.remove(spark), 250);
    }
  }

  spawnWoodSplinters(pos) {
    for (let i = 0; i < 6; i++) {
      const splinter = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.04, 0.12),
        new THREE.MeshBasicMaterial({ color: 0x8D6E63 })
      );
      splinter.position.copy(pos);
      this.scene.add(splinter);
      setTimeout(() => this.scene.remove(splinter), 300);
    }
  }

  addKillfeed(killer, victim) {
    this.killFeed.unshift({ killer, victim });
    if (this.killFeed.length > 4) this.killFeed.pop();
    const kf = document.getElementById('kf-3d');
    if (kf) {
      kf.innerHTML = this.killFeed.map(k => `
        <div class="kf-item">
          <span>${k.killer}</span>
          <span style="color:#FF3B30">➔</span>
          <span>${k.victim}</span>
        </div>
      `).join('');
    }
  }

  updateHUDTimer() {
    const el = document.getElementById('b3d-timer');
    if (el) {
      const m = Math.floor(this.timeLeft / 60).toString().padStart(2, '0');
      const s = (this.timeLeft % 60).toString().padStart(2, '0');
      el.textContent = `${m}:${s}`;
    }
  }

  updateHUDDistances() {
    const dA = document.getElementById('b3d-dist-a');
    const dB = document.getElementById('b3d-dist-b');
    const playerFloor = this.player.pos.y >= (this.map.floorH - 0.5) ? '2F' : '1F';

    if (this.map.bombSites[0] && dA) {
      const sA = this.map.bombSites[0];
      const dist = Math.round(this.player.pos.distanceTo(new THREE.Vector3(sA.x, sA.y, sA.z)));
      dA.textContent = `A [2F]: ${dist}m ${playerFloor === '2F' ? '🎯' : '⬆️'}`;
    }
    if (this.map.bombSites[1] && dB) {
      const sB = this.map.bombSites[1];
      const dist = Math.round(this.player.pos.distanceTo(new THREE.Vector3(sB.x, sB.y, sB.z)));
      dB.textContent = `B [1F]: ${dist}m ${playerFloor === '1F' ? '🎯' : '⬇️'}`;
    }
  }

  updateHUDAmmo() {
    const el = document.getElementById('ammo-3d-val');
    if (el) el.textContent = `${this.weapon.currentMag} / ${this.weapon.reserve}`;
  }

  render(dt = 0.016) {
    if (this.postProcess && this.scene && this.camera) {
      this.postProcess.render(this.scene, this.camera, dt);
    } else if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}
