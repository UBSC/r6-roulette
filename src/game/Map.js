// Tactical House CQB Map for Siege In-Browser Game
// Features: Rooms, destructible wooden barricades, soft walls, hard walls, bomb sites, props

export class SiegeMap {
  constructor() {
    this.width = 1600;
    this.height = 1200;

    // Hard unbreakable walls (outer concrete walls & pillars)
    this.walls = [
      // Outer boundaries
      { x: 100, y: 100, w: 1400, h: 20, type: 'hard' }, // Top
      { x: 100, y: 1080, w: 1400, h: 20, type: 'hard' }, // Bottom
      { x: 100, y: 100, w: 20, h: 1000, type: 'hard' }, // Left
      { x: 1480, y: 100, w: 20, h: 1000, type: 'hard' }, // Right

      // Interior dividing walls
      { x: 550, y: 100, w: 20, h: 400, type: 'hard' },
      { x: 550, y: 600, w: 20, h: 500, type: 'hard' },
      { x: 1050, y: 100, w: 20, h: 420, type: 'hard' },
      { x: 1050, y: 620, w: 20, h: 480, type: 'hard' },

      // Horizontal room dividers
      { x: 100, y: 600, w: 320, h: 20, type: 'hard' },
      { x: 550, y: 600, w: 360, h: 20, type: 'hard' },
      { x: 1050, y: 600, w: 450, h: 20, type: 'hard' }
    ];

    // Destructible soft walls (can be shot through or breached)
    this.softWalls = [
      { id: 'sw1', x: 420, y: 600, w: 130, h: 20, hp: 100, maxHp: 100, destroyed: false },
      { id: 'sw2', x: 910, y: 600, w: 140, h: 20, hp: 100, maxHp: 100, destroyed: false },
      { id: 'sw3', x: 550, y: 500, w: 20, h: 100, hp: 100, maxHp: 100, destroyed: false },
      { id: 'sw4', x: 1050, y: 520, w: 20, h: 100, hp: 100, maxHp: 100, destroyed: false }
    ];

    // Destructible wooden door & window barricades
    this.barricades = [
      { id: 'b1', x: 550, y: 260, w: 20, h: 80, hp: 60, destroyed: false, name: 'Main Hallway Door' },
      { id: 'b2', x: 550, y: 780, w: 20, h: 80, hp: 60, destroyed: false, name: 'Armory Door' },
      { id: 'b3', x: 1050, y: 280, w: 20, h: 80, hp: 60, destroyed: false, name: 'Bomb A Door' },
      { id: 'b4', x: 1050, y: 800, w: 20, h: 80, hp: 60, destroyed: false, name: 'Bomb B Door' },
      { id: 'b5', x: 100, y: 350, w: 20, h: 90, hp: 60, destroyed: false, name: 'West Window (Rappel)' },
      { id: 'b6', x: 1480, y: 350, w: 20, h: 90, hp: 60, destroyed: false, name: 'East Window' }
    ];

    // Bomb sites
    this.bombSites = [
      { id: 'A', name: 'BOMB SITE A', x: 1250, y: 350, radius: 45, defused: false, progress: 0 },
      { id: 'B', name: 'BOMB SITE B', x: 1250, y: 850, radius: 45, defused: false, progress: 0 }
    ];

    // Furniture / Cover objects
    this.covers = [
      { x: 300, y: 300, w: 80, h: 60, type: 'desk' },
      { x: 800, y: 320, w: 100, h: 50, type: 'table' },
      { x: 750, y: 850, w: 120, h: 60, type: 'counter' },
      { x: 1200, y: 250, w: 60, h: 60, type: 'crate' },
      { x: 1300, y: 920, w: 70, h: 70, type: 'crate' }
    ];

    // Spawns
    this.attackerSpawn = { x: 220, y: 950 };
    this.defenderSpawn = { x: 1250, y: 600 };
  }

  damageBarricade(barricade, amount) {
    if (barricade.destroyed) return;
    barricade.hp -= amount;
    if (barricade.hp <= 0) {
      barricade.destroyed = true;
      return true; // was just destroyed
    }
    return false;
  }

  damageSoftWall(sw, amount) {
    if (sw.destroyed) return;
    sw.hp -= amount;
    if (sw.hp <= 0) {
      sw.destroyed = true;
      return true;
    }
    return false;
  }

  checkCollision(x, y, radius = 18) {
    // Check hard walls
    for (const w of this.walls) {
      if (
        x + radius > w.x &&
        x - radius < w.x + w.w &&
        y + radius > w.y &&
        y - radius < w.y + w.h
      ) {
        return true;
      }
    }

    // Check intact soft walls
    for (const sw of this.softWalls) {
      if (!sw.destroyed) {
        if (
          x + radius > sw.x &&
          x - radius < sw.x + sw.w &&
          y + radius > sw.y &&
          y - radius < sw.y + sw.h
        ) {
          return true;
        }
      }
    }

    // Check intact barricades
    for (const b of this.barricades) {
      if (!b.destroyed) {
        if (
          x + radius > b.x &&
          x - radius < b.x + b.w &&
          y + radius > b.y &&
          y - radius < b.y + b.h
        ) {
          return true;
        }
      }
    }

    // Check covers
    for (const c of this.covers) {
      if (
        x + radius > c.x &&
        x - radius < c.x + c.w &&
        y + radius > c.y &&
        y - radius < c.y + c.h
      ) {
        return true;
      }
    }

    return false;
  }

  // Raycast line check for bullets and vision
  checkLineOfSight(x1, y1, x2, y2) {
    // Check against all blocking geometry
    const segments = [];
    for (const w of this.walls) {
      segments.push(...this.getRectSegments(w));
    }
    for (const sw of this.softWalls) {
      if (!sw.destroyed) segments.push(...this.getRectSegments(sw));
    }
    for (const b of this.barricades) {
      if (!b.destroyed) segments.push(...this.getRectSegments(b));
    }

    for (const seg of segments) {
      if (this.linesIntersect(x1, y1, x2, y2, seg.x1, seg.y1, seg.x2, seg.y2)) {
        return false;
      }
    }
    return true;
  }

  getRectSegments(r) {
    return [
      { x1: r.x, y1: r.y, x2: r.x + r.w, y2: r.y },
      { x1: r.x + r.w, y1: r.y, x2: r.x + r.w, y2: r.y + r.h },
      { x1: r.x + r.w, y1: r.y + r.h, x2: r.x, y2: r.y + r.h },
      { x1: r.x, y1: r.y + r.h, x2: r.x, y2: r.y }
    ];
  }

  linesIntersect(a, b, c, d, p, q, r, s) {
    const det = (c - a) * (s - q) - (r - p) * (d - b);
    if (det === 0) return false;
    const lambda = ((s - q) * (r - a) + (p - r) * (s - b)) / det;
    const gamma = ((b - d) * (r - a) + (c - a) * (s - b)) / det;
    return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
  }
}
