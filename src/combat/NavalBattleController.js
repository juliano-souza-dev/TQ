import { cancelHullRecovery, getMaxHullHealth } from './HullRepair.js';
import { equippedHarpoon, harpoonDamage, harpoonStock, HARPOON_AMMO_ID, ARMOR_PIERCING_HARPOON_ID, ARMOR_PIERCING_HARPOON_DAMAGE, armorPiercingHarpoonStock } from './HarpoonCatalog.js';
import { damageCorsair, RED_SAIL_CORSAIR } from '../npcs/RedSailCorsair.js';
import { damageMonster } from '../monsters/MonsterCombat.js';
import { CANNONS } from '../items/EquipmentCatalog.js';
import {
  ammoStock, armedCannons, availableNavalAmmo, cannonHardpoint, cannonRange,
  effectiveAmmo, cannonAcceptsAmmo, aimWithAccuracy, distanceBetween, flightDurationMs,
  interceptPoint, shipCollision, shotDamage,
} from './NavalBattleRules.js';

// The shortest cannon sets the Kraken's retaliation reach (currently 300 units).
export const KRAKEN_RETALIATION_RANGE = Math.min(...CANNONS.map(cannon => cannonRange(cannon)));
export const PLAYER_CANNON_SEQUENCE_MS = 160;

// The battle controller owns combat state, cooldowns, target selection, ammo
// debits, moving-target impact checks and NPC retaliation. WebGL owns only FX.
export class NavalBattleController {
  constructor({
    renderer, readSave, writePatch, getPlayer, getEntities, shipId,
    getRegionId = () => 'r1',
    getMappedMuzzle = () => null,
    onFeedback = () => {}, onVictory = () => {}, onPlayerSunk = () => {},
    random = Math.random, clock = () => performance.now(),
  }) {
    if (!renderer || !readSave || !writePatch || !getPlayer || !getEntities || !shipId) {
      throw new TypeError('NavalBattleController requires renderer and world adapters');
    }
    Object.assign(this, {
      renderer, readSave, writePatch, getPlayer, getEntities, shipId, getMappedMuzzle, getRegionId,
      onFeedback, onVictory, onPlayerSunk, random, clock,
    });
    this.targetId = null;
    this.manualTargetId = null;
    this.targetScanElapsedMs = 0;
    this.firing = false;
    this.nextHarpoonAt = -Infinity;
    this.assists = new Map();
    this.usedAssistNpcs = new Map();
    this.assistMonsterAlive = new Set();
    this.nextBySlot = new Map();
    this.nextPlayerSequenceAt = -Infinity;
    this.playerSequenceCursor = 0;
    this.nextNpcShot = new Map();
    this.nextKrakenStrike = new Map();
    this.previousPositions = new Map();
    this.velocities = new Map();
    this.enemyAmmo = effectiveAmmo('rusted-iron');
    this.renderer.prepareAmmo?.(this.enemyAmmo);
    this.selectedAmmoId = this.resolveSelectedAmmo();
  }

  getConsumables() {
    const c = this.readSave().consumables ?? {};
    return {
      selectedId:c.selectedId ?? 'flame-5x',
      quantities:c.quantities ?? {},
      activeUntil:Number(c.activeUntil)||0,
      cooldownUntil:Number(c.cooldownUntil)||0,
      shieldActiveUntil:Number(c.shieldActiveUntil)||0,
      shieldCooldownUntil:Number(c.shieldCooldownUntil)||0,
      speedActiveUntil:Number(c.speedActiveUntil)||0,
      speedCooldownUntil:Number(c.speedCooldownUntil)||0,
      treasureMapActiveUntil:Number(c.treasureMapActiveUntil)||0,
      treasureMapCooldownUntil:Number(c.treasureMapCooldownUntil)||0,
    };
  }
  isFlameActive() { return Date.now() < this.getConsumables().activeUntil; }
  isShieldActive() { return Date.now() < this.getConsumables().shieldActiveUntil; }
  isSpeedActive() { return Date.now() < this.getConsumables().speedActiveUntil; }
  isTreasureMapActive() { return Date.now() < this.getConsumables().treasureMapActiveUntil; }
  selectConsumable(id) {
    if (!['none','flame-5x','shield','speed-plus','treasure-map'].includes(id)) return false;
    const save=this.readSave();
    this.writePatch({consumables:{...(save.consumables??{}),selectedId:id}});
    return true;
  }
  activateConsumable() {
    const save=this.readSave(),c=this.getConsumables(),now=Date.now();
    const config={
      shield:{active:'shieldActiveUntil',cooldown:'shieldCooldownUntil',duration:56250,reload:180000,label:'Escudo'},
      'flame-5x':{active:'activeUntil',cooldown:'cooldownUntil',duration:75000,reload:150000,label:'5X em Chamas'},
      'speed-plus':{active:'speedActiveUntil',cooldown:'speedCooldownUntil',duration:120000,reload:300000,label:'Veloz+'},
      'treasure-map':{active:'treasureMapActiveUntil',cooldown:'treasureMapCooldownUntil',duration:900000,reload:1800000,label:'Mapa do Tesouro'},
    }[c.selectedId];
    if(!config)return {ok:false,reason:'Selecione um consumível.'};
    if(c[config.active]>now)return {ok:false,reason:'Consumível já ativo.'};
    if(c[config.cooldown]>now)return {ok:false,reason:'Aguarde '+Math.ceil((c[config.cooldown]-now)/1000)+'s para reutilizar.'};
    const count=Math.max(0,Math.floor(Number(c.quantities[c.selectedId])||0));
    if(!count)return {ok:false,reason:'Você não possui este consumível.'};
    this.writePatch({consumables:{...(save.consumables??{}),
      quantities:{...c.quantities,[c.selectedId]:count-1},
      [config.active]:now+config.duration,[config.cooldown]:now+config.reload}});
    return {ok:true,reason:config.label+' ativo por '+(config.duration/1000)+' segundos!'};
  }

  resolveSelectedAmmo() {
    const save = this.readSave();
    const requested = save.selectedNavalAmmoId;
    const options = availableNavalAmmo(save);
    const battery = armedCannons(save, this.shipId);
    const compatible = item => battery.some(({ cannon }) => cannonAcceptsAmmo(cannon, item.id));
    if (requested && options.some(item => item.id === requested && item.amount > 0 && compatible(item))) return requested;
    // The HUD selection controls ordinary cannons only. Special cannons
    // always consume their exclusive ammo, independently of this selection.
    return options.find(item => item.id === 'rusted-iron' && item.amount > 0 && compatible(item))?.id
      || options.find(item => item.amount > 0 && item.id !== 'aetherion-seeker' && compatible(item))?.id
      || options.find(item => item.amount > 0 && compatible(item))?.id || 'rusted-iron';
  }

  setAmmo(ammoId) {
    const selected = availableNavalAmmo(this.readSave())
      .find(item => item.id === ammoId && item.amount > 0 && armedCannons(this.readSave(), this.shipId).some(({ cannon }) => cannonAcceptsAmmo(cannon, item.id)));
    if (!selected) return false;
    this.selectedAmmoId = selected.id;
    this.writePatch({ selectedNavalAmmoId: selected.id });
    const ammo = effectiveAmmo(selected.id);
    if (ammo) this.renderer.prepareAmmo?.(ammo);
    return true;
  }

  isProtectedInformant(entity) {
    return Boolean(entity?.informantProtected || (entity?.id === 'r2-informant' && entity?.name === 'Corsário Informante'));
  }

  getThiefMissionTarget() {
    if (this.getRegionId() !== 'r2' || this.readSave().r2Campaign?.active !== 'r2-destroy-thief') return null;
    return [...this.getEntities().values()].find(n => n.archetype === 'fugitive-frigate' && n.health > 0) ?? null;
  }

  canHuntThief() {
    return this.shipId === 'fragata-sombra-cacadora';
  }

  getGoldenGalleonTarget() {
    if(this.getRegionId()!=='r2'||this.readSave().r2Campaign?.active!=='r2-golden-ii')return null;
    return this.getEntities().get('r2-morbi') ?? null;
  }

  setTarget(id, { manual = false } = {}) {
    const thief = this.getThiefMissionTarget();
    if (thief && id && id !== thief.id) return false;
    if (this.getGoldenGalleonTarget() && id && id !== 'r2-morbi') return false;
    if (id && this.isProtectedInformant(this.getEntities().get(id))) return false;
    if (this.targetId !== id) { this.firing = false; this.cancelMonsterAssists(); }
    this.targetId = id || null;
    this.manualTargetId = manual && id ? id : null;
    return true;
  }

  // Select only targets reachable by at least one installed cannon.
  // Lowest current HP wins; distance and stable ID break ties.
  // Manual targeting is respected until that target leaves range or sinks.
  updateAutoTarget(stepMs = 0) {
    this.targetScanElapsedMs += Math.max(0, stepMs);
    if (this.targetScanElapsedMs < 150) return false;
    this.targetScanElapsedMs = 0;
    const thief = this.getThiefMissionTarget();
    if (thief) {
      if (this.targetId !== thief.id) this.setTarget(thief.id, { manual: true });
      return true;
    }
    const morbi=this.getGoldenGalleonTarget();
    if(morbi){
      const next=morbi.health>0 ? morbi.id : null;
      if(this.targetId!==next)this.setTarget(next);
      return true;
    }
    const battery = armedCannons(this.readSave(), this.shipId);
    const maxRange = Math.max(equippedHarpoon(this.readSave()).range, battery.length ? Math.max(...battery.map(({ cannon }) => cannonRange(cannon))) : 0);
    const player = this.getPlayer();
    if (!maxRange) {
      if (this.targetId) this.setTarget(null);
      return false;
    }
    const withinRange = npc => npc && (npc.type === 'npc' || npc.type === 'monster')
      && npc.health > 0 && !this.isProtectedInformant(npc)
      && distanceBetween(player, npc) <= (npc.type==='monster' ? equippedHarpoon(this.readSave()).range : battery.length ? Math.max(...battery.map(({cannon})=>cannonRange(cannon))) : 0);
    const entities = this.getEntities();
    // Durante o combate, manter o alvo vivo e ao alcance para não interromper ajudantes.
    if (this.firing && withinRange(entities.get(this.targetId))) return false;
    if (this.manualTargetId) {
      const manuallyChosen = entities.get(this.manualTargetId);
      if (withinRange(manuallyChosen)) return false;
      this.manualTargetId = null;
    }
    let candidate = null, bestDistance = Infinity;
    for (const npc of entities.values()) {
      if (!withinRange(npc)) continue;
      const distance = distanceBetween(player, npc);
      if (!candidate || npc.health < candidate.health
        || (npc.health === candidate.health && distance < bestDistance)
        || (npc.health === candidate.health && distance === bestDistance && String(npc.id) < String(candidate.id))) {
        candidate = npc;
        bestDistance = distance;
      }
    }
    const chosen = candidate?.id ?? null;
    if (chosen === this.targetId) return false;
    this.setTarget(chosen);
    return true;
  }

  getTarget() {
    const entity = this.getEntities().get(this.targetId);
    if(this.getGoldenGalleonTarget() && entity?.id!=='r2-morbi')return null;
    return (entity?.type === 'npc' || entity?.type === 'monster') && entity.health > 0 && !this.isProtectedInformant(entity) ? entity : null;
  }

  getStatus() {
    const save = this.readSave();
    const battery = armedCannons(save, this.shipId);
    const player = this.getPlayer();
    const target = this.getTarget();
    const distance = target ? distanceBetween(player, target) : Infinity;
    const harpoon = equippedHarpoon(save);
    const monsterTarget = target?.type === 'monster';
    const inRangeCannons = battery.filter(({ cannon }) => distance <= cannonRange(cannon) && availableNavalAmmo(save).some(item => item.amount > 0 && cannonAcceptsAmmo(cannon,item.id)));
    const ammo = ammoStock(save, this.selectedAmmoId);
    // R1 possui um tutorial obrigatório. R2 já começa com combate liberado.
    // Finishing the introductory Corsair mission unlocks naval combat permanently.
    // Do not disable cannons between contracts or while collecting their rewards.
    const missionActive = this.getRegionId() !== 'r1'
      || save.missions?.corsair === 'active'
      || save.missions?.corsair === 'complete';
    let reason = 'ready';
    if (monsterTarget && this.getHealth() <= 0) reason = 'sunk';

    else if (monsterTarget && distance > harpoon.range) reason = 'range';
    else if (monsterTarget && harpoonStock(save) + armorPiercingHarpoonStock(save) <= 0) reason = 'harpoon-ammo';
    else if (!monsterTarget && !missionActive) reason = 'mission';
    else if (!monsterTarget && !battery.length) reason = 'no-cannon';
    else if (!target) reason = 'target';
    else if (!monsterTarget && !inRangeCannons.length) reason = battery.some(({ cannon }) => distance <= cannonRange(cannon)) ? 'ammo' : 'range';

    else if (this.getHealth() <= 0) reason = 'sunk';
    return {
      firing: this.firing,
      harpoonFiring: this.firing && monsterTarget,
      harpoonName: harpoon.name,
      harpoonRange: harpoon.range,
      harpoonReloadSeconds: harpoon.reloadSeconds,
      harpoonAmmo: harpoonStock(save) + armorPiercingHarpoonStock(save),
      ready: reason === 'ready',
      reason, distance,
      range: monsterTarget ? harpoon.range : battery.length ? Math.max(...battery.map(({ cannon }) => cannonRange(cannon))) : 0,
      targetName: target?.name || '',
      equippedCannons: battery.length,
      cannonsInRange: inRangeCannons.length,
      ammoId: this.selectedAmmoId,
      ammo,
      options: availableNavalAmmo(save),
      health: this.getHealth(),
    };
  }

  getMaxHealth() { return getMaxHullHealth(this.readSave()); }
  getHealth() {
    const value = this.readSave().combat?.shipHealth;
    const max=this.getMaxHealth();
    return Math.max(0, Math.min(max, Number.isFinite(value) ? value : max));
  }

  toggleFire() {
    if (this.firing) {
      this.firing = false;
      this.cancelMonsterAssists();
      this.onFeedback('⏹ Disparos interrompidos. Balas em voo continuam.');
      return true;
    }
    const status = this.getStatus();
    if (!status.ready) {
      const hints={
        mission:'Complete a missão inicial para liberar os canhões.',
        'no-cannon':'Nenhum canhão equipado. Equipe um canhão no Estaleiro.',
        target:'Aproxime-se e selecione um navio inimigo.',
        ammo:'Sem munição compatível para os canhões equipados.',
        range:'Alvo fora do alcance dos canhões.',
        sunk:'Repare o casco antes de atacar.',
      };
      this.onFeedback('⚠️ '+(hints[status.reason]||'Ataque indisponível.'));
      return false;
    }
    const interruptedRepair=cancelHullRecovery(this.readSave());
    if(interruptedRepair)this.writePatch(interruptedRepair);
    this.firing = true;
    this.nextPlayerSequenceAt = -Infinity;
    this.playerSequenceCursor = 0;
    if (this.getTarget()?.type === 'monster') this.fireHarpoon();
    else this.firePlayerVolley(this.clock());
    return true;
  }

  // A ajuda termina quando restam 3% da vida máxima do monstro.
  monsterAssistComplete(monster) {
    return !monster || monster.health <= 0 || monster.health <= monster.maxHealth * 0.03;
  }

  finishMonsterAssistsFor(monsterId) {
    for (const assist of [...this.assists.values()]) {
      if (assist.monsterId === monsterId) this.finishMonsterAssist(assist.npcId);
    }
  }

  // Cada monstro mantém seu histórico de NPCs convocados durante a batalha.
  cancelMonsterAssists() {
    for (const npcId of this.assists.keys()) {
      const npc = this.getEntities().get(npcId);
      if (npc) npc.monsterAssisting = false;
    }
    this.assists.clear();
  }

  getAssistCandidate() {
    const monster = this.getTarget();
    if (!this.firing || monster?.type !== 'monster' || this.monsterAssistComplete(monster)
      || this.assists.size >= 2) return null;
    const used = this.usedAssistNpcs.get(monster.id) ?? new Set();
    return [...this.getEntities().values()]
      .filter(n => n.type === 'npc' && n.health > 0 && !n.negotiationFrozen
        && !n.assistDisabled && !n.attackProtectedUntil && !n.monsterAssisting
        && !used.has(n.id) && !this.assists.has(n.id)
        && distanceBetween(n, monster) <= 620)
      .sort((a, b) => distanceBetween(a, monster) - distanceBetween(b, monster))[0] ?? null;
  }

  getAssistStatus() {
    const monster = this.getTarget();
    const candidate = this.getAssistCandidate();
    return {
      eligible: !!candidate, active: this.assists.size > 0,
      activeCount: this.assists.size, maxHelpers: 2,
      npc: candidate, monster, helper: this.assists.keys().next().value ?? null,
    };
  }

  enableMonsterAssist() {
    const candidate = this.getAssistCandidate(), monster = this.getTarget();
    if (!candidate || !monster || this.assists.size >= 2) return false;
    let used = this.usedAssistNpcs.get(monster.id);
    if (!used) {
      used = new Set();
      this.usedAssistNpcs.set(monster.id, used);
    }
    used.add(candidate.id);
    this.assists.set(candidate.id, {
      npcId: candidate.id, monsterId: monster.id, nextShotAt: -Infinity,
    });
    candidate.monsterAssisting = true;
    this.onFeedback('🤝 ' + candidate.name + ' veio ajudar na caça ao monstro!');
    return true;
  }

  finishMonsterAssist(npcId) {
    const npc = this.getEntities().get(npcId);
    if (npc) npc.monsterAssisting = false;
    this.assists.delete(npcId);
  }

  fireAssistHarpoon(now) {
    for (const assist of [...this.assists.values()]) {
      const monster = this.getEntities().get(assist.monsterId);
      const helper = this.getEntities().get(assist.npcId);
      if (!this.firing || this.monsterAssistComplete(monster) || !helper || helper.health <= 0
        || distanceBetween(helper, monster) > 620) {
        this.finishMonsterAssist(assist.npcId);
        continue;
      }
      if (now < assist.nextShotAt) continue;
      const launcher = equippedHarpoon(this.readSave());
      const from = { x: helper.x, y: helper.y };
      const to = interceptPoint(from, monster, this.velocities.get(monster.id), launcher.projectileSpeed);
      const targetId = monster.id;
      const fired = this.renderer.fire({
        from, to, duration: flightDurationMs(from, to, launcher.projectileSpeed),
        ammo: { id: 'naval-harpoon', size: 1.8, projectileSpeed: launcher.projectileSpeed,
          fx: { preset: 'rusted-iron', projectile: { texture: launcher.projectileAsset, scale: 1.5 } } },
        impactKind: 'water', startTime: now,
        onImpact: ({ at }) => {
          const current = this.getEntities().get(targetId);
          if (this.monsterAssistComplete(current)) return { kind: 'water' };
          const remaining = current.health - current.maxHealth * 0.03;
          const outcome = this.resolveHarpoonImpact(targetId, at, Math.min(25, remaining));
          if (this.monsterAssistComplete(current)) {
            this.finishMonsterAssistsFor(targetId);
            this.onFeedback('🤝 Monstro com 3% de vida. Ajudantes voltaram a navegar.');
          }
          return outcome;
        },
      });
      if (fired) {
        assist.nextShotAt = now + 7000;
      }
    }
  }

  getHarpoonStatus() {
    const target=this.getTarget();
    const launcher=equippedHarpoon(this.readSave());
    const distance=target?distanceBetween(this.getPlayer(),target):Infinity;
    const now=this.clock();
    return {launcher, target, distance, cooldownMs:Math.max(0,this.nextHarpoonAt-now),
      ready: harpoonStock(this.readSave()) + armorPiercingHarpoonStock(this.readSave())>0 && target?.type==='monster' && target.health>0
        && distance<=launcher.range && this.getHealth()>0 && now>=this.nextHarpoonAt};
  }

  fireHarpoon() {
    const status=this.getHarpoonStatus();
    if (!status.ready) {
      this.onFeedback(status.cooldownMs>0
        ? '⚓ Arpão recarregando: '+Math.ceil(status.cooldownMs/1000)+'s.'
        : '⚓ Arpões atingem apenas monstros vivos dentro do alcance.');
      return false;
    }
    const {launcher,target}=status;
    const player=this.getPlayer(),now=this.clock();
    const from={x:player.x,y:player.y};
    const save=this.readSave();
    const piercing=armorPiercingHarpoonStock(save)>0;
    const harpoonAmmoId=piercing?ARMOR_PIERCING_HARPOON_ID:HARPOON_AMMO_ID;
    const aim=interceptPoint(from,target,this.velocities.get(target.id),launcher.projectileSpeed);
    const destination=aimWithAccuracy(aim,from,launcher.accuracy,this.random);
    const targetId=target.id;
    const flameBoost=this.isFlameActive();
    const accepted=this.renderer.fire({
      from,to:destination,duration:flightDurationMs(from,destination,launcher.projectileSpeed),
      ammo:{id:'naval-harpoon',name:piercing?'Arpão Quebra-Couraça':'Arpão do Marujo',size:1.8,
        projectileSpeed:launcher.projectileSpeed,
        fx:{preset:'rusted-iron',projectile:{texture:launcher.projectileAsset,scale:1.5}}},
      impactKind:'water',startTime:now,flameBoost,
      onImpact:({at})=>this.resolveHarpoonImpact(targetId,at,(launcher.dotDamage?harpoonDamage(launcher):(piercing?ARMOR_PIERCING_HARPOON_DAMAGE:harpoonDamage(launcher)))*(flameBoost?5:1),launcher),
    });
    if (!accepted) {this.onFeedback('⚠️ Disparo de arpão indisponível.');return false;}
    this.writePatch({harpoonAmmo:{...(save.harpoonAmmo??{}),[harpoonAmmoId]:(piercing?armorPiercingHarpoonStock(save):harpoonStock(save))-1}});
    this.nextHarpoonAt=now+Math.max(100,launcher.reloadSeconds*1000/(flameBoost?5:1));
    this.onFeedback((flameBoost?'🔥 Arpão em chamas':'⚓ Arpão')+' lançado contra '+target.name+'!');
    return true;
  }

  resolveHarpoonImpact(targetId,point,damage,launcher=null) {
    const monster=this.getEntities().get(targetId);
    if (!monster||monster.type!=='monster'||monster.health<=0)return {kind:'water'};
    if (!shipCollision(point,monster,56))return {kind:'water'};
    const underwater=(this.renderer.getKrakenAttacks?.()??[])
      .some(a=>a.monsterId===targetId&&this.clock()>=a.startTime+300&&this.clock()<a.startTime+1720);
    if (underwater)return {kind:'water'};
    const hit=damageMonster(monster,damage,this.clock());
    if(!hit)return {kind:'water'};
    if(monster.health>0)monster.state='retaliating';
    if(launcher?.dotDamage && monster.health>0){
      monster.armorBreakerDot={damage:launcher.dotDamage,interval:launcher.dotIntervalMs||3000,
        nextAt:this.clock()+(launcher.dotIntervalMs||3000)};
    }
    this.onFeedback('⚓ Arpão atingiu '+monster.name+'! -'+hit.damage+' PV.');
    if(this.monsterAssistComplete(monster)) this.finishMonsterAssistsFor(targetId);
    if(monster.health<=0){this.firing=false;this.cancelMonsterAssists();this.onVictory(monster);}
    return {kind:'ship'};
  }

  trackMovement(stepMs) {
    const seconds = Math.max(.001, stepMs / 1000);
    for (const entity of this.getEntities().values()) {
      if ((entity.type !== 'npc' && entity.type !== 'monster') || entity.health <= 0) continue;
      const old = this.previousPositions.get(entity.id);
      const velocity = old
        ? { x: (entity.x - old.x) / seconds, y: (entity.y - old.y) / seconds }
        : { x: 0, y: 0 };
      this.velocities.set(entity.id,
        Math.hypot(velocity.x, velocity.y) < 260 ? velocity : { x: 0, y: 0 });
      this.previousPositions.set(entity.id, { x: entity.x, y: entity.y });
    }
  }

  update(stepMs, now = this.clock()) {
    this.trackMovement(stepMs);
    // Ressurgimento reinicia uma nova batalha contra o mesmo ID de monstro.
    for (const monster of this.getEntities().values()) {
      if (monster.type !== 'monster') continue;
      if (monster.health <= 0) {
        this.assistMonsterAlive.delete(monster.id);
        this.usedAssistNpcs.delete(monster.id);
      } else if (!this.assistMonsterAlive.has(monster.id)) {
        this.assistMonsterAlive.add(monster.id);
      }
    }
    // Armor Breaker DOT: 25 actual HP every 3 seconds until the monster dies.
    for(const monster of this.getEntities().values()){
      const dot=monster.armorBreakerDot;
      if(monster.type!=='monster'||!dot||monster.health<=0)continue;
      if(now>=dot.nextAt){
        const ticks=Math.min(10,1+Math.floor((now-dot.nextAt)/dot.interval));
        dot.nextAt+=ticks*dot.interval;
        const hit=damageMonster(monster,dot.damage*ticks,now);
        if(hit?.defeated){delete monster.armorBreakerDot;this.firing=false;this.cancelMonsterAssists();this.onVictory(monster);}
      }
    }
    this.updateAutoTarget(stepMs);
    // Do not parse localStorage every frame when no cannon is firing.
    if (this.firing) {
      const status = this.getStatus();
      if (!status.ready) {
        this.firing = false;
        this.cancelMonsterAssists();
        this.onFeedback(status.reason === 'range'
          ? '⏸ Alvo saiu do alcance.' : '⏹ Disparos interrompidos.');
      } else if (this.getTarget()?.type === 'monster') {
        if (now >= this.nextHarpoonAt) this.fireHarpoon();
      } else this.firePlayerVolley(now);
    }
    this.fireAssistHarpoon(now);
    this.fireNpcVolleys(now);
    this.fireKrakenStrikes(now);
  }

  firePlayerVolley(now) {
    const status = this.getStatus();
    if (!status.ready || now < this.nextPlayerSequenceAt) return 0;
    const player = this.getPlayer(), target = this.getTarget();
    const save = this.readSave();
    const battery = armedCannons(save, this.shipId)
      .filter(({ cannon }) => distanceBetween(player, target) <= cannonRange(cannon));
    if (!battery.length) return 0;

    const ammoStockById = {...(save.ammunition ?? {})};
    const startIndex = ((this.playerSequenceCursor % battery.length) + battery.length) % battery.length;

    for (let attempt = 0; attempt < battery.length; attempt++) {
      const batteryIndex = (startIndex + attempt) % battery.length;
      const { slot, cannon } = battery[batteryIndex];
      if (now < (this.nextBySlot.get(slot) ?? -Infinity)) continue;

      const ammoId = cannon.exclusiveAmmoId
        ? cannon.exclusiveAmmoId
        : (cannonAcceptsAmmo(cannon, this.selectedAmmoId) && ammoStockById[this.selectedAmmoId] > 0
          ? this.selectedAmmoId
          : availableNavalAmmo({...save,ammunition:ammoStockById})
            .find(item => item.amount > 0 && cannonAcceptsAmmo(cannon,item.id))?.id);
      if (!cannonAcceptsAmmo(cannon, ammoId)) continue;

      const remaining = ammoStockById[ammoId] === undefined ? ammoStock(save, ammoId) : ammoStockById[ammoId];
      if (remaining <= 0) continue;
      const ammo = effectiveAmmo(ammoId);
      if (!ammo) continue;

      const muzzle = this.getMappedMuzzle({
        player, target, heading: player.heading, slot, cannon,
      }) ?? cannonHardpoint(player, target, player.heading, batteryIndex, battery.length);
      const speed = ammo.projectileSpeed;
      const intercepted = interceptPoint(muzzle, target, this.velocities.get(target.id), speed);
      const accuracy = target.archetype === 'fugitive-frigate' && this.getThiefMissionTarget() ? 1 : cannon.accuracy;
      const destination = aimWithAccuracy(intercepted, muzzle, accuracy, this.random);
      const flameBoost = this.isFlameActive();
      const damage = shotDamage(cannon, ammo.id) * (flameBoost ? 5 : 1);
      const tracking = ammo.trackingDurationMs > 0;
      const accepted = this.renderer.fire({
        from: muzzle, to: destination,
        duration: tracking ? ammo.trackingDurationMs : flightDurationMs(muzzle, destination, speed),
        ammo, flameBoost, ...(tracking ? { trackingTarget: target, trackingSpeed: speed } : {}),
        impactKind: 'water', startTime: now,
        onImpact: ({ at }) => this.resolvePlayerImpact(target.id, at, damage),
      });
      if (!accepted) return 0;

      ammoStockById[ammoId] = remaining - 1;
      this.writePatch({ammunition: {...save.ammunition, ...ammoStockById}});
      this.nextBySlot.set(slot, now + Math.max(100, cannon.reloadSeconds * 1000 / (flameBoost ? 5 : 1)));
      this.playerSequenceCursor = (batteryIndex + 1) % battery.length;
      this.nextPlayerSequenceAt = now + (battery.length > 1 ? PLAYER_CANNON_SEQUENCE_MS : 0);
      this.onFeedback('💥 1 bala disparada.');
      return 1;
    }
    return 0;
  }

  resolvePlayerImpact(targetId, at, damage) {
    const target = this.getEntities().get(targetId);
    const lockedThief = this.getThiefMissionTarget();
    if (lockedThief && target?.id !== lockedThief.id) return { kind: 'water' };
    if(target?.id==='r2-morbi' && this.readSave().r2Campaign?.active!=='r2-golden-ii')return {kind:'water'};
    if (this.isProtectedInformant(target)) {
      this.onFeedback('🕊️ O informante não pode ser atacado durante a missão.');
      return { kind: 'water' };
    }
    if (target?.type === 'monster') {
      this.onFeedback('⚓ Monstros são imunes a bolas de canhão. Utilize o arpão.');
      return {kind:'water'};
    }
    if (target?.negotiationFrozen) {
      this.onFeedback('💦 O ladrão está protegido durante a negociação.');
      return { kind: 'water' };
    }
    if (target?.attackProtectedUntil && Date.now() < target.attackProtectedUntil) {
      const remaining = Number.isFinite(target.attackProtectedUntil)
        ? Math.ceil((target.attackProtectedUntil - Date.now()) / 1000) : null;
      if (target.merchantKind === 'black-market') {
        this.onFeedback('☠️ Este mercador não participa de combate. Aproxime-se para negociar.');
      } else {
        this.onFeedback(remaining === null
          ? '🕊️ O informante está protegido durante a negociação.'
          : '🕊️ Trégua do informante: ' + remaining + 's para liberar o combate.');
      }
      return { kind: 'water' };
    }
    // Submerged Kraken cannot be hit: projectiles splash in the ocean.
    const underwater = target?.type === 'monster' && (this.renderer.getKrakenAttacks?.() ?? [])
      .some(attack => attack.monsterId === targetId && this.clock() >= attack.startTime + 300
        && this.clock() < attack.startTime + 1720);
    if (underwater) {
      this.onFeedback('💦 Kraken submerso! A bala caiu na água.');
      return { kind: 'water' };
    }
    const hitRadius = target?.archetype === 'fugitive-frigate' && this.getThiefMissionTarget() ? 80 : 56;
    if (!shipCollision(at, target, hitRadius)) {
      this.onFeedback('💦 A bala caiu na água.');
      return { kind: 'water' };
    }
    if (target.archetype === RED_SAIL_CORSAIR.id) {
      damageCorsair(target, damage, 'player');
    } else {
      target.health = Math.max(0, target.health - damage);
      target.state = target.health ? (target.aggression === 'flee' ? 'fleeing' : 'retaliating') : 'sunk';
      target.lastAttackerId = 'player';
    }
    if(target.id==='r2-morbi'&&this.getRegionId()==='r2'){
      const save=this.readSave();
      this.writePatch({r2MorbiBoss:{health:target.health,maxHealth:900000,
        x:target.x,y:target.y,heading:target.heading,updatedAt:Date.now()}});
    }
    // Persist boss HP immediately on each impact, not only on periodic autosave.
    // This survives refresh even if the player has not yet defeated the boss.
    if (this.getRegionId()==='r2' && target.archetype==='fugitive-frigate'
      && this.readSave().r2Campaign?.active==='r2-destroy-thief') {
      const snapshot=this.readSave().r2ThiefBoss??{};
      this.writePatch({r2ThiefBoss:{...snapshot,missionId:'r2-destroy-thief',
        health:Math.max(0,Number(target.health)||0),maxHealth:100000,
        x:Number(target.x)||0,y:Number(target.y)||0,
        heading:Number(target.heading)||0,updatedAt:Date.now()}});
    }
    this.onFeedback('💥 Acertou ' + target.name + '! -' + damage + ' PV.');
    if (target.health <= 0) {
      if (target.id === this.targetId) { this.firing = false; this.cancelMonsterAssists(); }
      this.onVictory(target);
    }
    return { kind: 'ship' };
  }

  // Kraken attacks have an independent cooldown and only damage on contact.
  fireKrakenStrikes(now) {
    if(this.getHealth()<=0)return;
    const player=this.getPlayer();
    for(const monster of this.getEntities().values()){
      if(monster.type!=='monster'||monster.health<=0||monster.state!=='retaliating')continue;
      if(distanceBetween(monster,player)>KRAKEN_RETALIATION_RANGE)continue;
      if(now<(this.nextKrakenStrike.get(monster.id)??-Infinity))continue;
      const destination={x:player.x,y:player.y};
      const accepted=this.renderer.attackKraken?.({
        from:monster,to:destination,monsterId:monster.id,startTime:now,duration:1720,
        onImpact:({at})=>{
          const ship=this.getPlayer();
          const current=this.getEntities().get(monster.id);
          if(!current||current.health<=0||this.getHealth()<=0
            ||distanceBetween(current,ship)>KRAKEN_RETALIATION_RANGE
            ||!shipCollision(at,{...ship,health:this.getHealth()},56))return;
          const save=this.readSave();
          const health=Math.max(0,this.getHealth()-8);
          if (this.isShieldActive() || this.readSave().combat?.repairingUntil) return;
          this.writePatch({combat:{...save.combat,shipHealth:health}});
          this.onFeedback(health>0?'🐙 Kraken atingiu o casco! -8 PV.':'☠️ Kraken afundou seu navio!');
          if(!health)this.firing=false;
        },
      });
      if(accepted)this.nextKrakenStrike.set(monster.id,now+4500);
    }
  }

  fireNpcVolleys(now) {
    const player = this.getPlayer();
    if (this.getHealth() <= 0) return;
    for (const npc of this.getEntities().values()) {
      if(npc.id==='r2-pumpkin-ally'){
        const morbi=this.getEntities().get('r2-morbi');
        if(this.readSave().r2Campaign?.active==='r2-golden-ii'
          && morbi?.health>0 && distanceBetween(npc,morbi)<=300 && now>=(this.nextNpcShot.get(npc.id)??-Infinity)){
          const muzzle=cannonHardpoint(npc,morbi,npc.heading,0,8);
          const aim={x:morbi.x,y:morbi.y};
          const fired=this.renderer.fire({from:muzzle,to:aim,
            duration:flightDurationMs(muzzle,aim,550),ammo:this.enemyAmmo,
            impactKind:'ship',startTime:now,onImpact:({at})=>{
              const boss=this.getEntities().get('r2-morbi');
              if(!boss||boss.health<=0||!shipCollision(at,boss,110))return {kind:'water'};
              boss.health=Math.max(0,boss.health-250);
              this.writePatch({r2MorbiBoss:{health:boss.health,maxHealth:900000,
                x:boss.x,y:boss.y,heading:boss.heading,updatedAt:Date.now()}});
              if(boss.health===0){boss.state='sunk';this.onVictory(boss);}
              return {kind:'ship'};
            }});
          if(fired)this.nextNpcShot.set(npc.id,now+5000);
        }
        continue;
      }
      if(npc.id==='r2-morbi' && npc.health>0){
        const mission=this.readSave().r2Campaign?.active;
        const stageTwo=mission==='r2-golden-ii';
        const firstEncounter=mission==='r2-golden-i';
        const cannon=npc.specialCannon??{};
        const broadside=npc.broadside??{};
        const extreme=stageTwo && npc.broadsideActive===true;
        const specialRange=Math.max(1,Number(cannon.range)||840);
        const broadsideRange=Math.max(1,Number(broadside.range)||specialRange);
        const engagementRange=firstEncounter?2400:(extreme?Math.max(specialRange,broadsideRange):specialRange);
        const distance=distanceBetween(npc,player);
        if(['r2-golden-i','r2-golden-ii'].includes(mission) && distance<=engagementRange){
          const controller=this;
          const fireShot=({slot,count,damage,speed=650,tracking=false})=>{
            const muzzle=cannonHardpoint(npc,player,npc.heading,slot,count);
            const aimed={x:player.x,y:player.y};
            return this.renderer.fire({
              from:muzzle,to:aimed,
              duration:flightDurationMs(muzzle,aimed,speed),ammo:this.enemyAmmo,
              ...(tracking?{trackingTarget:{
                get x(){return controller.getPlayer().x;},
                get y(){return controller.getPlayer().y;},
                get health(){return controller.getHealth();}
              },trackingSpeed:850}:{}),
              impactKind:'water',startTime:now,
              onImpact:({at})=>this.resolveNpcImpact(npc.id,at,damage)
            });
          };

          const specialKey=npc.id+':special';
          if(now>=(this.nextNpcShot.get(specialKey)??-Infinity) && distance<=specialRange){
            const specialDamage=Math.max(1,Number(cannon.damage)||Number(npc.damage)||1200);
            const specialReload=Math.max(1000,Number(cannon.reloadMs)||45000);
            const specialCount=extreme
              ? Math.max(2,Number(cannon.countAfterPhase)||2)
              : Math.max(1,Number(cannon.countBeforePhase)||1);
            let firedSpecial=0;
            for(let slot=0;slot<specialCount;slot++){
              if(fireShot({slot,count:specialCount,damage:specialDamage,tracking:firstEncounter}))firedSpecial++;
            }
            if(firedSpecial)this.nextNpcShot.set(specialKey,now+specialReload);
          }

          if(extreme && distance<=broadsideRange){
            const broadsideKey=npc.id+':broadside';
            if(now>=(this.nextNpcShot.get(broadsideKey)??-Infinity)){
              const regularCount=Math.max(1,Number(broadside.regularCannons)||18);
              const regularDamage=Math.max(1,Number(broadside.regularDamage)||300);
              const reloadMs=Math.max(500,Number(broadside.reloadMs)||3000);
              let firedRegular=0;
              for(let slot=0;slot<regularCount;slot++){
                if(fireShot({slot,count:regularCount,damage:regularDamage,speed:520}))firedRegular++;
              }
              if(firedRegular)this.nextNpcShot.set(broadsideKey,now+reloadMs);
            }
          }
        }
        continue;
      }
      if (npc.archetype === 'fugitive-frigate' && this.getThiefMissionTarget()?.id === npc.id) {
        if (distanceBetween(npc, player) > 840 || now < (this.nextNpcShot.get(npc.id) ?? -Infinity)) continue;
        const muzzle = cannonHardpoint(npc, player, npc.heading, 0, 1);
        const aim = {x: player.x, y: player.y};
        const controller = this;
        const fired = this.renderer.fire({
          from: muzzle, to: aim, duration: 9000,
          trackingTarget: {
            get x(){return controller.getPlayer().x;},
            get y(){return controller.getPlayer().y;},
            get health(){return controller.getHealth();}
          },
          trackingSpeed: 700, ammo: effectiveAmmo('aetherion-seeker'),
          impactKind: 'water', startTime: now,
          onImpact: ({ at }) => this.resolveNpcImpact(npc.id, at, 3),
        });
        if (fired) this.nextNpcShot.set(npc.id, now + 1173);
        continue;
      }
      if (npc.type !== 'npc' || npc.health <= 0 || npc.state !== 'retaliating' ||
        npc.aggression === 'flee' || npc.cannonSlots === 0) continue;
      const npcRange = Math.max(1, Number(npc.range) || 340);
      if (distanceBetween(npc, player) > npcRange) continue;
      if (now < (this.nextNpcShot.get(npc.id) ?? -Infinity)) continue;
      const muzzle = cannonHardpoint(npc, player, npc.heading, 0, Math.max(1, npc.cannonSlots));
      const aim = aimWithAccuracy(player, muzzle, .66, this.random);
      const accepted = this.renderer.fire({
        from: muzzle, to: aim, duration: flightDurationMs(muzzle, aim, 400),
        ammo: this.enemyAmmo, impactKind: 'water', startTime: now,
        onImpact: ({ at }) => this.resolveNpcImpact(npc.id, at, Math.max(1, Number(npc.damage) || 5)),
      });
      if (accepted) this.nextNpcShot.set(npc.id, now + 1800);
    }
  }

  resolveNpcImpact(npcId, point, damage = 5) {
    if(npcId==='r2-morbi' && !['r2-golden-i','r2-golden-ii'].includes(this.readSave().r2Campaign?.active))return {kind:'water'};
    const player = this.getPlayer();
    if (!shipCollision(point, { ...player, health: this.getHealth() }, 56)) {
      return { kind: 'water' };
    }
    const scriptedMorbiSinking=npcId==='r2-morbi' && this.readSave().r2Campaign?.active==='r2-golden-i';
    if (!scriptedMorbiSinking && (this.isShieldActive() || this.readSave().combat?.repairingUntil)) return {kind:'ship'};
    const save = this.readSave();
    const health = Math.max(0, this.getHealth() - damage);
    this.writePatch({ combat: { ...save.combat, shipHealth: health } });
    this.onFeedback('💥 Navio inimigo acertou seu casco! -' + damage + ' PV. ' + health + '/100 PV.');
    if (!health) {
      this.firing = false;
      this.onFeedback('☠️ Navio destruído. Procure reparos.');
      this.onPlayerSunk(npcId);
    }
    return { kind: 'ship' };
  }

  render(now, camera, zoom, width, height) {
    return this.renderer.render({ time: now, camera, zoom, width, height });
  }

  dispose() {
    this.firing = false;
    this.cancelMonsterAssists();
    this.renderer.destroy();
  }
}
