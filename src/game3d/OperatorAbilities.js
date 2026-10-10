import * as THREE from 'three';
import { sound } from '../audio/soundEngine.js';

export class AbilityManager {
  constructor(game) {
    this.game = game;
    this.cooldown = 0;
    this.maxCooldown = 15; // seconds
    this.activeTime = 0;
    this.isActive = false;
  }

  getAbilityInfo(opId) {
    const abilities = {
      ash: { name: 'Чиназес-Базука М120', key: 'F', cooldown: 10, desc: 'Выстрел взрывным зарядом без хедбокса' },
      sledge: { name: 'Кувалда Бобра-Пердоле', key: 'F', cooldown: 7, desc: 'Сокрушительный удар кувалдой' },
      tachanka: { name: 'Тяги Бархатные (DP-27 Напалм)', key: 'F', cooldown: 9, desc: 'Зажигательный огонь по чушпанам' },
      doc: { name: 'Укол Чиназеса MPD-0', key: 'F', cooldown: 12, desc: 'Масик-хил +50 HP с оверхилом' },
      montagne: { name: 'Шкаф с Госуслуг', key: 'F', cooldown: 12, desc: 'Мьюинг-щит и отталкивание' },
      blitz: { name: 'Скибиди-Вспышка G52', key: 'F', cooldown: 9, desc: 'Минус глаза всем в комнате' },
      caveira: { name: 'Бесшумный Шаг Альтушки', key: 'F', cooldown: 10, desc: 'Ускорение +40% и перо в бочину' },
      fuze: { name: 'Пасхалко 1488 (Матрёшка)', key: 'F', cooldown: 14, desc: 'Залп 5 кассетных бомб по заложнику' },
      jager: { name: 'Анти-Кринж Купол "Сорока"', key: 'F', cooldown: 11, desc: 'Лазерный перехват гранат' },
      bandit: { name: '220 Вольт в Трусы', key: 'F', cooldown: 9, desc: 'Шоковая волна электротоком' },
      kapkan: { name: 'Ловушка Джокера ЭДД', key: 'F', cooldown: 9, desc: 'Взрыв лазерной мины на двери' },
      ela: { name: 'Мина Грзмот в Ебло', key: 'F', cooldown: 10, desc: 'Оглушающий взрыв дезориентации' },
      vigil: { name: 'Маскировка Анонимуса ZXC', key: 'F', cooldown: 12, desc: 'Оффлайн режим и двойной урон' },
      amaru: { name: 'Крюк Суеты на 0:02', key: 'F', cooldown: 8, desc: 'Резкий рывок вперед на 12 метров' },
      clash: { name: 'Шок-Щит "YOU MUPPET"', key: 'F', cooldown: 10, desc: 'Электрошок и ор в микрофон' },
      frost: { name: 'Капкан для Скуфов', key: 'F', cooldown: 9, desc: 'Механический капкан со хрустом' },
      glaz: { name: 'Жёлтый Тепловизор', key: 'F', cooldown: 12, desc: 'Подсветка силуэтов банановым цветом' },
      deimos: { name: 'Дуэль за Гаражами', key: 'F', cooldown: 12, desc: 'Красный маркер дуэли 1 на 1' }
    };
    return abilities[opId] || abilities.ash;
  }

  showAbilityBanner(title, subtitle = '', color = '#00F0FF') {
    const existing = document.getElementById('ability-meme-banner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.id = 'ability-meme-banner';
    banner.className = 'ability-meme-banner';
    banner.innerHTML = `
      <div class="banner-title" style="color: ${color}; text-shadow: 0 0 16px ${color};">${title}</div>
      ${subtitle ? `<div class="banner-sub">${subtitle}</div>` : ''}
    `;
    document.body.appendChild(banner);

    setTimeout(() => {
      banner.classList.add('fade-out');
      setTimeout(() => banner.remove(), 400);
    }, 2200);
  }

  triggerAbility(opId) {
    if (this.cooldown > 0) {
      sound.playClick();
      return;
    }

    const info = this.getAbilityInfo(opId);
    this.cooldown = info.cooldown;
    this.maxCooldown = info.cooldown;

    sound.playReveal('epic');

    switch (opId) {
      case 'ash':
        this.executeAshBreach();
        break;
      case 'sledge':
        this.executeSledgeHammer();
        break;
      case 'tachanka':
        this.executeTachankaFire();
        break;
      case 'doc':
        this.executeDocStim();
        break;
      case 'blitz':
        this.executeBlitzFlash();
        break;
      case 'caveira':
        this.executeCaveiraSilent();
        break;
      case 'fuze':
        this.executeFuzeCluster();
        break;
      case 'amaru':
        this.executeAmaruDash();
        break;
      case 'glaz':
        this.executeGlazThermal();
        break;
      case 'deimos':
        this.executeDeimosTracker();
        break;
      case 'clash':
        this.executeClashTaser();
        break;
      case 'bandit':
        this.executeBanditShock();
        break;
      case 'jager':
        this.executeJagerADS();
        break;
      case 'kapkan':
        this.executeKapkanTrap();
        break;
      case 'frost':
        this.executeFrostMat();
        break;
      case 'ela':
        this.executeElaMine();
        break;
      case 'montagne':
        this.executeMontagneShield();
        break;
      case 'vigil':
        this.executeVigilGhost();
        break;
      default:
        this.executeGenericExplosive();
        break;
    }
  }

  // ASH: Explosive projectile launches forward and blasts
  executeAshBreach() {
    this.showAbilityBanner('💥 ЧИНАЗЕС-БАЗУКА АКТИВИРОВАНА!', 'Хедбокса нет, тапай хомяка!', '#FF5722');
    sound.speakTactical('ЧИНАЗЕС СЮДААА! НЕТ ХЕДБОКСА — НЕТ ПРОБЛЕМ! ЛОВИ БАЗУКУ В ЩИ!', 'zoomer');
    
    const dir = this.game.camera.getWorldDirection(new THREE.Vector3());
    const blastPos = this.game.player.pos.clone().add(dir.multiplyScalar(6.5));
    this.createExplosion(blastPos, 6.5, 160, 0xFF5722);
  }

  // SLEDGE: Hammer smash right in front
  executeSledgeHammer() {
    this.showAbilityBanner('🔨 КУРВА БОБЁР УДАР!', 'Кувалдой по ебалу нахуй!', '#FFB800');
    sound.speakTactical('КУРВА БОБЁР Я ПЕРДОЛЕ! КУВАЛДОЙ ПО ЕБАЛУ НАХУЙ!', 'screamer');

    const dir = this.game.camera.getWorldDirection(new THREE.Vector3());
    const hitPos = this.game.player.pos.clone().add(dir.multiplyScalar(2.4));
    this.createExplosion(hitPos, 4, 220, 0xC67A32);
    this.game.viewmodel.slashKnife();
  }

  // TACHANKA: Incendiary fire burst
  executeTachankaFire() {
    this.showAbilityBanner('🔥 ГООООЙДА! ТЯГИ БАРХАТНЫЕ!', 'Огонь по чушпанам Всея Руси!', '#FF1744');
    sound.speakTactical('ГОООООЙДАААА! ТЯГИ БАРХАТНЫЕ, КЕФТЕМЕ! ОГОНЬ ПО ЧУШПАНАМ ВСЕЯ РУСИ!', 'lord');

    const dir = this.game.camera.getWorldDirection(new THREE.Vector3());
    const blastPos = this.game.player.pos.clone().add(dir.multiplyScalar(7.5));
    this.createExplosion(blastPos, 8, 120, 0xFF3D00);
  }

  // DOC: Heal +50 HP up to 140 HP
  executeDocStim() {
    this.showAbilityBanner('💉 ЧИНАЗЕС ВКОЛОТ: +50 HP!', 'Масик на оверхиле 140 HP!', '#00E676');
    sound.speakTactical('Я МАСИК! ВКОЛОЛ ЧИНАЗЕС ПРЯМО В ВЕНУ, ОВЕРХИЛ 140 ХП!', 'announcer');

    this.game.player.hp = Math.min(140, this.game.player.hp + 50);

    const hpFill = document.getElementById('hp-3d-fill');
    const hpNum = document.getElementById('hp-3d-num');
    if (hpFill) hpFill.style.width = `${Math.min(100, (this.game.player.hp / 100) * 100)}%`;
    if (hpNum) hpNum.textContent = `${this.game.player.hp} HP (Оверхил)`;
  }

  // BLITZ: Flash shield blinds all enemies in 14 meters
  executeBlitzFlash() {
    this.showAbilityBanner('⚡ СКИБИДИ ВСПЫШКА!', 'Минус глаза, тюбики ссаные!', '#00F0FF');
    sound.speakTactical('СКИБИДИ ДОП ДОП ЕБАЛАЙ! МИНУС ГЛАЗА, ТЮБИКИ ССАНЫЕ!', 'zoomer');
    sound.playReveal('blackice');

    // Screen flash & post-processing blind shader
    if (this.game.postProcess) {
      this.game.postProcess.triggerFlashbang(2.5);
    } else {
      const flashDiv = document.createElement('div');
      flashDiv.style.cssText = 'position:fixed;inset:0;background:#FFF;z-index:300;pointer-events:none;transition:opacity 1.5s;';
      document.body.appendChild(flashDiv);
      setTimeout(() => { flashDiv.style.opacity = '0'; }, 80);
      setTimeout(() => { flashDiv.remove(); }, 1600);
    }

    // Stun and damage enemies in front
    for (const e of this.game.enemies) {
      if (!e.isDead && e.group.position.distanceTo(this.game.player.pos) < 16) {
        e.takeDamage(45);
        e.shout('ААА МОИ ГЛАЗА БЛЯТЬ, КРИНЖ!');
      }
    }
  }

  // CAVEIRA: Silent step +40% speed for 8 sec
  executeCaveiraSilent() {
    this.showAbilityBanner('💀 ШЁПОТ СМЕРТИ АЛЬТУШКИ', 'Поясняй за шмот, чушпан!', '#76FF03');
    sound.speakTactical('ПОЯСНЯЙ ЗА ШМОТ, ЧУШПАН! ПОСАЖУ НА ПЕРО БЕЗ ШУМА И ПЫЛИ!', 'deadinside');

    this.game.player.speedBoost = 1.45;
    setTimeout(() => {
      this.game.player.speedBoost = 1.0;
    }, 8000);
  }

  // FUZE: 5 cluster bomblets
  executeFuzeCluster() {
    this.showAbilityBanner('💣 ПАСХАЛКО 1488: ЗАЛП МАТРЁШКИ!', 'Спасаем заложника от жизни!', '#FF3D00');
    sound.speakTactical('ПАСХАЛКО 1488! СПАСАЕМ ЗАЛОЖНИКА ОТ ЖИЗНИ, ЗАЛП МАТРЁШКИ ПОШЁЛ!', 'screamer');

    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const offset = new THREE.Vector3((Math.random() - 0.5) * 8, 0, (Math.random() - 0.5) * 8);
        const blastPos = this.game.player.pos.clone().add(this.game.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(8)).add(offset);
        this.createExplosion(blastPos, 4.5, 130, 0xFF1744);
      }, i * 320);
    }
  }

  // AMARU: Grapple dash forward 12m
  executeAmaruDash() {
    this.showAbilityBanner('🪝 СУЕТА НА 0:02 СЕКУНДЕ!', 'Влетаем в окно с двух ног под фонк!', '#FF9100');
    sound.speakTactical('СУЕТУ НАВЕСТИ ОХОТА! ВЛЕТАЮ НА КРЮКЕ В ОКНО НА 0:02 СЕКУНДЕ!', 'zoomer');

    const dir = this.game.camera.getWorldDirection(new THREE.Vector3());
    this.game.player.pos.add(new THREE.Vector3(dir.x * 12, 0, dir.z * 12));
    sound.playPneumaticHiss(0.35);
  }

  // GLAZ: Thermal vision (highlight enemies yellow + FLIR shader)
  executeGlazThermal() {
    this.showAbilityBanner('🎯 БАНАНОВЫЙ ТЕПЛОВИЗОР', 'Твой кринж светится жёлтым!', '#FFEA00');
    sound.speakTactical('ТЕПЛОВИЗОР ВКЛЮЧЕН! ТВОЙ КРИНЖ СВЕТИТСЯ ЖЁЛТЫМ БАНАНОМ!', 'deadinside');

    this.game.postProcess?.setThermal(true);

    for (const e of this.game.enemies) {
      if (e.bodyMesh) e.bodyMesh.material.color.setHex(0xFFFF00);
      if (e.headMesh) e.headMesh.material.color.setHex(0xFFFF00);
    }
    setTimeout(() => {
      this.game.postProcess?.setThermal(false);
      for (const e of this.game.enemies) {
        if (e.bodyMesh) e.bodyMesh.material.color.setHex(0x111620);
        if (e.headMesh) e.headMesh.material.color.setHex(0xF0F0F0);
      }
    }, 12000);
  }

  // DEIMOS: Deathmark tracking
  executeDeimosTracker() {
    this.showAbilityBanner('🎯 ДУЭЛЬ ЗА ГАРАЖАМИ!', 'Красный маркер дуэли на враге!', '#D50000');
    sound.speakTactical('ДУЭЛЬ ЗА ГАРАЖАМИ, ОМЕЖКА! ТЫ У МЕНЯ НА МУШКЕ!', 'lord');

    const target = this.game.enemies.find(e => !e.isDead);
    if (target) {
      target.shout('ОН МЕНЯ ВЫЧИСЛИЛ, ПАЦАНЫ!');
      target.takeDamage(60);
      this.game.spawnBloodSparks(target.group.position.clone().add(new THREE.Vector3(0, 1.2, 0)));
    }
  }

  // CLASH: Taser zap
  executeClashTaser() {
    this.showAbilityBanner('⚡ YOU MUPPET PISS OFF!', '220 вольт в трусы и кринж в войс!', '#2979FF');
    sound.speakTactical('YOU MUPPET PISS OFF! ЛЫСИНА СЛЕПИТ, ТОК ЕБАШИТ В ТРУСЫ!', 'screamer');

    for (const e of this.game.enemies) {
      if (!e.isDead && e.group.position.distanceTo(this.game.player.pos) < 12) {
        e.takeDamage(50);
        e.shout('БЛЯТЬ, ТОКОМ ЕБНУЛО!');
      }
    }
  }

  // BANDIT: Shock wave
  executeBanditShock() {
    this.showAbilityBanner('⚡ 220 ВОЛЬТ В ЖОПУ!', 'Электро-темщик затрикал стену!', '#FFD600');
    sound.speakTactical('220 ВОЛЬТ В ЖОПУ! Я ТОЛКАЛ КРИНЖ В ТИКТОКЕ, ЛОВИ РАЗРЯД!', 'zoomer');

    for (const e of this.game.enemies) {
      if (!e.isDead && e.group.position.distanceTo(this.game.player.pos) < 14) {
        e.takeDamage(55);
        e.shout('ААА СУКА, БАТАРЕЙКА БАНДИТА!');
      }
    }
  }

  // JAGER: ADS Laser
  executeJagerADS() {
    this.showAbilityBanner('🦅 АНТИ-КРИНЖ КУПОЛ', 'Верните мой ACOG 2016 года!', '#FF9100');
    sound.speakTactical('ВЕРНИТЕ МОЙ ACOG 2016 ГОДА, СУКИ! АНТИ-КРИНЖ КУПОЛ АКТИВИРОВАН!', 'deadinside');

    for (const e of this.game.enemies) {
      if (!e.isDead && e.group.position.distanceTo(this.game.player.pos) < 10) {
        e.takeDamage(35);
        e.shout('СОРОКА В МЕНЯ СТРЕЛЯЕТ!');
      }
    }
  }

  // KAPKAN: Trap blast
  executeKapkanTrap() {
    this.showAbilityBanner('💥 ЛОВУШКА ДЖОКЕРА!', 'Кто войдёт — тот официальный чушпан!', '#D50000');
    sound.speakTactical('ЛОВУШКА ДЖОКЕРА НА ДВЕРИ! КТО ВОЙДЁТ — ТОТ ОФИЦИАЛЬНЫЙ ЧУШПАН!', 'lord');

    const dir = this.game.camera.getWorldDirection(new THREE.Vector3());
    const blastPos = this.game.player.pos.clone().add(dir.multiplyScalar(4));
    this.createExplosion(blastPos, 5.5, 140, 0xFF1744);
  }

  // FROST: Bear trap snap
  executeFrostMat() {
    this.showAbilityBanner('🪤 КАПКАН ДЛЯ СКУФОВ!', 'Наступи и обосрись в прямом эфире!', '#00E5FF');
    sound.speakTactical('КАПКАН ДЛЯ СКУФОВ ЗАРЯЖЕН! НАСТУПИ И ОБОСРИСЬ В ПРЯМОМ ЭФИРЕ!', 'zoomer');

    for (const e of this.game.enemies) {
      if (!e.isDead && e.group.position.distanceTo(this.game.player.pos) < 7) {
        e.takeDamage(75);
        e.shout('ХРУСЬ! МОЯ НОГА В КАПКАНЕ!');
      }
    }
  }

  // ELA: Concussion mine
  executeElaMine() {
    this.showAbilityBanner('🟢 МИНА ГРЗМОТ В ЕБЛО!', 'Токсичная альтушка дезориентирует!', '#00E676');
    sound.speakTactical('МИНА ГРЗМОТ В ЕБЛО! ЛОВИ ДЕЗОРИЕНТАЦИЮ И КРИНЖ, ТЮБИК!', 'zoomer');

    for (const e of this.game.enemies) {
      if (!e.isDead && e.group.position.distanceTo(this.game.player.pos) < 12) {
        e.takeDamage(40);
        e.shout('КУРВА БОБЕР, В ГЛАЗАХ ТЕМНЕЕТ!');
      }
    }
  }

  // MONTAGNE: Shield bash & push
  executeMontagneShield() {
    this.showAbilityBanner('🛡️ ШКАФ С ГОСУСЛУГ В ДВЕРИ!', 'Мьюинг на максимуме, вы ничего не сделаете!', '#0091EA');
    sound.speakTactical('ШКАФ С ГОСУСЛУГ В ДВЕРИ! МЬЮИНГ НА МАКСИМУМЕ, ВЫ МНЕ НИХУЯ НЕ СДЕЛАЕТЕ!', 'lord');

    const dir = this.game.camera.getWorldDirection(new THREE.Vector3());
    const hitPos = this.game.player.pos.clone().add(dir.multiplyScalar(3));
    this.createExplosion(hitPos, 4, 180, 0x00B0FF);
  }

  // VIGIL: Ghost stealth
  executeVigilGhost() {
    this.showAbilityBanner('👤 ОФФЛАЙН АНОНИМУС ZXC', 'Маска Гая Фокса и двойной урон!', '#E0E0E0');
    sound.speakTactical('Я ОФФЛАЙН АНОНИМУС ZXC ГУЛЬ! МАСКА НА ЕБАЛЕ, ДВУСТВОЛКА В РУКЕ!', 'deadinside');

    this.game.player.speedBoost = 1.35;
    setTimeout(() => {
      this.game.player.speedBoost = 1.0;
    }, 7000);
  }

  executeGenericExplosive() {
    const dir = this.game.camera.getWorldDirection(new THREE.Vector3());
    const blastPos = this.game.player.pos.clone().add(dir.multiplyScalar(6));
    this.createExplosion(blastPos, 5, 120);
  }

  createExplosion(pos, radius, damage, color = 0xFF5722) {
    sound.playReveal('blackice');

    // 3D explosion sphere light & mesh
    const expMesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 0.7, 12, 12),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 })
    );
    expMesh.position.copy(pos);
    this.game.scene.add(expMesh);

    const expLight = new THREE.PointLight(color, 8, radius * 2);
    expLight.position.copy(pos);
    this.game.scene.add(expLight);

    // Fade explosion
    setTimeout(() => {
      this.game.scene.remove(expMesh);
      this.game.scene.remove(expLight);
    }, 280);

    // Break barricades in radius
    for (const b of this.game.map.barricades) {
      if (!b.destroyed && b.mesh.position.distanceTo(pos) < radius) {
        this.game.map.damageBarricade(b, 200);
      }
    }

    // Damage enemies in radius
    for (const e of this.game.enemies) {
      if (!e.isDead && e.group.position.distanceTo(pos) < radius) {
        const killed = e.takeDamage(damage);
        this.game.spawnBloodSparks(e.group.position.clone().add(new THREE.Vector3(0, 1.2, 0)));
        if (killed) {
          this.game.addKillfeed(`💥 ВЫ [АБИЛКА]`, 'HOSTILE');
          this.game.checkAllEnemiesDead();
        }
      }
    }
  }

  update(dt) {
    if (this.cooldown > 0) {
      this.cooldown = Math.max(0, this.cooldown - dt);
    }
  }
}
