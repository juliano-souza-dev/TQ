import { createTerrorDoMar, TERROR_DO_MAR_NPC } from './TerrorDoMarNpc.js';
import { BLOOD_RED_CORSAIR_SHIP } from '../ships/BloodRedCorsairShip.js';
import { GREEN_GHOST_FUGITIVE_SHIP } from '../ships/FugitiveFrigateShip.js';
import { EMERALD_GHOST_SHIP } from '../ships/EmeraldGhostShip.js';
import { resolveIslandMovement, collidesWithIsland } from '../world/IslandCollision.js';

export const DARK_WATERS_RAIDER_ARCHETYPE = 'dark-waters-raider';
export const DARK_WATERS_SPECIAL_AMMO_ID = 'terror-rose';
export const DARK_WATERS_SPECIAL_AMMO_REWARD = 100;
export const DARK_WATERS_RAID_GOLD_CAP = 25;
export const DARK_WATERS_RAID_AMMO_CAP = 40;
export const DARK_WATERS_RAIDER_RESPAWN_MS = 120000;

const MARGIN = 95;
const normalize = angle => (angle % 360 + 360) % 360;
const bearing = (dx, dy) => normalize(Math.atan2(dx, -dy) * 180 / Math.PI);
function turnToward(current, desired, maxStep) {
  const delta = ((desired - current + 540) % 360) - 180;
  return normalize(current + Math.max(-maxStep, Math.min(maxStep, delta)));
}
function safePosition(region, point) {
  if (!point || collidesWithIsland(region, point.x, point.y, 72)) return null;
  return {
    x: Math.max(MARGIN, Math.min(region.width - MARGIN, point.x)),
    y: Math.max(MARGIN, Math.min(region.height - MARGIN, point.y)),
  };
}

function createRaider(config, region) {
  const point = safePosition(region, config);
  if (!point) throw new Error('Posição inválida para o ladrão das Águas Escuras: ' + config.id);
  return {
    id: config.id,
    type: 'npc',
    archetype: config.role==='terror-guardian' ? 'terror-guardian' : DARK_WATERS_RAIDER_ARCHETYPE,
    name: config.name,
    shipId: config.role==='terror-guardian' ? BLOOD_RED_CORSAIR_SHIP.id : GREEN_GHOST_FUGITIVE_SHIP.id,
    x: point.x,
    y: point.y,
    heading: normalize(config.heading ?? 90),
    health: config.maxHealth,
    maxHealth: config.maxHealth,
    state: 'raiding',
    aggression: config.role==='terror-guardian' ? 'neutral' : 'flee',
    damage: config.role==='terror-guardian' ? 12 : 0,
    range: config.role==='terror-guardian' ? 520 : 0,
    cannonSlots: config.role==='terror-guardian' ? 4 : 0,
    speed: config.speed,
    baseSpeed: config.speed,
    detectionRange: config.detectionRange ?? 620,
    raidRadius: config.raidRadius ?? 86,
    rewardAmmoId: DARK_WATERS_SPECIAL_AMMO_ID,
    rewardAmmoAmount: DARK_WATERS_SPECIAL_AMMO_REWARD,
    assistDisabled: true,
    raidCooldownMs: 0,
    stolenThisPass: false,
    respawnRemainingMs: null,
    sinkSerial:0,
    home: Object.freeze({ x: point.x, y: point.y, heading: normalize(config.heading ?? 90) }),
  };
}

function createEmeraldGhost(config, region) {
  const point = safePosition(region, config);
  if (!point) throw new Error('Posição inválida para o Fantasma Esmeralda.');
  return {
    id: config.id,
    type: 'npc',
    archetype: 'emerald-ghost',
    name: config.name,
    shipId: EMERALD_GHOST_SHIP.id,
    x: point.x,
    y: point.y,
    heading: normalize(config.heading ?? 0),
    health: config.maxHealth,
    maxHealth: config.maxHealth,
    state: 'spectral-roam',
    aggression: 'neutral',
    damage: 0,
    range: 0,
    cannonSlots: 0,
    speed: config.speed,
    baseSpeed: config.speed,
    roamRadius: config.roamRadius ?? 620,
    home: Object.freeze({ x: point.x, y: point.y }),
    assistDisabled: true,
    attackProtectedUntil: Infinity,
    spectral: true,
    wanderTimeMs: 1800,
  };
}

export function createDarkWatersFleet(world) {
  if (world.region.id !== 'r3') return [];

  const created = [];
  const bossConfig = world.region.terrorBoss;
  if (bossConfig && !world.entities.has(bossConfig.id)) {
    const point = safePosition(world.region, bossConfig);
    if (!point) throw new Error('Posição inválida para o Terror do Mar.');
    const boss = createTerrorDoMar({
      id: bossConfig.id,
      x: point.x,
      y: point.y,
      heading: bossConfig.heading,
    });
    boss.name = TERROR_DO_MAR_NPC.displayName;
    boss.captainName = TERROR_DO_MAR_NPC.captainName;
    boss.aggression = 'attack';
    boss.state = 'retaliating';
    boss.cannonSlots = TERROR_DO_MAR_NPC.cannonSlots;
    boss.damage = TERROR_DO_MAR_NPC.damage;
    boss.range = TERROR_DO_MAR_NPC.range;
    boss.assistDisabled = true;
    boss.anchor = { x: point.x, y: point.y };
    boss.patrolTimeMs = 2600;
    boss.phasedOut = true;
    boss.phaseRemainingMs = 30000;
    boss.attackProtectedUntil = Infinity;
    boss.damage = 0;
    boss.cannonSlots = 0;
    world.entities.set(boss.id, boss);
    created.push(boss);
  }

  for (const config of world.region.terrorRaiders ?? []) {
    if (world.entities.has(config.id)) continue;
    const raider = createRaider(config, world.region);
    world.entities.set(raider.id, raider);
    created.push(raider);
  }

  if (world.region.emeraldGhost && !world.entities.has(world.region.emeraldGhost.id)) {
    const ghost = createEmeraldGhost(world.region.emeraldGhost, world.region);
    world.entities.set(ghost.id, ghost);
    created.push(ghost);
  }
  return created;
}

function respawnRaider(npc, region) {
  const point = safePosition(region, npc.home);
  if (!point) return false;
  npc.x = point.x;
  npc.y = point.y;
  npc.heading = npc.home.heading;
  npc.health = npc.maxHealth;
  npc.state = 'raiding';
  npc.speed = npc.baseSpeed;
  npc.stolenThisPass = false;
  npc.raidCooldownMs = npc.storyRegion==='r4' ? Math.max(0,(Number(npc.nextRaidAt)||0)-Date.now()) : 0;
  npc.respawnRemainingMs = null;
  npc.retaliationActive=false;
  if(npc.archetype==='terror-guardian')npc.aggression='neutral';
  npc.lootGranted=false;
  if(npc.archetype===DARK_WATERS_RAIDER_ARCHETYPE){
    npc.aggression='flee';npc.cannonSlots=0;npc.damage=0;npc.range=0;
  }
  npc.sinkSerial=(npc.sinkSerial??0)+1;
  return true;
}

function updateBoss(npc, world, deltaMs, random) {
  if (npc.health <= 0) return;
  if(!npc.varkorBattleUnlocked){
    npc.phaseRemainingMs=(npc.phaseRemainingMs??30000)-Math.max(0,deltaMs);
    if(npc.phaseRemainingMs<=0){
      npc.phasedOut=!npc.phasedOut;
      npc.phaseRemainingMs=npc.phasedOut?30000:60000;
      if(!npc.phasedOut){
        npc.x=npc.anchor.x;
        npc.y=npc.anchor.y;
      }
    }
    if(npc.phasedOut)return;
  }else{
    npc.phasedOut=false;
    npc.attackProtectedUntil=0;
    npc.damage=TERROR_DO_MAR_NPC.damage;
    npc.cannonSlots=TERROR_DO_MAR_NPC.cannonSlots;
  }
  if (npc.monsterAssisting) return;
  const dt = Math.min(64, Math.max(0, deltaMs)) / 1000;
  if(npc.varkorBattleUnlocked){
    const player=world.camera;
    const dx=player.x-npc.x,dy=player.y-npc.y;
    const distance=Math.hypot(dx,dy);
    // Remain at the edge of the longer effective cannon range.
    const engagementRange=Math.max(1,Number(npc.playerMaxCannonRange)||0,Number(npc.range)||0);
    const desiredGap=Math.max(100,engagementRange-35);
    npc.heading=turnToward(npc.heading,bearing(dx,dy),110*dt);
    npc.state='retaliating';
    npc.retaliationActive=true;
    if(distance>desiredGap){
      const move=Math.min(distance-desiredGap,Math.max(0,Number(npc.speed)||0)*dt);
      const angle=npc.heading*Math.PI/180;
      const moved=resolveIslandMovement(world.region,npc.x,npc.y,
        Math.max(MARGIN,Math.min(world.region.width-MARGIN,npc.x+Math.sin(angle)*move)),
        Math.max(MARGIN,Math.min(world.region.height-MARGIN,npc.y-Math.cos(angle)*move)),42);
      npc.x=moved.x;npc.y=moved.y;
    }
    return;
  }
  const player = world.camera;
  const distance = Math.hypot(player.x - npc.x, player.y - npc.y);
  if (distance < 520) {
    npc.state = 'retaliating';
    npc.heading = turnToward(npc.heading, bearing(player.x - npc.x, player.y - npc.y), 70 * dt);
    return;
  }
  npc.state = 'cruising';
  npc.patrolTimeMs = (npc.patrolTimeMs ?? 0) - deltaMs;
  if (npc.patrolTimeMs <= 0) {
    npc.patrolHeading = normalize(npc.heading + (random() - .5) * 80);
    npc.patrolTimeMs = 2200 + random() * 2200;
  }
  const desired = npc.patrolHeading ?? npc.heading;
  npc.heading = turnToward(npc.heading, desired, 38 * dt);
  const radians = npc.heading * Math.PI / 180;
  const movement = Math.max(0, Number(npc.speed) || 0) * dt;
  const nx = Math.max(MARGIN, Math.min(world.region.width - MARGIN, npc.x + Math.sin(radians) * movement));
  const ny = Math.max(MARGIN, Math.min(world.region.height - MARGIN, npc.y - Math.cos(radians) * movement));
  const moved = resolveIslandMovement(world.region, npc.x, npc.y, nx, ny, 42);
  if (Math.hypot(moved.x - npc.x, moved.y - npc.y) < movement * .25) {
    npc.patrolHeading = normalize(npc.heading + 135);
  }
  npc.x = moved.x;
  npc.y = moved.y;
}

function updateRaider(npc, world, deltaMs, random, raids, playerAlive=true) {
  if(npc.escapingToR4)return;
  if(Date.now()<(npc.frozenUntil||0)){npc.state='frozen';return;}
  if (npc.health <= 0) {
    npc.respawnRemainingMs = (npc.respawnRemainingMs ?? DARK_WATERS_RAIDER_RESPAWN_MS) - Math.max(0, deltaMs);
    if (npc.respawnRemainingMs <= 0) respawnRaider(npc, world.region);
    return;
  }

  if(!playerAlive && world.region.id==='r3'){
    npc.retaliationActive=false;npc.aggression='flee';npc.state='patrolling';
    const dt=Math.min(64,Math.max(0,deltaMs))/1000;
    npc.patrolTimeMs=(npc.patrolTimeMs??0)-deltaMs;
    if(npc.patrolTimeMs<=0){npc.patrolHeading=normalize(npc.heading+75+random()*200);npc.patrolTimeMs=2400+random()*3200;}
    npc.heading=turnToward(npc.heading,npc.patrolHeading,65*dt);
    const angle=npc.heading*Math.PI/180;
    const moved=resolveIslandMovement(world.region,npc.x,npc.y,Math.max(MARGIN,Math.min(world.region.width-MARGIN,npc.x+Math.sin(angle)*npc.baseSpeed*dt)),Math.max(MARGIN,Math.min(world.region.height-MARGIN,npc.y-Math.cos(angle)*npc.baseSpeed*dt)),42);
    npc.x=moved.x;npc.y=moved.y;
    return;
  }
  const dt = Math.min(64, Math.max(0, deltaMs)) / 1000;
  npc.raidCooldownMs = npc.storyRegion==='r4'
    ? Math.max(0,(Number(npc.nextRaidAt)||0)-Date.now())
    : Math.max(0,(npc.raidCooldownMs ?? 0) - deltaMs);
  const player = world.camera;
  const dx = player.x - npc.x;
  const dy = player.y - npc.y;
  const distance = Math.hypot(dx, dy);

  let desiredHeading = npc.heading;
  // R4 fugitive: approach to steal within 20m, then flee for a full minute.
  // A player attack interrupts the raid and triggers defensive escape fire.
  if(npc.storyRegion==='r4'){
    if(npc.retaliationActive || npc.raidCooldownMs>0 || npc.stolenThisPass){
      npc.state='escaping';
      desiredHeading=bearing(-dx,-dy);
    }else{
      npc.state='raiding';
      desiredHeading=bearing(dx,dy);
    }
  } else if(npc.escapeOnly || npc.archetype===DARK_WATERS_RAIDER_ARCHETYPE && (npc.retaliationActive || distance<350) || (npc.retaliationActive && npc.aggression==='flee')){
    npc.state='escaping';
    desiredHeading=bearing(-dx,-dy);
  } else if(npc.retaliationActive){
    npc.state='retaliating';
    desiredHeading=bearing(dx,dy);
  } else if (!npc.escapeOnly && !npc.leviathanHuntLock && !npc.stolenThisPass && distance <= npc.detectionRange) {
    npc.state = 'raiding';
    desiredHeading = bearing(dx, dy);
  } else if (npc.stolenThisPass) {
    npc.state = 'escaping';
    desiredHeading = bearing(-dx, -dy);
  } else {
    npc.state = 'passing';
    npc.passTimeMs = (npc.passTimeMs ?? 0) - deltaMs;
    if (npc.passTimeMs <= 0) {
      npc.passHeading = normalize(npc.heading + (random() - .5) * 34);
      npc.passTimeMs = 1000 + random() * 1700;
    }
    desiredHeading = npc.passHeading ?? npc.heading;
  }

  npc.heading = turnToward(npc.heading, desiredHeading, 320 * dt);
  const speed = npc.baseSpeed * (npc.state === 'escaping' ? 1.15 : 1);
  const radians = npc.heading * Math.PI / 180;
  const movement = npc.storyRegion==='r4' && npc.state==='raiding'
    ? Math.min(speed*dt,Math.max(0,distance-12))
    : npc.retaliationActive && npc.aggression!=='flee' ? Math.min(speed*dt,Math.max(0,distance-100)) : speed*dt;
  const nx = Math.max(MARGIN, Math.min(world.region.width - MARGIN, npc.x + Math.sin(radians) * movement));
  const ny = Math.max(MARGIN, Math.min(world.region.height - MARGIN, npc.y - Math.cos(radians) * movement));
  const moved = resolveIslandMovement(world.region, npc.x, npc.y, nx, ny, 32);
  const actual = Math.hypot(moved.x - npc.x, moved.y - npc.y);
  if (movement > .1 && actual < movement * .3) {
    npc.heading = normalize(npc.heading + (random() < .5 ? -125 : 125));
    npc.passHeading = npc.heading;
  } else {
    npc.x = moved.x;
    npc.y = moved.y;
  }

  if (!npc.retaliationActive && !npc.stolenThisPass && npc.raidCooldownMs <= 0
      && Math.hypot(player.x - npc.x, player.y - npc.y) <= npc.raidRadius) {
    npc.stolenThisPass = true;
    npc.raidCooldownMs = npc.storyRegion==='r4' ? 60000 : 18000;
    if(npc.storyRegion==='r4')npc.nextRaidAt=Date.now()+60000;
    raids.push(npc);
  }

  if(npc.storyRegion==='r4' && npc.raidCooldownMs<=0 && !npc.retaliationActive)npc.stolenThisPass=false;

  const edge = npc.x <= MARGIN + 4 || npc.x >= world.region.width - MARGIN - 4
    || npc.y <= MARGIN + 4 || npc.y >= world.region.height - MARGIN - 4;
  if (edge && npc.stolenThisPass && npc.storyRegion!=='r4') {
    npc.stolenThisPass=false;
    npc.heading = normalize(npc.heading + 180);
  }
}


function updateTerrorGuardian(npc,world,deltaMs,playerAlive=true){
  if(npc.health<=0){
    npc.respawnRemainingMs=(npc.respawnRemainingMs??DARK_WATERS_RAIDER_RESPAWN_MS)-Math.max(0,deltaMs);
    if(npc.respawnRemainingMs<=0)respawnRaider(npc,world.region);
    return;
  }
  if(!playerAlive){
    npc.retaliationActive=false;npc.aggression='neutral';npc.state='patrolling';
    const dt=Math.min(64,Math.max(0,deltaMs))/1000;
    npc.patrolTimeMs=(npc.patrolTimeMs??0)-deltaMs;
    if(npc.patrolTimeMs<=0){npc.patrolHeading=normalize(npc.heading+80+Math.random()*170);npc.patrolTimeMs=2500+Math.random()*3000;}
    npc.heading=turnToward(npc.heading,npc.patrolHeading,60*dt);
    const angle=npc.heading*Math.PI/180;
    const moved=resolveIslandMovement(world.region,npc.x,npc.y,Math.max(MARGIN,Math.min(world.region.width-MARGIN,npc.x+Math.sin(angle)*npc.baseSpeed*dt)),Math.max(MARGIN,Math.min(world.region.height-MARGIN,npc.y-Math.cos(angle)*npc.baseSpeed*dt)),34);
    npc.x=moved.x;npc.y=moved.y;return;
  }
  const boss=world.entities.get(world.region.terrorBoss?.id);
  const anchor=boss?.anchor??{x:3220,y:3450};
  const dt=Math.min(64,Math.max(0,deltaMs))/1000;
  const player=world.camera;
  const distance=Math.hypot(player.x-npc.x,player.y-npc.y);
  const squad=[...world.entities.values()].filter(n=>n.archetype==='terror-guardian'&&n.health>0);
  if(npc.fleeUntil && Date.now()>=npc.fleeUntil){npc.fleeUntil=0;npc.retaliationActive=false;}
  const engaged=npc.retaliationActive===true && !(npc.fleeUntil && Date.now()<npc.fleeUntil);
  if(!engaged && npc.fleeUntil && Date.now()<npc.fleeUntil){
    npc.state='escaping';npc.aggression='flee';
    const dt=Math.min(64,Math.max(0,deltaMs))/1000;
    npc.heading=turnToward(npc.heading,bearing(npc.x-player.x,npc.y-player.y),120*dt);
    const angle=npc.heading*Math.PI/180;
    const moved=resolveIslandMovement(world.region,npc.x,npc.y,Math.max(MARGIN,Math.min(world.region.width-MARGIN,npc.x+Math.sin(angle)*npc.baseSpeed*dt)),Math.max(MARGIN,Math.min(world.region.height-MARGIN,npc.y-Math.cos(angle)*npc.baseSpeed*dt)),34);
    npc.x=moved.x;npc.y=moved.y;return;
  }
  if(!engaged)npc.aggression='neutral';
  const target=engaged?player:anchor;
  npc.state=engaged?'retaliating':'patrolling';
  const dx=target.x-npc.x,dy=target.y-npc.y;
  const gap=Math.hypot(dx,dy);
  // Long-range broadside engagement. Never chase into the player's hull.
  const preferredGap=engaged?Math.max(360,Math.min(460,(Number(npc.range)||520)-60)):185;
  const tooClose=engaged&&gap<preferredGap-25;
  const desired=tooClose?bearing(-dx,-dy):bearing(dx,dy);
  npc.heading=turnToward(npc.heading,desired,180*dt);
  const step=engaged
    ? tooClose?Math.min(preferredGap-gap,(npc.baseSpeed||0)*dt)
      : Math.min(Math.max(0,gap-preferredGap),(npc.baseSpeed||0)*dt)
    : Math.min(Math.max(0,gap-preferredGap),(npc.baseSpeed||0)*dt);
  if(step<=0)return;
  const angle=npc.heading*Math.PI/180;
  const moved=resolveIslandMovement(world.region,npc.x,npc.y,
    Math.max(MARGIN,Math.min(world.region.width-MARGIN,npc.x+Math.sin(angle)*step)),
    Math.max(MARGIN,Math.min(world.region.height-MARGIN,npc.y-Math.cos(angle)*step)),34);
  npc.x=moved.x;npc.y=moved.y;
}

// Only this R3 mission turns the otherwise neutral spectral ship into an ally.
export const EMERALD_GHOST_LEVIATHAN_DAMAGE=250;
export const EMERALD_GHOST_LEVIATHAN_RELOAD_MS=2000;
export const EMERALD_GHOST_LEVIATHAN_RANGE=760;

function updateEmeraldGhost(npc, world, deltaMs, random) {
  if(npc.rebuildGuideActive){npc.state='awaiting-player';return;}
  const dt = Math.min(64, Math.max(0, deltaMs)) / 1000;
  const varkor=npc.varkorAllyActive ? world.entities.get(world.region.terrorBoss?.id) : null;
  if(varkor?.health>0 && npc.health>0){
    const distance=Math.hypot(varkor.x-npc.x,varkor.y-npc.y);
    npc.state='varkor-ally';
    npc.heading=turnToward(npc.heading,bearing(varkor.x-npc.x,varkor.y-npc.y),135*dt);
    if(distance>450){
      const movement=Math.min(distance-450,300*dt),angle=npc.heading*Math.PI/180;
      const moved=resolveIslandMovement(world.region,npc.x,npc.y,
        npc.x+Math.sin(angle)*movement,npc.y-Math.cos(angle)*movement,42);
      npc.x=moved.x;npc.y=moved.y;
    }
    return;
  }
  const monster=npc.leviathanHuntActive ? world.entities.get('r3-leviathan') : null;
  if(monster?.health>0 && npc.health>0){
    // Sail to meet the player, then flank the real, moving Leviathan. No teleports.
    const player=world.camera;
    const nearMonster=Math.hypot(player.x-monster.x,player.y-monster.y)<1400;
    const target=nearMonster?monster:player;
    const desiredGap=nearMonster?430:205;
    const dx=target.x-npc.x,dy=target.y-npc.y;
    const distance=Math.hypot(dx,dy);
    npc.state='leviathan-ally';
    if(distance>1){
      npc.heading=turnToward(npc.heading,bearing(dx,dy),135*dt);
      if(distance>desiredGap){
        const step=Math.min(distance-desiredGap,360*dt);
        const rad=npc.heading*Math.PI/180;
        const moved=resolveIslandMovement(world.region,npc.x,npc.y,
          npc.x+Math.sin(rad)*step,npc.y-Math.cos(rad)*step,42);
        npc.x=moved.x;
        npc.y=moved.y;
      }
    }
    return;
  }
  npc.state='spectral-roam';
  npc.wanderTimeMs = (npc.wanderTimeMs ?? 0) - deltaMs;
  if (npc.wanderTimeMs <= 0) {
    npc.patrolHeading = normalize(npc.heading + (random() - .5) * 80);
    npc.wanderTimeMs = 1800 + random() * 2200;
  }

  const home = npc.home ?? { x: npc.x, y: npc.y };
  const distanceHome = Math.hypot(npc.x - home.x, npc.y - home.y);
  const desired = distanceHome > npc.roamRadius
    ? bearing(home.x - npc.x, home.y - npc.y)
    : (npc.patrolHeading ?? npc.heading);

  npc.heading = turnToward(npc.heading, desired, 44 * dt);
  const radians = npc.heading * Math.PI / 180;
  const movement = Math.max(0, Number(npc.baseSpeed) || 0) * dt;
  const nx = Math.max(MARGIN, Math.min(world.region.width - MARGIN, npc.x + Math.sin(radians) * movement));
  const ny = Math.max(MARGIN, Math.min(world.region.height - MARGIN, npc.y - Math.cos(radians) * movement));
  const moved = resolveIslandMovement(world.region, npc.x, npc.y, nx, ny, 34);
  if (Math.hypot(moved.x - npc.x, moved.y - npc.y) < movement * .3) {
    npc.patrolHeading = normalize(npc.heading + 140);
  }
  npc.x = moved.x;
  npc.y = moved.y;
}

function updateMerchant(npc,world,deltaMs){
  const corruption=world.region.ocean?.corruption?.zones?.[1];
  const center=corruption??{x:2140,y:2860};
  npc.merchantOrbitAngle=(npc.merchantOrbitAngle??0)+Math.max(0,deltaMs)*0.000012;
  const target={x:center.x+Math.cos(npc.merchantOrbitAngle)*420,
    y:center.y+Math.sin(npc.merchantOrbitAngle)*320};
  const dt=Math.min(64,Math.max(0,deltaMs))/1000;
  const distance=Math.hypot(target.x-npc.x,target.y-npc.y);
  if(distance<3)return;
  npc.heading=turnToward(npc.heading,bearing(target.x-npc.x,target.y-npc.y),24*dt);
  const movement=Math.min(distance,18*dt);
  const dx=(target.x-npc.x)/distance,dy=(target.y-npc.y)/distance;
  const moved=resolveIslandMovement(world.region,npc.x,npc.y,
    npc.x+dx*movement,npc.y+dy*movement,55);
  npc.x=moved.x;npc.y=moved.y;npc.speed=18;
}
export function updateDarkWatersFleet(world, deltaMs, random = Math.random, playerAlive=true) {
  if (world.region.id !== 'r3') return [];
  const raids = [];
  const hunting=world.entities.get('r3-fantasma-esmeralda')?.leviathanHuntActive===true;
  for (const npc of world.entities.values()) {
    // All other ships patrol normally, without pursuing the player, for this hunt.
    if(npc.archetype===DARK_WATERS_RAIDER_ARCHETYPE || npc.archetype==='terror-guardian'){
      npc.leviathanHuntLock=hunting;
    }
    if(npc.archetype==='blood-red-market-merchant')updateMerchant(npc,world,deltaMs);
    else if (npc.archetype === TERROR_DO_MAR_NPC.id) updateBoss(npc, world, deltaMs, random);
    else if(npc.archetype==='terror-guardian')updateTerrorGuardian(npc,world,deltaMs,playerAlive);
    else if (npc.archetype === DARK_WATERS_RAIDER_ARCHETYPE) {
      updateRaider(npc, world, deltaMs, random, raids, playerAlive);
    } else if (npc.archetype === 'emerald-ghost') {
      updateEmeraldGhost(npc, world, deltaMs, random);
    }
  }
  return raids;
}

/** R4 story encounter: the same named fugitive, using its R3 ship and escape AI. */
export function createFrozenLandsFugitive(world) {
  if(world.region.id!=='r4')return null;
  const id='r4-sombra-do-saque';
  if(world.entities.has(id))return world.entities.get(id);
  const npc=createRaider({
    id,name:'Sombra do Saque',x:520,y:3260,heading:90,
    speed:442,maxHealth:45000,detectionRange:650,raidRadius:86,
  },world.region);
  npc.storyOriginId='r3-sombra-do-saque';
  npc.storyRegion='r4';
  npc.escapeOnly=true;
  npc.aggression='flee';
  npc.retaliationActive=false;
  npc.raidRadius=20;
  npc.raidCooldownMs=0;
  npc.stolenThisPass=false;
  npc.range=1250;
  npc.damage=20;
  npc.cannonSlots=0;
  npc.specialCannonAmmoId='glacial-seeker';
  npc.specialCannonCount=1;
  npc.specialCannonAmmoId='frozen-explosion';
  world.entities.set(id,npc);
  return npc;
}
export function updateFrozenLandsFugitive(world,deltaMs,random=Math.random) {
  if(world.region.id!=='r4')return [];
  const npc=world.entities.get('r4-sombra-do-saque');
  if(!npc)return [];
  const raids=[];
  updateRaider(npc,world,deltaMs,random,raids);
  return raids;
}
