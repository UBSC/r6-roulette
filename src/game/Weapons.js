// Weapons database and projectile mechanics for Siege Mini-Game

export const WEAPON_CONFIGS = {
  'R4-C': {
    name: 'R4-C',
    type: 'AR',
    damage: 38,
    fireRate: 860, // RPM -> ms interval = 60000/860 ~ 69ms
    magSize: 30,
    reloadTime: 2000,
    spread: 0.04,
    recoil: 3.5,
    range: 1200,
    speed: 18,
    bulletColor: '#FFE57F'
  },
  'MP5': {
    name: 'MP5',
    type: 'SMG',
    damage: 28,
    fireRate: 800,
    magSize: 30,
    reloadTime: 1800,
    spread: 0.03,
    recoil: 2.2,
    range: 1000,
    speed: 17,
    bulletColor: '#FFFFFF'
  },
  'BOSG.12.2': {
    name: 'BOSG.12.2',
    type: 'SLUG_SHOTGUN',
    damage: 125, // One shot kill
    fireRate: 200,
    magSize: 2,
    reloadTime: 2400,
    spread: 0.015,
    recoil: 12.0,
    range: 1400,
    speed: 22,
    bulletColor: '#FF5722'
  },
  'DP-27': {
    name: 'DP-27 (Дисковый пулемёт)',
    type: 'LMG',
    damage: 48,
    fireRate: 550,
    magSize: 70,
    reloadTime: 3200,
    spread: 0.06,
    recoil: 4.0,
    range: 1300,
    speed: 16,
    bulletColor: '#FFB800',
    penetratesWalls: true
  },
  'AK-12': {
    name: 'АК-12',
    type: 'AR',
    damage: 42,
    fireRate: 850,
    magSize: 30,
    reloadTime: 2100,
    spread: 0.035,
    recoil: 3.8,
    range: 1200,
    speed: 18,
    bulletColor: '#FFE082'
  },
  'M590A1': {
    name: 'M590A1 (Помповый дробовик)',
    type: 'SHOTGUN',
    damage: 24, // Per pellet x 8
    pellets: 8,
    fireRate: 85,
    magSize: 7,
    reloadTime: 2800,
    spread: 0.18,
    recoil: 9.0,
    range: 600,
    speed: 14,
    bulletColor: '#FFA726'
  },
  'PMM': {
    name: 'Пистолет ПММ',
    type: 'PISTOL',
    damage: 61,
    fireRate: 450,
    magSize: 8,
    reloadTime: 1400,
    spread: 0.025,
    recoil: 2.5,
    range: 800,
    speed: 16,
    bulletColor: '#FFFFFF'
  },
  'Luison': {
    name: 'Luison (Глушитель)',
    type: 'PISTOL',
    damage: 65,
    fireRate: 500,
    magSize: 15,
    reloadTime: 1500,
    spread: 0.02,
    recoil: 2.0,
    range: 800,
    speed: 16,
    bulletColor: '#81C784',
    silent: true
  },
  'Ростовой щит "Скала"': {
    name: 'Щит Montagne',
    type: 'SHIELD',
    damage: 0,
    fireRate: 0,
    magSize: 0,
    reloadTime: 0,
    spread: 0,
    recoil: 0,
    isShield: true
  }
};

export function getWeaponConfig(weaponName) {
  for (const [key, val] of Object.entries(WEAPON_CONFIGS)) {
    if (weaponName.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(weaponName.toLowerCase())) {
      return { ...val };
    }
  }
  return { ...WEAPON_CONFIGS['R4-C'] };
}
