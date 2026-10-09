import { equippedHarpoon, harpoonDamage, harpoonStock, HARPOON_AMMO_ID } from './HarpoonCatalog.js';
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

// The battle controller owns combat state, cooldowns, target selection, ammo
// debits, moving-target impact checks and NPC retaliation. WebGL owns only FX.
export class NavalBattleController {
  constructor({
    renderer, readSave, writePatch, getPlayer, getEntities, shipId,
    getRegionId = () => 'r1',
    getMappedMuzzle = () => null,
    onFeedback = () => {}, onVictory = () => {},
    random = Math.random, clock = () => performance.now(),
  }) {
    if (!renderer || !readSave || !writePatch || !getPlayer || !getEntities || !shipId) {
      throw new TypeError('NavalBattleController requires renderer and world adapters');
    }
    Object.assign(this, {
      renderer, readSave, writePatch, getPlayer, getEntities, shipId, getMappedMuzzle, getRegionId,
      onFeedback, onVictory, random, clock,
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
    return { selectedId: c.selectedId ?? 'flame-5x',
      quantities: c.quantities ?? {}, activeUntil: Number(c.activeUntil)||0,
      cooldownUntil: Number(c.cooldownUntil)||0 };
  }
  isFlameActive() {
    const c = this.getConsumables();
    return Date.now() < c.activeUntil;
  }
  selectConsumable(id) {
    if (id !== 'none' && id !== 'flame-5x') return false;
    const save = this.readSave();
    this.writePatch({consumables:{...(save.consumables??{}), selectedId:id}});
    return true;
  }
  activateConsumable() {
    const save = this.readSave(), c = this.getConsumables(), now = Date.now();
    if (c.selectedId !== 'flame-5x') return {ok:false,reason:'Selecione o consumível 5X em Chamas.'};
    if (c.activeUntil > now) return {ok:false,reason:'5X em Chamas já está ativo.'};
    if (c.cooldownUntil > now) return {ok:false,reason:'Aguarde '+Math.ceil((c.cooldownUntil-now)/1000)+'s para reutilizar.'};
    const count = Math.max(0,Math.floor(Number(c.quantities['flame-5x'])||0));
    if (!count) return {ok:false,reason:'Você não possui 5X em Chamas.'};
    this.writePatch({consumables:{...(save.consumables??{}),selectedId:c.selectedId,
      quantities:{...c.quantities,'flame-5x':count-1},
      activeUntil:now+60000,cooldownUntil:now+300000}});
    return {ok:true,reason:'🔥 5X em Chamas ativo por 60 segundos!'};
  }

  resolveSelectedAmmo() {
    const save = this.readSave();
    const requested = save.selectedNavalAmmoId;
    const options = availableNavalAmmo(save);
    const battery = armedCannons(save, this.shipId);
    const compatible = item => battery.some(({ cannon }) => cannonAcceptsAmmo(cannon, item.id));
    if (requested && options.some(item => item.id === requested && item.amount > 0 && compatible(item))) return requested;
    return options.find(item => item.id === 'aetherion-seeker' && item.amount > 0 && compatible(item))?.id
      || options.find(item => item.id === 'rusted-iron' && item.amount > 0 && compatible(item))?.id
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

  setTarget(id, { manual = false } = {}) {
    const thief = this.getThiefMissionTarget();
    if (thief && id && id !== thief.id) return false;
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
    const missionActive = this.getRegionId() !== 'r1'
      || save.missions?.corsair === 'active'
      || (save.missions?.corsair === 'complete' && (save.campaign?.active?.length ?? 0) > 0);
    let reason = 'ready';
    if (monsterTarget && this.getHealth() <= 0) reason = 'sunk';

    else if (monsterTarget && distance > harpoon.range) reason = 'range';
    else if (monsterTarget && harpoonStock(save) <= 0) reason = 'harpoon-ammo';
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
      harpoonAmmo: harpoonStock(save),
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

  getHealth() {
    const value = this.readSave().combat?.shipHealth;
    return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 100));
  }

  toggleFire() {
    if (this.firing) {
      this.firing = false;
      this.cancelMonsterAssists();
      this.onFeedback('⏹ Disparos interrompidos. Balas em voo continuam.');
      return true;
    }
    const status = this.getStatus();
    if (!status.ready) return false;
    this.firing = true;
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
      ready: harpoonStock(this.readSave())>0 && target?.type==='monster' && target.health>0
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
    const aim=interceptPoint(from,target,this.velocities.get(target.id),launcher.projectileSpeed);
    const destination=aimWithAccuracy(aim,from,launcher.accuracy,this.random);
    const targetId=target.id;
    const accepted=this.renderer.fire({
      from,to:destination,duration:flightDurationMs(from,destination,launcher.projectileSpeed),
      ammo:{id:'naval-harpoon',name:'Arpão do Marujo',size:1.8,
        projectileSpeed:launcher.projectileSpeed,
        fx:{preset:'rusted-iron',projectile:{texture:launcher.projectileAsset,scale:1.5}}},
      impactKind:'water',startTime:now,
      onImpact:({at})=>this.resolveHarpoonImpact(targetId,at,harpoonDamage(launcher)),
    });
    if (!accepted) {this.onFeedback('⚠️ Disparo de arpão indisponível.');return false;}
    const save=this.readSave();
    this.writePatch({harpoonAmmo:{...(save.harpoonAmmo??{}),[HARPOON_AMMO_ID]:harpoonStock(save)-1}});
    this.nextHarpoonAt=now+launcher.reloadSeconds*1000;
    this.onFeedback('⚓ Arpão lançado contra '+target.name+'!');
    return true;
  }

  resolveHarpoonImpact(targetId,point,damage) {
    const monster=this.getEntities().get(targetId);
    if (!monster||monster.type!=='monster'||monster.health<=0)return {kind:'water'};
    if (!shipCollision(point,monster,56))return {kind:'water'};
    const underwater=(this.renderer.getKrakenAttacks?.()??[])
      .some(a=>a.monsterId===targetId&&this.clock()>=a.startTime+300&&this.clock()<a.startTime+1720);
    if (underwater)return {kind:'water'};
    const hit=damageMonster(monster,damage,this.clock());
    if(!hit)return {kind:'water'};
    if(monster.health>0)monster.state='retaliating';
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
    if (!status.ready) return 0;
    const player = this.getPlayer(), target = this.getTarget();
    const save = this.readSave();
    const battery = armedCannons(save, this.shipId)
      .filter(({ cannon }) => distanceBetween(player, target) <= cannonRange(cannon));
    const ammoStockById = {...(save.ammunition ?? {})};
    let spent = 0;
    for (const [batteryIndex, { slot, cannon }] of battery.entries()) {
      if (now < (this.nextBySlot.get(slot) ?? -Infinity)) continue;
      // One synchronized volley; each cannon chooses only its compatible ammunition.
      const ammoId = cannon.exclusiveAmmoId || (cannonAcceptsAmmo(cannon, this.selectedAmmoId)
        ? this.selectedAmmoId : availableNavalAmmo(save).find(item => item.amount > 0
          && cannonAcceptsAmmo(cannon, item.id))?.id);
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
      if (!accepted) {
        this.firing = false;
        this.onFeedback('⚠️ Renderizador naval indisponível. Munição preservada.');
        break;
      }
      spent++;
      ammoStockById[ammoId] = remaining - 1;
      this.nextBySlot.set(slot, now + Math.max(100, cannon.reloadSeconds * 1000));
    }
    if (spent) {
      this.writePatch({ammunition: {...save.ammunition, ...ammoStockById}});
      this.onFeedback('💥 ' + spent + (spent === 1 ? ' bala disparada.' : ' balas disparadas.'));
    }
    return spent;
  }

  resolvePlayerImpact(targetId, at, damage) {
    const target = this.getEntities().get(targetId);
    const lockedThief = this.getThiefMissionTarget();
    if (lockedThief && target?.id !== lockedThief.id) return { kind: 'water' };
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
      this.onFeedback(remaining === null
        ? '🕊️ O informante está protegido durante a negociação.'
        : '🕊️ Trégua do informante: ' + remaining + 's para liberar o combate.');
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
      if (distanceBetween(npc, player) > 340) continue;
      if (now < (this.nextNpcShot.get(npc.id) ?? -Infinity)) continue;
      const muzzle = cannonHardpoint(npc, player, npc.heading, 0, 1);
      const aim = aimWithAccuracy(player, muzzle, .66, this.random);
      const accepted = this.renderer.fire({
        from: muzzle, to: aim, duration: flightDurationMs(muzzle, aim, 400),
        ammo: this.enemyAmmo, impactKind: 'water', startTime: now,
        onImpact: ({ at }) => this.resolveNpcImpact(npc.id, at),
      });
      if (accepted) this.nextNpcShot.set(npc.id, now + 1800);
    }
  }

  resolveNpcImpact(npcId, point, damage = 5) {
    const player = this.getPlayer();
    if (!shipCollision(point, { ...player, health: this.getHealth() }, 56)) {
      return { kind: 'water' };
    }
    const save = this.readSave();
    const health = Math.max(0, this.getHealth() - damage);
    this.writePatch({ combat: { ...save.combat, shipHealth: health } });
    this.onFeedback('💥 Navio inimigo acertou seu casco! -' + damage + ' PV. ' + health + '/100 PV.');
    if (!health) {
      this.firing = false;
      this.onFeedback('☠️ Navio destruído. Procure reparos.');
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
