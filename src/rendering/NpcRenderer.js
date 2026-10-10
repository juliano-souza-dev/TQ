import { BLACK_MARKET_SHIP } from '../ships/BlackMarketShip.js';
import { GOLDEN_GALLEON_SHIP, PUMPKIN_FLEET_GALLEON_SHIP, BLOOD_RED_CORSAIR_SHIP, TERROR_DO_MAR_SHIP, EMERALD_GHOST_SHIP } from '../ships/ShipRegistry.js';
import { STARTER_SHIP, getShipFrame } from '../ships/ShipRegistry.js';
import { HALLOWEEN_TABUADA_SHIP } from '../ships/HalloweenTabuadaShip.js';
import { FUGITIVE_FRIGATE_SHIP } from '../ships/FugitiveFrigateShip.js';
import { loadShipSprite } from '../ships/ShipSpriteLoader.js';
import { renderMonsterBlood } from '../monsters/MonsterBloodRenderer.js';
export class NpcRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.images = new Map();
    this.monsterImage = null;
  }
  async init() {
    const ships = [STARTER_SHIP, HALLOWEEN_TABUADA_SHIP];
    await Promise.all(ships.map(async ship => this.images.set(ship.id, await loadShipSprite(ship))));
    // O novo asset é opcional: se ainda não foi enviado ao GitHub,
    // o carregamento do oceano e dos NPCs existentes não pode falhar.
    await loadShipSprite(FUGITIVE_FRIGATE_SHIP)
      .then(image => this.images.set(FUGITIVE_FRIGATE_SHIP.id, image))
      .catch(() => console.warn('Fragata Sombra Fugitiva aguardando sprite no repositório.'));
    await Promise.all([GOLDEN_GALLEON_SHIP,PUMPKIN_FLEET_GALLEON_SHIP,BLACK_MARKET_SHIP,BLOOD_RED_CORSAIR_SHIP,TERROR_DO_MAR_SHIP,EMERALD_GHOST_SHIP].map(ship=>
      loadShipSprite(ship).then(image=>this.images.set(ship.id,image))
        .catch(()=>console.warn('NPC aguardando sprite:',ship.id))));
    const image = new Image();
    image.src = new URL('../../assets/monsters/sea_monster_kraken.webp', import.meta.url).href;
    try { await image.decode(); this.monsterImage = image; } catch (error) { console.warn('Monstro não carregado:', error); }
  }
  hasShipSprite(id) { return this.images.has(id); }
  render(entities, camera, zoom = 1, selectedId = null, krakenAttacks = [], now = performance.now()) {
    const bounds = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(bounds.width * dpr));
    const h = Math.max(1, Math.round(bounds.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w; this.canvas.height = h;
    }
    const ctx = this.ctx; ctx.clearRect(0, 0, w, h);
    const size = Math.min(w * 0.32, h * 0.32, 185 * dpr) * zoom;
    for (const npc of entities.values()) {
      if (npc.type !== 'npc' && npc.type !== 'monster' || npc.health <= 0) continue;
      if (npc.type === 'monster') {
        const monsterSize = size * 1.75;
        const x = w / 2 + (npc.x - camera.x) * zoom * dpr;
        const y = h / 2 + (npc.y - camera.y) * zoom * dpr;
        if (x < -monsterSize || x > w + monsterSize || y < -monsterSize || y > h + monsterSize) continue;
        const image = this.monsterImage;
        const attack = krakenAttacks.find(item => item.from && item.monsterId === npc.id && now >= item.startTime && now - item.startTime < item.duration);
        const elapsed = attack ? now - attack.startTime : -1;
        if (image) {
          // Atlas idle 4x4: 16 quadros de 400px, 105ms por quadro.
          // A posição no mundo fica fixa: só muda a região da textura desenhada.
          // A fonte pode ser um atlas 1600x1600 ou um WebP animado 400x400.
          // Nunca recortar 4x4 um WebP que já contém frames internos.
          const isAtlas = image.naturalWidth >= 1600 && image.naturalHeight >= 1600;
          // During the strike only the WebGL tentacles are visible.
          // Travel in both directions lasts 450ms; the body returns at its spawn.
          const diving=elapsed>=0&&elapsed<300;
          const resurfacing=elapsed>=1420&&elapsed<1720;
          const hiddenBody=elapsed>=300&&elapsed<1420;
          if(hiddenBody)continue;
          const alpha=diving?1-elapsed/300:resurfacing?(elapsed-1420)/300:1;
          ctx.save();
          ctx.globalAlpha*=Math.max(0,alpha);
          const spriteX=x-monsterSize/2;
          const spriteY=y-monsterSize/2+(diving?18*dpr*elapsed/300:resurfacing?18*dpr*(1-alpha):0);
          if (isAtlas) {
            const columns = 4, frameDurationMs = 105;
            const frame = Math.floor((npc.animationTimeMs ?? 0) / frameDurationMs) % 16;
            const frameW = image.naturalWidth / columns;
            const frameH = image.naturalHeight / columns;
            ctx.drawImage(image, (frame % columns) * frameW,
              Math.floor(frame / columns) * frameH, frameW, frameH,
              spriteX, spriteY, monsterSize, monsterSize);
          } else {
            ctx.drawImage(image, spriteX, spriteY, monsterSize, monsterSize);
          }
          ctx.restore();
          if (diving || resurfacing) continue;
          renderMonsterBlood(ctx, npc, x, y, monsterSize, performance.now());
          const barW = monsterSize * 0.65;
          ctx.fillStyle = '#152233'; ctx.fillRect(x-barW/2,y-monsterSize*0.58,barW,6*dpr);
          ctx.fillStyle = '#db5655'; ctx.fillRect(x-barW/2,y-monsterSize*0.58,barW * Math.max(0,npc.health/npc.maxHealth),6*dpr);
        }
        continue;
      }
      const ship = npc.shipId === BLACK_MARKET_SHIP.id ? BLACK_MARKET_SHIP
        : npc.shipId === GOLDEN_GALLEON_SHIP.id ? GOLDEN_GALLEON_SHIP
        : npc.shipId === PUMPKIN_FLEET_GALLEON_SHIP.id ? PUMPKIN_FLEET_GALLEON_SHIP
        : npc.shipId === BLOOD_RED_CORSAIR_SHIP.id ? BLOOD_RED_CORSAIR_SHIP
        : npc.shipId === TERROR_DO_MAR_SHIP.id ? TERROR_DO_MAR_SHIP
        : npc.shipId === EMERALD_GHOST_SHIP.id ? EMERALD_GHOST_SHIP
        : npc.shipId === FUGITIVE_FRIGATE_SHIP.id ? FUGITIVE_FRIGATE_SHIP
        : npc.shipId === HALLOWEEN_TABUADA_SHIP.id ? HALLOWEEN_TABUADA_SHIP : STARTER_SHIP;
      const image = this.images.get(ship.id);
      if (!image) continue;
      const columns = ship.sprite.columns;
      const rows = ship.sprite.rows;
      const frameW = image.width / columns;
      const frameH = image.height / rows;
      const frame = getShipFrame(npc.heading ?? 0, ship);
      const shipSize = ship.id === FUGITIVE_FRIGATE_SHIP.id ? size * 0.7 : size;
      const x = w / 2 + (npc.x - camera.x) * zoom * dpr;
      const y = h / 2 + (npc.y - camera.y) * zoom * dpr;
      if (x < -shipSize || x > w + shipSize || y < -shipSize || y > h + shipSize) continue;
      if (npc.id === selectedId) {
        ctx.save();
        ctx.strokeStyle = '#ffd36c'; ctx.lineWidth = 3 * dpr;
        ctx.shadowColor = '#ffd36c'; ctx.shadowBlur = 12 * dpr;
        ctx.beginPath(); ctx.ellipse(x, y + shipSize * 0.20, shipSize * 0.37, shipSize * 0.17, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
      // Espelhamento opcional, exclusivamente no desenho do sprite.
      // O ID, a posição, o rumo, a colisão e a seleção permanecem inalterados.
      const headingStep = ship.sprite.angleStepDegrees;
      const headingIndex = Math.round(((((npc.heading ?? 0) % 360) + 360) % 360) / headingStep)
        % ship.sprite.framesByHeading.length;
      const flipX = ship.sprite.flipXByHeading?.[headingIndex] === true;
      if (flipX) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(-1, 1);
        ctx.drawImage(image, (frame % columns) * frameW, Math.floor(frame / columns) * frameH,
          frameW, frameH, -shipSize / 2, -shipSize / 2, shipSize, shipSize);
        ctx.restore();
      } else {
        ctx.drawImage(image, (frame % columns) * frameW, Math.floor(frame / columns) * frameH,
          frameW, frameH, x - shipSize / 2, y - shipSize / 2, shipSize, shipSize);
      }
      {
        ctx.save();
        ctx.font = 'bold ' + Math.round(13 * dpr) + 'px system-ui';
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.lineWidth = 4 * dpr; ctx.strokeStyle = '#061729';
        ctx.strokeText(npc.name, x, y - shipSize * 0.57);
        ctx.fillStyle = '#fff0bc'; ctx.fillText(npc.name, x, y - shipSize * 0.57);
        ctx.restore();
      }
      const barW = shipSize * 0.55;
      ctx.fillStyle = '#152233'; ctx.fillRect(x - barW / 2, y - shipSize * 0.52, barW, 5 * dpr);
      ctx.fillStyle = '#e45e52'; ctx.fillRect(x - barW / 2, y - shipSize * 0.52, barW * npc.health / npc.maxHealth, 5 * dpr);
    }
  }
}
