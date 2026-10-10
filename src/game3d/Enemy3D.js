import * as THREE from 'three';
import { sound } from '../audio/soundEngine.js';

// Crazy meme & brainrot voice lines for enemies
const ENEMY_BATTLE_CRIES = [
  'ГОООООЙДААААА, ТЯГИ БАРХАТНЫЕ!',
  'ЧИНАЗЕС СЮДААА НАХУЙ!',
  'ТЫ ЧТО ТАКОЕ, ТЮБИК ССАНЫЙ?!',
  'СКУФЫ, В АТАКУ НА АЛЬТУШЕК!',
  'ПАСХАЛКО 1488 ВРУБИЛ, ЛОВИ МАСЛИНУ!',
  'Я ТЕБЯ В ТИКТОКЕ ЗАСКРИНЮ, ОМЕЖКА!',
  'ПОЯСНИ ЗА ШМОТ ИЛИ ЛОВИ ХЕДШОТ!',
  'ТАПАЙ ХОМЯКА, ЧЕРТИЛА ЕБАНЫЙ!',
  'КУРВА БОБЁР Я ПЕРДОЛЕЕЕ!',
  'СКИБИДИ ТУАЛЕТ В ЗДАНИИ, АТАКУЕМ!',
  'МАМКЕ ПРИВЕТ, ТЫ В СПЕКТАТОРАХ, ЧУШПАН!',
  'АХАХАХА КРИНЖУЛЯ, КУДА ТЫ СТРЕЛЯЕШЬ?!',
  'СДОХНИ В МУКАХ, ЗАБИВНОЙ ДЕД ИНСАЙД!',
  'ГООООЙДА! ЛОВИ ПОДЛИВУ В ЕБАЛО!',
  'ЗА РУСЬ СВЯТУЮ И ЗА ГОЙДУ, БЛЯТЬ!',
  'МАТЬ В КАНАВЕ, БОМБА НА ПЛЕНТЕ!',
  'ЭТО ТЕБЕ ЗА ТАЧАНКУ, ТВАРЬ!',
  'СОСИ БИБУ, ДЕД ИНСАЙД 1000-7!',
  'У МЕНЯ 300 ЧАСОВ В КСЕ, КОМУ ТЫ ПИКАЕШЬ, ДАУН?!',
  'ВЫХОДИ НА РАЗ-НА-РАЗ ЗА ГАРАЖИ, ПИДОР!',
  'МЬЮИНГ НЕ ПОМОЖЕТ, СЮДА ИДИ!',
  'ЛОВИ 220 ВОЛЬТ В ЖОПУ, ЩЕГОЛ!',
  'ШКАФ С ГОСУСЛУГ ТЕБЕ НЕ ПОМОЖЕТ!',
  'МЕНЯ ПРИГЛАСИЛИ НА ДИДДИ-ПАТИ, А ТЫ КТО ТАКОЙ?!',
  'ГДЕ МОИ 1000 БАНОК ДЕТСКОГО МАСЛА, СУКИ?!',
  'Я ВИДЕЛ ТВОЙ НИК В СПИСКАХ ЭПШТЕЙНА, ЧУШПАН!',
  'БЕЛЫЕ МАСКИ НА БЕЛОЙ ВЕЧЕРИНКЕ, ПОГНАЛИ!',
  'ЛОЛИТА-ЭКСПРЕСС ПРИБЫВАЕТ НА ВТОРОЙ ЭТАЖ!'
];

const ENEMY_DEATH_CRIES = [
  'МАМА, Я ОБОСРАЛСЯ В ТИКТОКЕ...',
  'ПАСХАЛКО НЕ СРАБОТАЛО, СУКА...',
  'АНФОЛЛОВ ИЗ ЖИЗНИ, ЧИНАЗЕС...',
  'ГОЙДА БЫЛА ОШИБКОЙ, БЛЯТЬ...',
  'МОИ ТЯГИ БАРХАТНЫЕ СГОРЕЛИ...',
  'СКУФ ПОГИБ В НЕРАВНОМ БОЮ...',
  'ААА БЛЯДЬ, МОЯ ЖОПА ГОРИТ...',
  'РЕПОРТ ЗА ЧИТЫ, КРИНЖОВИК...',
  'СКОРУЮ ВЫЗЫВАЙТЕ, Я ОБОСРАЛСЯ...',
  'МЕНЯ УБИЛ ТЮБИК БЕЗ ХЕДБОКСА...',
  'КУРВА БОБЕР, ПРОЩАЙТЕ БРАТЬЯ...',
  'ХОМЯК ТАК И НЕ ДОТАПАЛСЯ...',
  'МЕНЯ НЕ БЫЛО НА ТОМ РЕЙСЕ, Я ПРОСТО ДРОНИЛ...',
  'ПРОДАЙТЕ МОЕ ДЕТСКОЕ МАСЛО СКУФАМ...',
  'ЭПШТЕЙН НЕ САМ СЕБЯ ЗАСТРЕЛИЛ, БЛЯТЬ...'
];

const ENEMY_IDLE_CHATTER = [
  'Бля, мужики, у меня хомяк в телеге не тапается...',
  'Где моя альтушка с госуслуг? Мне обещали в этом раунде!',
  'Пацаны, кто скрутил мои бархатные тяги?',
  'Слышите шаги? Это походу дед инсайд zxc крадётся...',
  'Чиназес заказывали? Нет? А придётся терпеть!',
  'Скуфы на месте, пиво открыто, ждём атаку...',
  'Если нас запушат, я включаю пасхалко 1488!',
  'Стоим на пленте, делаем мьюинг челюстью...',
  'Кто с дивана встанет — тот официальный чушпан!',
  'Мужики, а правда что на втором этаже дидди-пати?',
  'Я вчера нашел черную книжку Эпштейна, там весь наш сквад...',
  'Пацаны, намажьте пол детским маслом, пусть штурмовики скользят!'
];

let lastGlobalShoutTime = 0;
let lastIdleChatterTime = 0;

export class Enemy3D {
  constructor(scene, x, yOrZ, zOrRole, maybeRole) {
    this.scene = scene;
    let y = 0;
    let z = 0;
    let role = 'anchor';
    if (typeof zOrRole === 'number') {
      y = yOrZ;
      z = zOrRole;
      role = maybeRole || 'anchor';
    } else {
      z = yOrZ;
      role = zOrRole || 'anchor';
    }

    this.role = role;
    this.baseY = y;
    this.hp = 100;
    this.maxHp = 100;
    this.isDead = false;
    this.stunTimer = 0;
    this.state = 'idle'; // 'idle', 'alert', 'combat', 'stunned'
    this.speed = role === 'roamer' ? 2.6 : 1.8;

    this.lastShotTime = 0;
    this.shootInterval = 420;
    this.alertTimer = 0;
    this.hasShoutedCombat = false;
    this.walkAnimTime = Math.random() * 10;
    this.patrolTarget = new THREE.Vector3(x, this.baseY, z);

    this.group = new THREE.Group();
    this.group.position.set(x, this.baseY, z);
    this.scene.add(this.group);

    this.buildHumanoidMesh();
    this.initLaserSight();
    this.initShoutBillboard();
  }

  buildHumanoidMesh() {
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1E222A, roughness: 0.7 });
    const vestMat = new THREE.MeshStandardMaterial({ color: 0x111620, roughness: 0.4, metalness: 0.4 });
    const maskMat = new THREE.MeshStandardMaterial({ color: 0xF0F0F0, roughness: 0.25 }); // White Mask!

    // 1. Legs (animated)
    this.leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.85, 8), darkMat);
    this.leftLeg.position.set(-0.16, 0.42, 0);
    this.group.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.85, 8), darkMat);
    this.rightLeg.position.set(0.16, 0.42, 0);
    this.group.add(this.rightLeg);

    // 2. Torso with Tactical Vest
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.65, 0.28), vestMat);
    torso.position.set(0, 1.25, 0);
    torso.castShadow = true;
    this.group.add(torso);
    this.bodyMesh = torso;

    // 3. Head & White Mask (Separate headshot collider)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), maskMat);
    head.position.set(0, 1.72, 0);
    head.castShadow = true;
    this.group.add(head);
    this.headMesh = head;

    // Black goggles/slit
    const goggles = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.05), new THREE.MeshBasicMaterial({ color: 0x111 }));
    goggles.position.set(0, 1.74, 0.14);
    this.group.add(goggles);

    // 4. Arms & Assault Rifle
    const gunGroup = new THREE.Group();
    const gunMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.1, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x212121, metalness: 0.8 })
    );
    gunGroup.add(gunMesh);
    gunGroup.position.set(0.2, 1.2, 0.35);
    this.group.add(gunGroup);
    this.gunGroup = gunGroup;
  }

  initLaserSight() {
    const laserMat = new THREE.LineBasicMaterial({ color: 0xFF1744, linewidth: 2 });
    const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 14)];
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    this.laserLine = new THREE.Line(geom, laserMat);
    this.laserLine.visible = false;
    this.gunGroup.add(this.laserLine);
  }

  initShoutBillboard() {
    // 3D speech bubble above head
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 80;
    this.shoutCanvas = canvas;
    this.shoutCtx = canvas.getContext('2d');

    this.shoutTexture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: this.shoutTexture, transparent: true });
    this.shoutSprite = new THREE.Sprite(spriteMat);
    this.shoutSprite.scale.set(2.4, 0.75, 1);
    this.shoutSprite.position.set(0, 2.3, 0);
    this.shoutSprite.visible = false;
    this.group.add(this.shoutSprite);
  }

  shout(text, isDeath = false) {
    if (this.isDead && !isDeath) return;

    // Show 3D speech bubble
    const ctx = this.shoutCtx;
    ctx.clearRect(0, 0, 256, 80);
    ctx.fillStyle = isDeath ? 'rgba(40, 40, 40, 0.95)' : 'rgba(220, 20, 20, 0.92)';
    ctx.roundRect(10, 10, 236, 60, 12);
    ctx.fill();
    ctx.strokeStyle = isDeath ? '#888' : '#FFF';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, 128, 48);
    this.shoutTexture.needsUpdate = true;

    this.shoutSprite.visible = true;
    setTimeout(() => {
      this.shoutSprite.visible = false;
    }, 2800);

    // Voice synthesize
    const now = performance.now();
    if (now - lastGlobalShoutTime > 1400) {
      lastGlobalShoutTime = now;
      sound.speakTactical(text, isDeath ? 'screamer' : 'screamer');
    }
  }

  stun(duration = 4.0) {
    if (this.isDead) return;
    this.stunTimer = duration;
    this.state = 'stunned';
    if (this.laserLine) this.laserLine.visible = false;

    const blindCries = [
      'ААА БЛЯДЬ, МОИ ГЛАЗА! КТО СВЕТ ВЫРУБИЛ?!',
      'СУКА ФЛЭШКА! НИХУЯ НЕ ВИЖУ ВООБЩЕ!',
      'ГЛАЗААА! ТЫ ЗАЧЕМ ДЕТСКИМ МАСЛОМ ДИДДИ МНЕ В ЕБАЛО ПЛЕСНУЛ?!',
      'ПОЛНЫЙ БЛАЙНД! НЕ СТРЕЛЯЙТЕ В СПИНУ, ОМЕЖКИ!',
      'ПАСХАЛКО СЛЕПАЯ! ГДЕ МОИ ТЯГИ БАРХАТНЫЕ?!'
    ];
    this.shout(blindCries[Math.floor(Math.random() * blindCries.length)]);
  }

  update(playerPos, dt, colliders, spawnBulletCb) {
    if (this.isDead) return;

    // Disoriented stun state
    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      if (this.laserLine) this.laserLine.visible = false;
      this.group.rotation.y += Math.sin(performance.now() * 0.015) * 0.05;
      if (this.headMesh) {
        this.headMesh.rotation.z = Math.sin(performance.now() * 0.02) * 0.35;
      }
      return;
    } else if (this.headMesh) {
      this.headMesh.rotation.z = 0;
    }

    const myPos = this.group.position;
    const distToPlayer = myPos.distanceTo(playerPos);

    // Idle chatter occasionally when player is within hearing distance
    const now = performance.now();
    if (distToPlayer < 18 && distToPlayer > 6 && now - lastIdleChatterTime > 16000 && Math.random() < 0.05) {
      lastIdleChatterTime = now;
      const chatter = ENEMY_IDLE_CHATTER[Math.floor(Math.random() * ENEMY_IDLE_CHATTER.length)];
      this.shout(chatter);
    }

    // Raycast line of sight check
    const rayDir = new THREE.Vector3().subVectors(playerPos, myPos).normalize();
    const raycaster = new THREE.Raycaster(
      new THREE.Vector3(myPos.x, this.baseY + 1.5, myPos.z),
      rayDir,
      0.1,
      distToPlayer
    );

    let hasLOS = distToPlayer < 24;
    for (const box of colliders) {
      if (raycaster.ray.intersectsBox(box)) {
        hasLOS = false;
        break;
      }
    }

    if (hasLOS) {
      // Rotate towards player
      const angle = Math.atan2(playerPos.x - myPos.x, playerPos.z - myPos.z);
      this.group.rotation.y = angle;

      this.state = 'combat';
      this.laserLine.visible = true;
      this.alertTimer = 180;

      // Shout battle cry once when entering combat!
      if (!this.hasShoutedCombat) {
        this.hasShoutedCombat = true;
        const cry = ENEMY_BATTLE_CRIES[Math.floor(Math.random() * ENEMY_BATTLE_CRIES.length)];
        this.shout(cry);
      }

      // Shoot bursts
      if (now - this.lastShotTime > this.shootInterval && distToPlayer < 18) {
        this.lastShotTime = now;
        const barrelPos = new THREE.Vector3();
        this.gunGroup.getWorldPosition(barrelPos);

        const aimDir = new THREE.Vector3().subVectors(playerPos, barrelPos).normalize();
        aimDir.x += (Math.random() - 0.5) * 0.08;
        aimDir.y += (Math.random() - 0.5) * 0.06;
        aimDir.z += (Math.random() - 0.5) * 0.08;

        if (spawnBulletCb) {
          spawnBulletCb(barrelPos, aimDir.normalize(), 14, false);
          sound.playPneumaticHiss(0.08);
        }
      }

      // Advance or reposition
      if (distToPlayer > 8) {
        this.walkAnimTime += dt * 8;
        this.animateLegs();
        const step = rayDir.clone().multiplyScalar(this.speed * dt);
        this.group.position.add(new THREE.Vector3(step.x, 0, step.z));
      }
    } else {
      this.laserLine.visible = false;
      this.hasShoutedCombat = false;

      if (this.alertTimer > 0) {
        this.alertTimer--;
        this.state = 'alert';
      } else {
        this.state = 'idle';
        this.patrol(dt);
      }
    }
  }

  animateLegs() {
    if (this.leftLeg && this.rightLeg) {
      this.leftLeg.rotation.x = Math.sin(this.walkAnimTime) * 0.45;
      this.rightLeg.rotation.x = -Math.sin(this.walkAnimTime) * 0.45;
    }
  }

  patrol(dt) {
    const myPos = this.group.position;
    if (myPos.distanceTo(this.patrolTarget) < 1.2) {
      // Pick new wander target within 5m
      const wanderAngle = Math.random() * Math.PI * 2;
      const wanderDist = 2 + Math.random() * 4;
      this.patrolTarget.set(
        myPos.x + Math.cos(wanderAngle) * wanderDist,
        this.baseY,
        myPos.z + Math.sin(wanderAngle) * wanderDist
      );
    }

    const dir = new THREE.Vector3().subVectors(this.patrolTarget, myPos).normalize();
    this.group.rotation.y = Math.atan2(dir.x, dir.z);

    this.walkAnimTime += dt * 5;
    this.animateLegs();

    this.group.position.add(new THREE.Vector3(dir.x * this.speed * 0.4 * dt, 0, dir.z * this.speed * 0.4 * dt));
  }

  takeDamage(amount, isHeadshot = false) {
    if (this.isDead) return false;
    const finalDmg = isHeadshot ? amount * 3.5 : amount;
    this.hp -= finalDmg;

    // Trigger shout if wounded
    if (Math.random() < 0.4 && !this.isDead) {
      const painShouts = [
        'ГОЙДА НАХУЙ!',
        'АЙ БЛЯТЬ, МАСЛИНА В БОЧИНУ!',
        'ТЫ ЧТО ТВОРИШЬ, ТЮБИК?!',
        'МОИ ТЯГИ БАРХАТНЫЕ ЗАДЕЛ!',
        'РЕПОРТ ЗА АИМБОТ!'
      ];
      this.shout(painShouts[Math.floor(Math.random() * painShouts.length)]);
    }

    if (this.hp <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  die() {
    this.isDead = true;
    this.laserLine.visible = false;

    // Shout death cry!
    const cry = ENEMY_DEATH_CRIES[Math.floor(Math.random() * ENEMY_DEATH_CRIES.length)];
    this.shout(cry, true);

    const startTime = performance.now();
    const animCollapse = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      if (elapsed < 0.6) {
        this.group.rotation.x = -Math.PI / 2 * Math.min(1, elapsed * 2);
        this.group.position.y = THREE.MathUtils.lerp(this.baseY, this.baseY - 0.4, Math.min(1, elapsed * 2));
        requestAnimationFrame(animCollapse);
      }
    };
    animCollapse();
  }
}
