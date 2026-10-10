import { sound } from '../audio/soundEngine.js';
import { SHOP_ITEMS } from '../data/shopItems.js';
import confetti from 'canvas-confetti';

export class ShopModal {
  constructor(containerEl, getCurrenciesCb, setCurrenciesCb) {
    this.container = containerEl;
    this.getCurrencies = getCurrenciesCb;
    this.setCurrencies = setCurrenciesCb;
    this.isOpen = false;
    this.currentCategory = 'all';
    this.purchased = new Set(['diddy_baby_oil']); // Player already has a starter pack of baby oil!
  }

  open() {
    this.isOpen = true;
    sound.playModeSwitch();
    sound.speakTactical('Добро пожаловать в тактический черный рынок! Здесь есть детское масло и билеты на рейсы!', 'announcer');
    this.render();
  }

  close() {
    this.isOpen = false;
    this.container.innerHTML = '';
    sound.playClick();
  }

  render() {
    if (!this.isOpen) return;

    const { renown, r6Credits } = this.getCurrencies();

    let items = SHOP_ITEMS;
    if (this.currentCategory !== 'all') {
      items = items.filter(it => it.category === this.currentCategory);
    }

    this.container.innerHTML = `
      <div class="shop-modal">
        <div class="shop-backdrop"></div>
        <div class="shop-content">
          <!-- Top Header -->
          <div class="shop-header">
            <div class="shop-title-row">
              <span class="r6-tag-box">6</span>
              <div>
                <div class="shop-title-main">TACTICAL BLACK MARKET // ЧЁРНЫЙ РЫНОК СИДЖА</div>
                <div class="shop-title-sub">БАНДЛЫ P. DIDDY, СПИСКИ ЭПШТЕЙНА, BLACK ICE И ЭЛИТНЫЙ ЭКИП</div>
              </div>
            </div>

            <div class="shop-currencies-row">
              <div class="curr-badge renown">
                <span class="curr-icon">💠</span>
                <span class="curr-val">${renown.toLocaleString('ru-RU')} RENOWN</span>
              </div>
              <div class="curr-badge r6cred">
                <span class="curr-icon">🟡</span>
                <span class="curr-val">${r6Credits.toLocaleString('ru-RU')} CREDITS</span>
              </div>
              <button class="shop-close-btn" id="btn-close-shop">✕ ESC</button>
            </div>
          </div>

          <!-- Category Navigation Pills -->
          <div class="shop-nav-pills">
            <button class="shop-pill ${this.currentCategory === 'all' ? 'active' : ''}" data-cat="all">🔥 ВСЕ ТОВАРЫ (${SHOP_ITEMS.length})</button>
            <button class="shop-pill ${this.currentCategory === 'diddy_epstein' ? 'active' : ''}" data-cat="diddy_epstein">🧴 ДИДДИ & ЭПШТЕЙН SPECIAL</button>
            <button class="shop-pill ${this.currentCategory === 'skins' ? 'active' : ''}" data-cat="skins">👞 СКИНЫ & ТЯГИ</button>
            <button class="shop-pill ${this.currentCategory === 'weapons' ? 'active' : ''}" data-cat="weapons">🧊 ОРУЖИЕ BLACK ICE</button>
            <button class="shop-pill ${this.currentCategory === 'gadgets' ? 'active' : ''}" data-cat="gadgets">📦 ГАДЖЕТЫ & МЕМЫ</button>
          </div>

          <!-- Items Grid -->
          <div class="shop-grid">
            ${items.map(item => {
              const isOwned = this.purchased.has(item.id);
              const canAffordRenown = renown >= item.priceRenown;

              return `
                <div class="shop-card rarity-${item.rarity} ${isOwned ? 'owned' : ''}">
                  <div class="shop-card-glow"></div>
                  <div class="card-tag-badge">${item.tag}</div>
                  
                  <div class="shop-card-icon-area">
                    <span class="shop-item-emoji">${item.icon}</span>
                  </div>

                  <div class="shop-card-title">${item.title}</div>
                  <div class="shop-card-desc">${item.desc}</div>

                  <div class="shop-card-footer">
                    ${isOwned ? `
                      <button class="shop-btn-owned" disabled>
                        <span>✅ В ИНВЕНТАРЕ</span>
                      </button>
                    ` : `
                      <button class="shop-buy-btn ${canAffordRenown ? 'can-buy' : 'cant-afford'}" data-id="${item.id}" data-currency="renown">
                        <span>💠 ${item.priceRenown.toLocaleString('ru-RU')}</span>
                      </button>
                      <button class="shop-buy-btn r6-btn" data-id="${item.id}" data-currency="credits">
                        <span>🟡 ${item.priceCredits} R6</span>
                      </button>
                    `}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    // Event listeners
    this.container.querySelector('#btn-close-shop')?.addEventListener('click', () => this.close());
    this.container.querySelector('.shop-backdrop')?.addEventListener('click', () => this.close());

    this.container.querySelectorAll('.shop-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        sound.playClick();
        this.currentCategory = btn.getAttribute('data-cat');
        this.render();
      });
    });

    this.container.querySelectorAll('.shop-buy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const itemId = btn.getAttribute('data-id');
        const currType = btn.getAttribute('data-currency');
        this.buyItem(itemId, currType);
      });
    });
  }

  buyItem(itemId, currType) {
    const item = SHOP_ITEMS.find(it => it.id === itemId);
    if (!item) return;

    const { renown, r6Credits } = this.getCurrencies();

    if (currType === 'renown') {
      if (renown < item.priceRenown) {
        sound.playClick();
        alert(`❌ Не хватает Renown! Нужно еще ${(item.priceRenown - renown).toLocaleString('ru-RU')} очков. Сыграй 3D раунд!`);
        return;
      }
      this.setCurrencies(renown - item.priceRenown, r6Credits);
    } else {
      if (r6Credits < item.priceCredits) {
        sound.playClick();
        alert(`❌ Не хватает R6 Credits! Нужно ${item.priceCredits} кредитов.`);
        return;
      }
      this.setCurrencies(renown, r6Credits - item.priceCredits);
    }

    // Purchase successful!
    this.purchased.add(item.id);
    sound.playReveal(item.rarity);

    if (item.rarity === 'blackice' || item.rarity === 'legendary') {
      confetti({
        particleCount: 140,
        spread: 120,
        origin: { y: 0.5 }
      });
    }

    // Meme voice announcement on buy!
    if (item.id === 'diddy_baby_oil') {
      sound.speakTactical('Чиназес! 1000 банок детского масла получено! Скользи на дидди-пати без тормозов!', 'zoomer');
    } else if (item.id === 'epstein_flight_log') {
      sound.speakTactical('VIP-билет на секретный рейс получен! Твое имя внесено в черную книжку Эпштейна!', 'screamer');
    } else if (item.id === 'velvet_shoes_gold') {
      sound.speakTactical('ОХ ЭТИ ТЯГИ БАРХАТНЫЕ, КЕФТЕМЕ! Скуфы Всея Руси одобряют покупку!', 'lord');
    } else {
      sound.speakTactical(`Покупка успешна! ${item.title} теперь в твоем инвентаре!`, 'hype');
    }

    this.render();
  }
}
