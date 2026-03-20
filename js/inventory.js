// ═══════════════════════════════════════════
//  INVENTORY.JS — 3-slot ability inventory
// ═══════════════════════════════════════════

const Inventory = (() => {
  // slots[1..3] = ability id or null
  let slots = { 1: null, 2: null, 3: null };

  function init() {
    // Restore from GameState if available
    if (GameState.inventorySlots) {
      slots = { ...GameState.inventorySlots };
    } else {
      slots = { 1: null, 2: null, 3: null };
    }
  }

  function equip(abilityId, slotNum) {
    // Remove from old slot if already equipped
    for (const [k, v] of Object.entries(slots)) {
      if (v === abilityId) slots[k] = null;
    }
    slots[slotNum] = abilityId;
    GameState.inventorySlots = { ...slots };
    Save.save();
    UI.updateAbilityHUD();
  }

  function unequip(slotNum) {
    slots[slotNum] = null;
    GameState.inventorySlots = { ...slots };
    Save.save();
    UI.updateAbilityHUD();
  }

  function getSlot(num) { return slots[num]; }

  function getAll() { return { ...slots }; }

  function activateSlot(slotNum) {
    const id = slots[slotNum];
    if (!id) return false;
    return Abilities.activate(id);
  }

  function isEquipped(abilityId) {
    return Object.values(slots).includes(abilityId);
  }

  return { init, equip, unequip, getSlot, getAll, activateSlot, isEquipped };
})();
