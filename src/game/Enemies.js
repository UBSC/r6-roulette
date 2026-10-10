// AI Enemy Combatants (White Masks / Hostiles) for Siege CQB

export class Enemy {
  constructor(x, y, role = 'anchor', map) {
    this.x = x;
    this.y = y;
    this.role = role; // 'anchor', 'roamer', 'patrol'
    this.map = map;
    this.hp = 100;
    this.maxHp = 100;
    this.radius = 16;
    this.angle = Math.random() * Math.PI * 2;
    this.speed = role === 'roamer' ? 1.8 : 1.2;
    this.state = 'idle'; // 'idle', 'alert', 'combat'
    this.alertTimer = 0;
    this.lastShotTime = 0;
    this.shootInterval = 350 + Math.random() * 250;
    this.isDead = false;
    this.patrolTarget = { x, y };
    this.timeInState = 0;
  }

  update(player, dt, bulletsOut) {
    if (this.isDead) return;

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distToPlayer = Math.hypot(dx, dy);
    const angleToPlayer = Math.atan2(dy, dx);

    // Check line of sight
    const hasLOS = distToPlayer < 650 && this.map.checkLineOfSight(this.x, this.y, player.x, player.y);

    if (hasLOS) {
      // Rotate towards player
      this.angle = angleToPlayer;
      this.state = 'combat';
      this.alertTimer = 180; // stay alerted for ~3 seconds

      // Shoot at player
      const now = performance.now();
      if (now - this.lastShotTime > this.shootInterval && distToPlayer < 500) {
        this.lastShotTime = now;
        // Inaccuracy
        const spreadAngle = this.angle + (Math.random() - 0.5) * 0.15;
        bulletsOut.push({
          x: this.x + Math.cos(this.angle) * 20,
          y: this.y + Math.sin(this.angle) * 20,
          vx: Math.cos(spreadAngle) * 14,
          vy: Math.sin(spreadAngle) * 14,
          damage: 18,
          fromPlayer: false,
          color: '#FF5252'
        });
      }

      // Move: either advance or back up
      if (distToPlayer > 280) {
        this.moveToward(player.x, player.y);
      } else if (distToPlayer < 140) {
        // Back away
        this.moveToward(this.x - Math.cos(this.angle) * 50, this.y - Math.sin(this.angle) * 50);
      }
    } else {
      // No LOS
      if (this.alertTimer > 0) {
        this.alertTimer--;
        this.state = 'alert';
        this.moveToward(player.x, player.y);
      } else {
        this.state = 'idle';
        this.updatePatrol();
      }
    }
  }

  moveToward(tx, ty) {
    const angle = Math.atan2(ty - this.y, tx - this.x);
    const nextX = this.x + Math.cos(angle) * this.speed;
    const nextY = this.y + Math.sin(angle) * this.speed;

    if (!this.map.checkCollision(nextX, this.y, this.radius)) {
      this.x = nextX;
    }
    if (!this.map.checkCollision(this.x, nextY, this.radius)) {
      this.y = nextY;
    }
  }

  updatePatrol() {
    this.timeInState++;
    if (this.timeInState > 180 || Math.hypot(this.patrolTarget.x - this.x, this.patrolTarget.y - this.y) < 20) {
      this.timeInState = 0;
      // Pick new wander target within 150px
      const wanderAngle = Math.random() * Math.PI * 2;
      const wanderDist = 50 + Math.random() * 100;
      this.patrolTarget = {
        x: this.x + Math.cos(wanderAngle) * wanderDist,
        y: this.y + Math.sin(wanderAngle) * wanderDist
      };
      this.angle = wanderAngle;
    }
    this.moveToward(this.patrolTarget.x, this.patrolTarget.y);
  }

  takeDamage(amount, isHeadshot = false) {
    if (this.isDead) return;
    const finalDmg = isHeadshot ? amount * 3 : amount;
    this.hp -= finalDmg;
    if (this.hp <= 0) {
      this.isDead = true;
      return true; // died
    }
    return false;
  }
}
