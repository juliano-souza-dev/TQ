import { BLACK_MARKET_SHIP } from '../ships/BlackMarketShip.js';
import { GOLDEN_GALLEON_SHIP, PUMPKIN_FLEET_GALLEON_SHIP, BLOOD_RED_CORSAIR_SHIP, TERROR_DO_MAR_SHIP, EMERALD_GHOST_SHIP } from '../ships/ShipRegistry.js';
import { STARTER_SHIP, getShipFrame } from '../ships/ShipRegistry.js';
import { HALLOWEEN_TABUADA_SHIP } from '../ships/HalloweenTabuadaShip.js';
import { FUGITIVE_FRIGATE_SHIP, GREEN_GHOST_FUGITIVE_SHIP } from '../ships/FugitiveFrigateShip.js';
import { loadShipSprite } from '../ships/ShipSpriteLoader.js';
import { renderMonsterBlood } from '../monsters/MonsterBloodRenderer.js';
import { leviathanFrameForHeading } from '../monsters/LeviathanMouthMap.js';

export class NpcRenderer {
  constructor(canvas,frontCanvas=null) {
    this.canvas = canvas;
    this.frontCanvas=frontCanvas;
    this.frontCtx=frontCanvas?.getContext('2d')??null;
    this.ctx = canvas.getContext('2d');
    this.images = new Map();
    this.monsterImage = null;
    this.leviathanImage = null;
    this.waterlines = new Map();
    this.foam = [];
    this.lastFoamAt = 0;
  }
  async init() {
    const ships = [STARTER_SHIP, HALLOWEEN_TABUADA_SHIP];
    await Promise.all(ships.map(async ship => this.images.set(ship.id, await loadShipSprite(ship))));
    // O novo asset é opcional: se ainda não foi enviado ao GitHub,
    // o carregamento do oceano e dos NPCs existentes não pode falhar.
    await loadShipSprite(FUGITIVE_FRIGATE_SHIP)
      .then(image => this.images.set(FUGITIVE_FRIGATE_SHIP.id, image))
      .catch(() => console.warn('Fragata Sombra Fugitiva aguardando sprite no repositório.'));
    await Promise.all([GREEN_GHOST_FUGITIVE_SHIP,GOLDEN_GALLEON_SHIP,PUMPKIN_FLEET_GALLEON_SHIP,BLACK_MARKET_SHIP,BLOOD_RED_CORSAIR_SHIP,TERROR_DO_MAR_SHIP,EMERALD_GHOST_SHIP].map(ship=>
      loadShipSprite(ship).then(image=>this.images.set(ship.id,image))
        .catch(()=>console.warn('NPC aguardando sprite:',ship.id))));
    const image = new Image();
    image.src = new URL('../../assets/monsters/sea_monster_kraken.webp', import.meta.url).href;
    try { await image.decode(); this.monsterImage = image; } catch (error) { console.warn('Monstro não carregado:', error); }
    const leviathan=new Image();
    leviathan.src=new URL('../../assets/monsters/leviathan_sprite_sheet_transparente_alta_compressao.webp',import.meta.url).href;
    try { await leviathan.decode(); this.leviathanImage=leviathan; }
    catch(error){ console.warn('Sprite do Leviatã não carregado:',error); }
  }
  scanWaterlines(id,image,columns=4,rows=4){
    if(this.waterlines.has(id)||!image?.naturalWidth)return;
    try{
      const cw=Math.floor(image.naturalWidth/columns),ch=Math.floor(image.naturalHeight/rows);
      const canvas=document.createElement('canvas');canvas.width=cw;canvas.height=ch;
      const ctx=canvas.getContext('2d',{willReadFrequently:true}),lines=[];
      for(let frame=0;frame<columns*rows;frame++){
        ctx.clearRect(0,0,cw,ch);
        ctx.drawImage(image,(frame%columns)*cw,Math.floor(frame/columns)*ch,cw,ch,0,0,cw,ch);
        const data=ctx.getImageData(0,0,cw,ch).data;
        let bottom=ch-1;
        outer:for(let y=ch-1;y>=0;y--)for(let x=0;x<cw;x++){
          if(data[(y*cw+x)*4+3]>12){bottom=y;break outer;}
        }
        lines.push(bottom/ch);
      }
      this.waterlines.set(id,lines);
    }catch(error){console.warn('Waterline fallback',id,error);}
  }
  updateFoam(entities,now){
    const dt=this.lastFoamAt?Math.min(64,Math.max(0,now-this.lastFoamAt)):16;
    this.lastFoamAt=now;
    for(const p of this.foam){p.age+=dt;p.x+=p.vx*dt/1000;p.y+=p.vy*dt/1000;}
    this.foam=this.foam.filter(p=>p.age<2000);
    for(const npc of entities.values()){
      if((npc.type!=='npc'&&npc.type!=='monster')||npc.health<=0)continue;
      const previous=npc._foamLast;
      npc._foamLast={x:npc.x,y:npc.y};
      if(!previous)continue;
      const dx=npc.x-previous.x,dy=npc.y-previous.y;
      const len=Math.hypot(dx,dy);
      if(len<.25||this.foam.length>240)continue;
      const fx=dx/len,fy=dy/len,sideX=-fy,sideY=fx;
      for(const side of [-1,1]){
        this.foam.push({x:npc.x-fx*35+sideX*20*side,
          y:npc.y-fy*35+sideY*20*side,
          vx:-fx*21+sideX*9*side,vy:-fy*21+sideY*9*side,
          size:5+Math.random()*7,age:0});
      }
    }
  }
  paintFoam(ctx,w,h,camera,zoom,dpr,oceanTimeMs){
    ctx.save();ctx.globalCompositeOperation='screen';
    for(const p of this.foam){
      const alpha=Math.max(0,1-p.age/2000);
      const x=w/2+(p.x-camera.x)*zoom*dpr;
      const oceanT=oceanTimeMs/1000;
      const ripple=Math.sin(p.y*.018+p.x*.004+oceanT*.65)*1.8;
      const y=h/2+(p.y-camera.y+ripple)*zoom*dpr;
      const r=Math.max(1,p.size*zoom*dpr*(.4+.6*alpha));
      ctx.fillStyle='rgba(225,255,249,'+(.35*alpha)+')';
      ctx.beginPath();ctx.ellipse(x,y,r,r*.4,0,0,Math.PI*2);ctx.fill();
    }ctx.restore();
  }
  hasShipSprite(id) { return this.images.has(id); }
  render(entities, camera, zoom = 1, selectedId = null, krakenAttacks = [], now = performance.now(), oceanTimeMs = now, playerY = null) {
    const bounds = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(bounds.width * dpr));
    const h = Math.max(1, Math.round(bounds.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w; this.canvas.height = h;
    }
    if(this.frontCanvas&&this.frontCtx){
      if(this.frontCanvas.width!==w||this.frontCanvas.height!==h){
        this.frontCanvas.width=w;this.frontCanvas.height=h;
      }
      this.frontCtx.clearRect(0,0,w,h);
    }
    const baseCtx=this.ctx;
    let ctx=baseCtx;ctx.clearRect(0, 0, w, h);
    this.updateFoam(entities,now);
    this.paintFoam(ctx,w,h,camera,zoom,dpr,oceanTimeMs);
    const size = Math.min(w * 0.32, h * 0.32, 185 * dpr) * zoom;
    const ordered=[...entities.values()].filter(n=>n.type==='npc'||n.type==='monster').sort((a,b)=>a.y-b.y);
    for (const npc of ordered) {
      ctx=(this.frontCtx&&Number.isFinite(playerY)&&npc.y>playerY)?this.frontCtx:baseCtx;
      if ((npc.type !== 'npc' && npc.type !== 'monster') || npc.health <= 0 || npc.phasedOut) continue;
      if (npc.type === 'monster') {
        const monsterSize = size * (npc.archetype==='sea-monster-leviathan'?2.6:1.75);
        const x = w / 2 + (npc.x - camera.x) * zoom * dpr;
        const y = h / 2 + (npc.y - camera.y) * zoom * dpr;
        if (x < -monsterSize || x > w + monsterSize || y < -monsterSize || y > h + monsterSize) continue;
        const image = npc.archetype==='sea-monster-leviathan' ? this.leviathanImage : this.monsterImage;
        const attack = krakenAttacks.find(item => item.from && item.monsterId === npc.id && now >= item.startTime && now - item.startTime < item.duration);
        const elapsed = attack ? now - attack.startTime : -1;
        if (image) {
          // Atlas idle 4x4: 16 quadros de 400px, 105ms por quadro.
          // A posição no mundo fica fixa: só muda a região da textura desenhada.
          // A fonte pode ser um atlas 1600x1600 ou um WebP animado 400x400.
          // Nunca recortar 4x4 um WebP que já contém frames internos.
          const isAtlas = npc.archetype === 'sea-monster-leviathan' || (image.naturalWidth >= 1600 && image.naturalHeight >= 1600);
          // During the strike only the WebGL tentacles are visible.
          // Travel in both directions lasts 450ms; the body returns at its spawn.
          const leviathan=npc.archetype==='sea-monster-leviathan';
          const diving=!leviathan&&elapsed>=0&&elapsed<300;
          const resurfacing=!leviathan&&elapsed>=1420&&elapsed<1720;
          const hiddenBody=!leviathan&&elapsed>=300&&elapsed<1420;
          if(hiddenBody)continue;
          const ambush=npc.ambushPhase;
          if(leviathan&&ambush==='submerged')continue;
          const fadeDown=leviathan&&ambush==='diving'?Math.max(0,1-(npc.ambushElapsedMs||0)/680):1;
          const fadeUp=leviathan&&ambush==='surfacing'?Math.min(1,(npc.ambushElapsedMs||0)/720):1;
          const alpha=(diving?1-elapsed/300:resurfacing?(elapsed-1420)/300:1)*fadeDown*fadeUp;
          ctx.save();
          ctx.globalAlpha*=Math.max(0,alpha);
          const spriteX=x-monsterSize/2;
          const spriteY=y-monsterSize/2+(diving?18*dpr*elapsed/300:resurfacing?18*dpr*(1-alpha):0)+(leviathan&&(ambush==='diving'||ambush==='surfacing')?(1-alpha)*monsterSize*.22:0);
          if (isAtlas) {
            const columns = 4, frameDurationMs = npc.archetype==='sea-monster-leviathan' ? 420 : 105;
            const frame = leviathan
              ? leviathanFrameForHeading(npc.heading)
              : Math.floor((npc.animationTimeMs ?? 0) / frameDurationMs) % 16;
            this.scanWaterlines(npc.archetype,image,columns,columns);
            const frameW = image.naturalWidth / columns;
            const frameH = image.naturalHeight / columns;
            if(leviathan){
              // Hide baked-in ocean at the lower edge of each sprite frame.
              // Preserve the complete original atlas and the dynamic sea underneath.
              const visibleRatio=.57;
              ctx.drawImage(image,(frame%columns)*frameW,
                Math.floor(frame/columns)*frameH,frameW,frameH*visibleRatio,
                spriteX,spriteY,monsterSize,monsterSize*visibleRatio);
            }else{
              ctx.drawImage(image, (frame % columns) * frameW,
                Math.floor(frame / columns) * frameH, frameW, frameH,
                spriteX, spriteY, monsterSize, monsterSize);
            }
          } else {
            ctx.drawImage(image, spriteX, spriteY, monsterSize, monsterSize);
          }
          ctx.restore();
          if(leviathan&&ambush!=='diving'&&ambush!=='surfacing'){
            const frameIndex=Math.round((((npc.heading??0)%360)+360)%360/22.5)%16;
            const waterline=this.waterlines.get(npc.archetype)?.[frameIndex]??.82;
            const surfaceY=spriteY+monsterSize*Math.min(waterline,.57);
            ctx.save();ctx.globalCompositeOperation='screen';
            for(let i=0;i<17;i++){
              const u=i/16,phase=now*.002+u*15;
              const px=x+(u-.5)*monsterSize*.68;
              const py=surfaceY+Math.sin(phase)*3*dpr;
              ctx.fillStyle='rgba(218,255,247,'+(.14+.13*Math.pow(Math.sin(phase),2))+')';
              ctx.beginPath();ctx.ellipse(px,py,monsterSize*.05,monsterSize*.012,0,0,Math.PI*2);ctx.fill();
            }
            ctx.restore();
          }
          if (diving || resurfacing) continue;
          renderMonsterBlood(ctx, npc, x, y, monsterSize, performance.now());
          const barW = monsterSize * 0.65;
          ctx.fillStyle = '#152233'; ctx.fillRect(x-barW/2,y-monsterSize*0.58,barW,6*dpr);
          ctx.fillStyle = '#db5655'; ctx.fillRect(x-barW/2,y-monsterSize*0.58,barW * Math.max(0,npc.health/npc.maxHealth),6*dpr);
        }
        continue;
      }
      const ship = npc.shipId === GREEN_GHOST_FUGITIVE_SHIP.id ? GREEN_GHOST_FUGITIVE_SHIP
        : npc.shipId === BLACK_MARKET_SHIP.id ? BLACK_MARKET_SHIP
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
      this.scanWaterlines(ship.id,image,columns,rows);
      const shipSize = npc.archetype === 'blood-red-market-merchant' ? size * 1.935 : ship.id === FUGITIVE_FRIGATE_SHIP.id || ship.id === GREEN_GHOST_FUGITIVE_SHIP.id ? size * 0.7 : size;
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
        const labelScale=Math.max(.42,Math.min(1.08,(Number(zoom)||1)/.88));
        ctx.font = 'bold ' + Math.round(13 * dpr * labelScale) + 'px system-ui';
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.lineWidth = Math.max(1.5,4 * dpr * labelScale); ctx.strokeStyle = '#061729';
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
