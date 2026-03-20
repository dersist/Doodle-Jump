// ═══════════════════════════════════════════
//  SHOP.JS — Shop UI + purchase logic
// ═══════════════════════════════════════════

const Shop = (() => {
  function init() {
    // Tab switching
    document.querySelectorAll('.shop-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.shop-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('shop-' + tab.dataset.tab).classList.add('active');
      });
    });

    document.getElementById('shop-back').addEventListener('click', () => {
      UI.showScreen('main-menu');
    });
  }

  function open(fromGame = false) {
    renderAbilities();
    renderPlayerUpgrades();
    document.getElementById('shop-coins-val').textContent = GameState.totalCoins;

    if (fromGame) {
      document.getElementById('shop-back').onclick = () => {
        UI.showScreen('game-screen');
        UI.hidePause();
      };
    } else {
      document.getElementById('shop-back').onclick = () => UI.showScreen('main-menu');
    }

    UI.showScreen('shop-screen');
  }

  function renderAbilities() {
    const container = document.getElementById('ability-list');
    container.innerHTML = '';

    for (const ability of Items.getAllBaseAbilities()) {
      const owned = GameState.ownedAbilities[ability.id];
      const canAfford = GameState.totalCoins >= ability.price;

      const card = document.createElement('div');
      card.className = 'ability-card' + (owned ? ' owned' : '');

      // Header
      const header = document.createElement('div');
      header.className = 'ability-card-header';

      const btnText = owned ? '✓ OWNED' : (canAfford ? 'BUY ' + ability.price : ability.price + ' ◈');
      const btnClass = owned ? 'owned-btn' : (canAfford ? 'can-buy' : 'cant-afford');

      header.innerHTML = `
        <div class="ability-icon">${ability.icon}</div>
        <div class="ability-info">
          <div class="ability-name">${ability.name}</div>
          <div class="ability-desc">${ability.desc}</div>
        </div>
        ${!owned ? `<div class="ability-price">${ability.price} ◈</div>` : ''}
        <button class="ability-buy-btn ${btnClass}" data-id="${ability.id}">
          ${btnText}
        </button>
      `;

      if (!owned) {
        header.querySelector('button').addEventListener('click', (e) => {
          e.stopPropagation();
          buyAbility(ability.id);
        });
      }

      card.appendChild(header);

      // Upgrade tree (only if owned)
      if (owned) {
        const tree = document.createElement('div');
        tree.className = 'upgrade-tree';
        tree.innerHTML = `<div class="upgrade-tree-title">UPGRADES (${owned.upgrades.length}/9)</div>`;

        const upgrades = Items.getUpgradesForAbility(ability.id);
        upgrades.forEach((up, i) => {
          const isPurchased = owned.upgrades.includes(up.id);
          const isLocked = i > 0 && !owned.upgrades.includes(upgrades[i-1].id);
          const canAffordUp = GameState.totalCoins >= up.price;

          let btnClass2 = 'locked';
          let btnText2 = '🔒';
          if (isPurchased) { btnClass2 = 'purchased'; btnText2 = '✓'; }
          else if (!isLocked && canAffordUp) { btnClass2 = 'can-buy'; btnText2 = 'BUY'; }
          else if (!isLocked && !canAffordUp) { btnClass2 = 'cant-afford'; btnText2 = up.price + '◈'; }

          const row = document.createElement('div');
          row.className = 'upgrade-item';
          row.innerHTML = `
            <div class="upgrade-num">${i + 1}</div>
            <div class="upgrade-desc">${up.name}: ${up.desc}</div>
            <div class="upgrade-price">${isPurchased ? '✓' : up.price + '◈'}</div>
            <button class="upgrade-buy-btn ${btnClass2}" data-ability="${ability.id}" data-upgrade="${up.id}">
              ${btnText2}
            </button>
          `;

          if (!isPurchased && !isLocked) {
            row.querySelector('button').addEventListener('click', () => {
              buyUpgrade(ability.id, up.id);
            });
          }

          tree.appendChild(row);
        });

        // Sell button
        const sellRow = document.createElement('div');
        sellRow.style.cssText = 'margin-top:10px;display:flex;justify-content:flex-end;gap:8px;';
        const refund = Math.floor(ability.price * 0.5);
        sellRow.innerHTML = `
          <button class="upgrade-buy-btn cant-afford" style="color:#ff0080;border-color:rgba(255,0,128,0.3);"
            onclick="Shop.sellAbility('${ability.id}')">
            SELL (${refund}◈ refund)
          </button>
        `;
        tree.appendChild(sellRow);

        card.appendChild(tree);
      }

      container.appendChild(card);
    }
  }

  function renderPlayerUpgrades() {
    const container = document.getElementById('upgrade-list');
    container.innerHTML = '';

    for (const def of PlayerUpgrades.getDefs()) {
      const currentLevel = PlayerUpgrades.getLevel(def.id);
      const card = document.createElement('div');
      card.className = 'player-upgrade-card';

      card.innerHTML = `
        <div class="pup-header">
          <div class="pup-icon">${def.icon}</div>
          <div class="pup-name">${def.name}</div>
          <div class="pup-level">LVL ${currentLevel}/5</div>
        </div>
        <div class="pup-levels" id="pup-levels-${def.id}"></div>
      `;

      const levelsDiv = card.querySelector('.pup-levels');
      def.levels.forEach((level, i) => {
        const lvlNum = i + 1;
        const purchased = currentLevel >= lvlNum;
        const isNext = currentLevel === i;
        const canAfford = GameState.totalCoins >= level.price;

        let btnClass = 'cant-afford';
        if (purchased) btnClass = 'purchased';
        else if (isNext && canAfford) btnClass = 'can-buy';

        const btn = document.createElement('button');
        btn.className = 'pup-level-btn ' + btnClass;
        btn.innerHTML = `
          <div>LVL ${lvlNum}</div>
          <div>${level.desc}</div>
          <div>${purchased ? '✓' : level.price + '◈'}</div>
        `;

        if (isNext && canAfford) {
          btn.addEventListener('click', () => {
            if (PlayerUpgrades.buyLevel(def.id, lvlNum)) {
              document.getElementById('shop-coins-val').textContent = GameState.totalCoins;
              renderPlayerUpgrades();
              UI.showToast(def.name + ' upgraded!');
            }
          });
        }

        levelsDiv.appendChild(btn);
      });

      container.appendChild(card);
    }
  }

  function buyAbility(abilityId) {
    const ability = Items.getBaseAbility(abilityId);
    if (!ability) return;
    if (GameState.ownedAbilities[abilityId]) return;
    if (GameState.totalCoins < ability.price) {
      UI.showToast('NOT ENOUGH COINS!');
      return;
    }

    GameState.totalCoins -= ability.price;
    GameState.ownedAbilities[abilityId] = { upgrades: [] };
    Save.save();

    document.getElementById('shop-coins-val').textContent = GameState.totalCoins;
    renderAbilities();
    UI.showToast(ability.name + ' ACQUIRED!');
    SFX.play('purchase');
  }

  function buyUpgrade(abilityId, upgradeId) {
    const owned = GameState.ownedAbilities[abilityId];
    if (!owned) return;

    const upgrades = Items.getUpgradesForAbility(abilityId);
    const upDef = Items.getUpgrade(abilityId, upgradeId);
    if (!upDef) return;
    if (owned.upgrades.includes(upgradeId)) return;

    // Must buy in order
    const idx = upgrades.findIndex(u => u.id === upgradeId);
    if (idx > 0 && !owned.upgrades.includes(upgrades[idx-1].id)) {
      UI.showToast('MUST BUY PREVIOUS UPGRADE FIRST!');
      return;
    }

    if (GameState.totalCoins < upDef.price) {
      UI.showToast('NOT ENOUGH COINS!');
      return;
    }

    GameState.totalCoins -= upDef.price;
    owned.upgrades.push(upgradeId);
    Save.save();

    document.getElementById('shop-coins-val').textContent = GameState.totalCoins;
    renderAbilities();
    UI.showToast(upDef.name + ' UPGRADED!');
    SFX.play('purchase');
  }

  function sellAbility(abilityId) {
    const owned = GameState.ownedAbilities[abilityId];
    if (!owned) return;

    const ability = Items.getBaseAbility(abilityId);
    let refund = Math.floor(ability.price * 0.5);

    // Refund upgrades too
    const upgrades = Items.getUpgradesForAbility(abilityId);
    for (const upId of owned.upgrades) {
      const up = upgrades.find(u => u.id === upId);
      if (up) refund += Math.floor(up.price * 0.5);
    }

    // Unequip if in inventory
    for (let s = 1; s <= 3; s++) {
      if (Inventory.getSlot(s) === abilityId) Inventory.unequip(s);
    }

    delete GameState.ownedAbilities[abilityId];
    GameState.totalCoins += refund;
    Save.save();

    document.getElementById('shop-coins-val').textContent = GameState.totalCoins;
    renderAbilities();
    UI.showToast('SOLD! +" + refund + "◈ REFUNDED');
    SFX.play('sell');
  }

  // Expose for inline onclick
  window.Shop = { sellAbility };

  return { init, open, renderAbilities, renderPlayerUpgrades, buyAbility, buyUpgrade, sellAbility };
})();
