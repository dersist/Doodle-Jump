// ═══════════════════════════════════════════════════════════════
//  COSMETICS.JS — Skins, trails, particles, backgrounds
// ═══════════════════════════════════════════════════════════════
const Cosmetics = (() => {

  const ITEMS = {
    skins: [
      { id:'skin_default', name:'Neon Cyan',    price:0,    colors:['#00f5ff','#0066ff','#000066'], glow:'#00f5ff' },
      { id:'skin_magenta', name:'Plasma Pink',  price:500,  colors:['#ff0080','#990040','#300010'], glow:'#ff0080' },
      { id:'skin_green',   name:'Toxic Green',  price:500,  colors:['#00ff88','#00aa44','#002211'], glow:'#00ff88' },
      { id:'skin_gold',    name:'Golden God',   price:1000, colors:['#ffcc00','#ff8800','#331a00'], glow:'#ffcc00' },
      { id:'skin_void',    name:'Void Walker',  price:1000, colors:['#440044','#220022','#000000'], glow:'#9900ff' },
      { id:'skin_white',   name:'Plasma White', price:1500, colors:['#ffffff','#bbddff','#445566'], glow:'#ffffff' },
      { id:'skin_royal',   name:'Royal Blue',   price:800,  colors:['#4488ff','#0033cc','#001155'], glow:'#4488ff' },
      { id:'skin_sunset',  name:'Sunset',       price:800,  colors:['#ff6600','#ff3300','#330000'], glow:'#ff6600' },
      { id:'skin_rainbow', name:'Rainbow',      price:3000, colors:'rainbow', glow:'#ffffff' },
      { id:'skin_chrome',  name:'Chromatic',    price:5000, colors:'chrome',  glow:'#aaffff' },
    ],
    trails: [
      { id:'trail_none',    name:'No Trail',     price:0,    color:null },
      { id:'trail_cyan',    name:'Cyan Spark',   price:300,  color:'#00f5ff' },
      { id:'trail_pink',    name:'Magenta',      price:300,  color:'#ff0080' },
      { id:'trail_fire',    name:'Fire',         price:600,  color:'#ff4400' },
      { id:'trail_ice',     name:'Ice',          price:600,  color:'#88ddff' },
      { id:'trail_gold',    name:'Gold Dust',    price:800,  color:'#ffcc00' },
      { id:'trail_green',   name:'Toxic',        price:600,  color:'#00ff88' },
      { id:'trail_rainbow', name:'Rainbow',      price:2000, color:'rainbow' },
    ],
    particles: [
      { id:'part_default', name:'Default',      price:0,    color:'#00f5ff', style:'circle' },
      { id:'part_star',    name:'Stars',         price:400,  color:'#ffcc00', style:'star' },
      { id:'part_heart',   name:'Hearts',        price:600,  color:'#ff0080', style:'heart' },
      { id:'part_fire',    name:'Ember',         price:600,  color:'#ff4400', style:'fire' },
      { id:'part_ice',     name:'Snowflake',     price:600,  color:'#88ddff', style:'circle' },
      { id:'part_coins',   name:'Coins',         price:800,  color:'#ffcc00', style:'coin' },
      { id:'part_rainbow', name:'Rainbow',       price:2000, color:'rainbow', style:'circle' },
    ],
  };

  function getState() {
    if (!GameState.cosmetics) {
      GameState.cosmetics = {
        owned: ['skin_default','trail_none','part_default'],
        equipped: { skin:'skin_default', trail:'trail_none', particle:'part_default' },
      };
    }
    return GameState.cosmetics;
  }

  function getOwned()    { return getState().owned; }
  function getEquipped() { return getState().equipped; }
  function owns(id)      { return getOwned().includes(id); }

  function purchase(id) {
    const st = getState();
    if (st.owned.includes(id)) return false;
    const item = findItem(id);
    if (!item) return false;
    if (GameState.totalCoins < item.price) {
      UI.showToast('Not enough coins!', 1500);
      return false;
    }
    GameState.totalCoins -= item.price;
    st.owned.push(id);
    Save.save();
    SFX.play('purchase');
    UI.showToast(`✅ ${item.name} unlocked!`, 1500);
    return true;
  }

  function equip(id) {
    if (!owns(id)) return;
    const item = findItem(id);
    if (!item) return;
    const st = getState();
    if (ITEMS.skins.find(i => i.id === id))     st.equipped.skin     = id;
    if (ITEMS.trails.find(i => i.id === id))    st.equipped.trail    = id;
    if (ITEMS.particles.find(i => i.id === id)) st.equipped.particle = id;
    Save.save();
  }

  function findItem(id) {
    for (const cat of Object.values(ITEMS))
      for (const item of cat) if (item.id === id) return item;
    return null;
  }

  function getEquippedSkin()     { return findItem(getEquipped().skin)     || ITEMS.skins[0]; }
  function getEquippedTrail()    { return findItem(getEquipped().trail)    || ITEMS.trails[0]; }
  function getEquippedParticle() { return findItem(getEquipped().particle) || ITEMS.particles[0]; }

  // Returns current body colors [inner, mid, outer] for this frame
  function getBodyColors(frame) {
    const skin = getEquippedSkin();
    if (skin.colors === 'rainbow') {
      const hue = (frame * 2) % 360;
      return [`hsl(${hue},100%,70%)`, `hsl(${(hue+40)%360},100%,50%)`, `hsl(${(hue+80)%360},90%,30%)`];
    }
    if (skin.colors === 'chrome') {
      const hue = (frame * 3) % 360;
      return [`hsl(${hue},80%,85%)`, `hsl(${(hue+60)%360},60%,60%)`, `hsl(${(hue+120)%360},40%,40%)`];
    }
    return skin.colors;
  }

  function getTrailColor(frame) {
    const trail = getEquippedTrail();
    if (!trail.color) return null;
    if (trail.color === 'rainbow') return `hsl(${(frame * 4) % 360},100%,65%)`;
    return trail.color;
  }

  function getBounceColor(frame) {
    const p = getEquippedParticle();
    if (p.color === 'rainbow') return `hsl(${(frame * 5) % 360},100%,65%)`;
    return p.color;
  }

  function getGlow() { return getEquippedSkin().glow || '#00f5ff'; }

  function getAllItems() { return ITEMS; }

  return {
    getState, getOwned, getEquipped, owns, purchase, equip,
    getEquippedSkin, getEquippedTrail, getEquippedParticle,
    getBodyColors, getTrailColor, getBounceColor, getGlow,
    getAllItems, findItem,
  };
})();
