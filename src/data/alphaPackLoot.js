// Alpha Pack loot pool with rarities, weapons, and Black Ice skins

export const ALPHA_PACK_LOOT = [
  // BLACK ICE ❄️ (Mythic / Ultra Rare)
  {
    id: 'bi_r4c',
    name: 'BLACK ICE // ЧЁРНЫЙ ЛЁД',
    weapon: 'R4-C (Ash)',
    type: 'Оружейный скин',
    rarity: 'blackice',
    rarityLabel: 'ЧЁРНЫЙ ЛЁД',
    color: '#00F0FF',
    glow: 'rgba(0, 240, 255, 0.8)',
    desc: 'Легендарный морозный скин первого сезона Black Ice. Мечта каждого мейнера Эш!',
    icon: '❄️'
  },
  {
    id: 'bi_mp7',
    name: 'BLACK ICE // ЧЁРНЫЙ ЛЁД',
    weapon: 'MP7 (Bandit / Zero)',
    type: 'Оружейный скин',
    rarity: 'blackice',
    rarityLabel: 'ЧЁРНЫЙ ЛЁД',
    color: '#00F0FF',
    glow: 'rgba(0, 240, 255, 0.8)',
    desc: 'Холодное сверкающее лезвие в руках Бандита. +100 к точности триканья стен!',
    icon: '❄️'
  },
  {
    id: 'bi_416c',
    name: 'BLACK ICE // ЧЁРНЫЙ ЛЁД',
    weapon: '416-C Carbine (Jäger)',
    type: 'Оружейный скин',
    rarity: 'blackice',
    rarityLabel: 'ЧЁРНЫЙ ЛЁД',
    color: '#00F0FF',
    glow: 'rgba(0, 240, 255, 0.8)',
    desc: 'Напоминание о временах, когда у Егеря был ACOG. Чистый арктический лёд.',
    icon: '❄️'
  },
  {
    id: 'bi_smg11',
    name: 'BLACK ICE // ЧЁРНЫЙ ЛЁД',
    weapon: 'SMG-11 (Smoke / Mute)',
    type: 'Оружейный скин',
    rarity: 'blackice',
    rarityLabel: 'ЧЁРНЫЙ ЛЁД',
    color: '#00F0FF',
    glow: 'rgba(0, 240, 255, 0.8)',
    desc: 'Карманный пулемёт из чистого сибирского льда. Спиливает врагов за миллисекунду!',
    icon: '❄️'
  },

  // LEGENDARY (Gold)
  {
    id: 'leg_lord',
    name: 'ЗОЛОТОЙ ШЛЕМ ЛОРДА',
    weapon: 'Tachanka',
    type: 'Головной убор',
    rarity: 'legendary',
    rarityLabel: 'ЛЕГЕНДАРНЫЙ',
    color: '#FFB800',
    glow: 'rgba(255, 184, 0, 0.8)',
    desc: 'Чистое золото высшей пробы. Сияние ослепляет врагов ещё до выстрела.',
    icon: '👑'
  },
  {
    id: 'leg_plasma_pink',
    name: 'PLASMA PINK (ПЛАЗМА ПИНК)',
    weapon: 'Универсальный скин',
    type: 'Универсальный камуфляж',
    rarity: 'legendary',
    rarityLabel: 'ЛЕГЕНДАРНЫЙ',
    color: '#FF2E93',
    glow: 'rgba(255, 46, 147, 0.8)',
    desc: 'Самый токсичный розовый цвет в истории тактических шутеров.',
    icon: '💖'
  },

  // EPIC (Purple)
  {
    id: 'epic_royal',
    name: 'КОРОЛЕВСКИЙ ДАМАСК',
    weapon: 'АК-12 (Fuze / Ace)',
    type: 'Оружейный скин',
    rarity: 'epic',
    rarityLabel: 'ЭПИЧЕСКИЙ',
    color: '#A855F7',
    glow: 'rgba(168, 85, 247, 0.8)',
    desc: 'Гравированная дамасская сталь с позолотой для элитных штурмовиков.',
    icon: '🔮'
  },
  {
    id: 'epic_chibi_ash',
    name: 'БРЕЛОК "ЧИБИ ASH"',
    weapon: 'Все оружия',
    type: 'Брелок',
    rarity: 'epic',
    rarityLabel: 'ЭПИЧЕСКИЙ',
    color: '#A855F7',
    glow: 'rgba(168, 85, 247, 0.8)',
    desc: 'Маленькая Эш на стволе. Увеличивает скорость бега на ментальном уровне.',
    icon: '🧸'
  },

  // RARE (Blue)
  {
    id: 'rare_carbon',
    name: 'ТАКТИЧЕСКИЙ КАРБОН',
    weapon: 'MP5 (Doc / Rook)',
    type: 'Оружейный скин',
    rarity: 'rare',
    rarityLabel: 'РЕДКИЙ',
    color: '#3B82F6',
    glow: 'rgba(59, 130, 246, 0.8)',
    desc: 'Сверхлегкое матовое углеволокно с насечками.',
    icon: '🔷'
  },

  // UNCOMMON (Green / Light Blue)
  {
    id: 'uncommon_camo',
    name: 'ТАЙГА (ЗИМНИЙ КАМУФЛЯЖ)',
    weapon: 'SASG-12 (Kapkan)',
    type: 'Оружейный скин',
    rarity: 'uncommon',
    rarityLabel: 'НЕОБЫЧНЫЙ',
    color: '#10B981',
    glow: 'rgba(16, 185, 129, 0.8)',
    desc: 'Маскировка под сугробы для внезапных засад.',
    icon: '🌲'
  },

  // COMMON (Grey)
  {
    id: 'common_elephant',
    name: 'СЛОНОВАЯ КОЖА (ДЕШЁВЫЙ СЛОН)',
    weapon: 'PMM',
    type: 'Оружейный скин',
    rarity: 'common',
    rarityLabel: 'ОБЫЧНЫЙ',
    color: '#94A3B8',
    glow: 'rgba(148, 163, 184, 0.5)',
    desc: 'Бесплатный скин из Ubisoft Club, который есть абсолютно у каждого.',
    icon: '🐘'
  }
];

export function rollAlphaPack(currentChancePercent = 3.0) {
  // Check if roll succeeds against the current chance
  const roll = Math.random() * 100;
  const isWon = roll <= currentChancePercent;

  if (!isWon) {
    // Pack missed, chance increases by +2.0%
    return {
      won: false,
      newChance: Math.min(100, Math.round((currentChancePercent + 2.0) * 10) / 10),
      item: null
    };
  }

  // Pack won! Reset chance to 2.5% and pick loot with weighted probabilities:
  // Black Ice: 12%, Legendary: 18%, Epic: 25%, Rare: 25%, Uncommon/Common: 20%
  const itemRand = Math.random() * 100;
  let poolRarity = 'common';
  if (itemRand < 14) {
    poolRarity = 'blackice';
  } else if (itemRand < 32) {
    poolRarity = 'legendary';
  } else if (itemRand < 57) {
    poolRarity = 'epic';
  } else if (itemRand < 80) {
    poolRarity = 'rare';
  } else {
    poolRarity = 'uncommon';
  }

  const pool = ALPHA_PACK_LOOT.filter(i => i.rarity === poolRarity);
  const selectedItem = pool.length > 0 
    ? pool[Math.floor(Math.random() * pool.length)]
    : ALPHA_PACK_LOOT[0];

  return {
    won: true,
    newChance: 2.5,
    item: selectedItem
  };
}
