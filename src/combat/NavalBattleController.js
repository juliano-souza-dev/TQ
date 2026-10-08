import { damageCorsair, RED_SAIL_CORSAIR } from '../npcs/RedSailCorsair.js';
import {
  ammoStock, armedCannons, availableNavalAmmo, cannonHardpoint, cannonRange,
  effectiveAmmo, aimWithAccuracy, distanceBetween, flightDurationMs,
  interceptPoint, shipCollision, shotDamage,
} from './NavalBattleRules.js';

// The battle controller owns combat state, cooldowns, target selection, ammo
// debits, moving-target impact checks and NPC retaliation. WebGL owns only FX.
export class NavalBattleController {
  constructor({
    renderer, readSave, writePatch, getPlayer, getEntities, shipId,
    onFeedback = () => {}, onVictory = () => {},
    random = Math.random, clock = () => performance.now(),
  }) {
    if (!renderer || !readSave || !writePatch || !getPlayer || !getEntities || !shipId) {
      throw new TypeError('NavalBattleController requires renderer and world adapters');
    }
    Object.assign(this, {
      renderer, readSave, writePatch, getPlayer, getEntities, shipId,
      onFeedback, onVictory, random, clock,
    });
    this.targetId = null;
    this.firing = false;
    this.nextBySlot = new Map();
    this.nextNpcShot = new Map();
    this.previousPositions = new Map();
    this.velocities = new Map();
    this.enemyAmmo = effectiveAmmo('rusted-iron');
    this.renderer.prepareAmmo?.(this.enemyAmmo);
    this.selectedAmmoId = this.resolveSelectedAmmo();
  }

  resolveSelectedAmmo() {
    const save = this.readSave();
    const requested = save.selectedNavalAmmoId;
    const options = availableNavalAmmo(save);
    if (requested && options.some(item => item.id === requested && item.amount > 0)) return requested;
    return options.find(item => item.id === 'rusted-iron' && item.amount > 0)?.id
      || options.find(item => item.amount > 0)?.id || 'rusted-iron';
  }

  setAmmo(ammoId) {
    const selected = availableNavalAmmo(this.readSave())
      .find(item => item.id === ammoId && item.amount > 0);
    if (!selected) return false;
    this.selectedAmmoId = selected.id;
    this.writePatch({ selectedNavalAmmoId: selected.id });
    const ammo = effectiveAmmo(selected.id);
    if (ammo) this.renderer.prepareAmmo?.(ammo);
    return true;
  }

  setTarget(id) {
    if (this.targetId !== id) this.firing = false;
    this.targetId = id || null;
  }

  getTarget() {
    const entity = this.getEntities().get(this.targetId);
    return entity?.type === 'npc' && entity.health > 0 ? entity : null;
  }

  getStatus() {
    const save = this.readSave();
    const battery = armedCannons(save, this.shipId);
    const player = this.getPlayer();
    const target = this.getTarget();
    const distance = target ? distanceBetween(player, target) : Infinity;
    const inRangeCannons = battery.filter(({ cannon }) => distance <= cannonRange(cannon));
    const ammo = ammoStock(save, this.selectedAmmoId);
    const missionActive = save.missions?.corsair === 'active';
    let reason = 'ready';
    if (!missionActive) reason = 'mission';
    else if (!battery.length) reason = 'no-cannon';
    else if (!target) reason = 'target';
    else if (!inRangeCannons.length) reason = 'range';
    else if (!ammo || !effectiveAmmo(this.selectedAmmoId)) reason = 'ammo';
    else if (this.getHealth() <= 0) reason = 'sunk';
    return {
      firing: this.firing,
      ready: reason === 'ready',
      reason, distance,
      range: battery.length ? Math.max(...battery.map(({ cannon }) => cannonRange(cannon))) : 0,
      targetName: target?.name || '',
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
      this.onFeedback('⏹ Disparos interrompidos. Balas em voo continuam.');
      return true;
    }
    const status = this.getStatus();
    if (!status.ready) return false;
    this.firing = true;
    this.firePlayerVolley(this.clock());
    return true;
  }

  trackMovement(stepMs) {
    const seconds = Math.max(.001, stepMs / 1000);
    for (const entity of this.getEntities().values()) {
      if (entity.type !== 'npc' || entity.health <= 0) continue;
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
    // Do not parse localStorage every frame when no cannon is firing.
    if (this.firing) {
      const status = this.getStatus();
      if (!status.ready) {
        this.firing = false;
        this.onFeedback(status.reason === 'range'
          ? '⏸ Alvo saiu do alcance.' : '⏹ Disparos interrompidos.');
      } else this.firePlayerVolley(now);
    }
    this.fireNpcVolleys(now);
  }

  firePlayerVolley(now) {
    const status = this.getStatus();
    if (!status.ready) return 0;
    const player = this.getPlayer(), target = this.getTarget();
    const save = this.readSave();
    const battery = armedCannons(save, this.shipId)
      .filter(({ cannon }) => distanceBetween(player, target) <= cannonRange(cannon));
    const ammo = effectiveAmmo(this.selectedAmmoId);
    if (!ammo || !battery.length) return 0;

    let remaining = ammoStock(save, ammo.id);
    let spent = 0;
    for (const [batteryIndex, { slot, cannon }] of battery.entries()) {
      if (!remaining) break;
      if (now < (this.nextBySlot.get(slot) ?? -Infinity)) continue;
      const muzzle = cannonHardpoint(player, target, player.heading, batteryIndex, battery.length);
      const speed = ammo.projectileSpeed;
      const intercepted = interceptPoint(muzzle, target, this.velocities.get(target.id), speed);
      const destination = aimWithAccuracy(intercepted, muzzle, cannon.accuracy, this.random);
      const duration = flightDurationMs(muzzle, destination, speed);
      const damage = shotDamage(cannon, ammo.id);
      const targetId = target.id;
      const accepted = this.renderer.fire({
        from: muzzle, to: destination, duration, ammo,
        impactKind: 'water', startTime: now,
        onImpact: ({ at }) => this.resolvePlayerImpact(targetId, at, damage),
      });
      if (!accepted) {
        this.firing = false;
        this.onFeedback('⚠️ Renderizador naval indisponível. Munição preservada.');
        break;
      }
      spent++;
      remaining--;
      this.nextBySlot.set(slot, now + Math.max(100, cannon.reloadSeconds * 1000));
    }
    if (spent) {
      this.writePatch({
        ammunition: { ...save.ammunition, [ammo.id]: remaining },
      });
      this.onFeedback('💥 ' + spent + (spent === 1 ? ' bala disparada.' : ' balas disparadas.'));
    }
    return spent;
  }

  resolvePlayerImpact(targetId, at, damage) {
    const target = this.getEntities().get(targetId);
    if (!shipCollision(at, target, 56)) {
      this.onFeedback('💦 A bala caiu na água.');
      return { kind: 'water' };
    }
    if (target.archetype === RED_SAIL_CORSAIR.id) {
      damageCorsair(target, damage, 'player');
    } else {
      target.health = Math.max(0, target.health - damage);
      target.state = target.health ? 'retaliating' : 'sunk';
      target.lastAttackerId = 'player';
    }
    this.onFeedback('💥 Acertou ' + target.name + '! -' + damage + ' PV.');
    if (target.health <= 0) {
      if (target.id === this.targetId) this.firing = false;
      if (target.archetype === RED_SAIL_CORSAIR.id) this.onVictory(target);
    }
    return { kind: 'ship' };
  }

  fireNpcVolleys(now) {
    const player = this.getPlayer();
    if (this.getHealth() <= 0) return;
    for (const npc of this.getEntities().values()) {
      if (npc.type !== 'npc' || npc.health <= 0 || npc.state !== 'retaliating') continue;
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

  resolveNpcImpact(npcId, point) {
    const player = this.getPlayer();
    if (!shipCollision(point, { ...player, health: this.getHealth() }, 56)) {
      return { kind: 'water' };
    }
    const save = this.readSave();
    const health = Math.max(0, this.getHealth() - 5);
    this.writePatch({ combat: { ...save.combat, shipHealth: health } });
    this.onFeedback('💥 Corsário acertou seu casco! ' + health + '/100 PV.');
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
    this.renderer.destroy();
  }
}
