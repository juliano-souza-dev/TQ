import test from 'node:test';
import assert from 'node:assert/strict';
import { createNavalCombatHud } from '../src/ui/NavalCombatHud.js';
import { repairHull } from '../src/combat/HullRepair.js';

class FakeNode {
  constructor(tag) {
    this.tagName = tag;
    this.children = [];
    this.handlers = new Map();
    this.classList = { toggle() {} };
    this.attributes = new Map();
    this.disabled = false;
    this.textContent = '';
    this.value = '';
  }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = [...nodes]; }
  addEventListener(event, handler) { this.handlers.set(event, handler); }
  setAttribute(key, value) { this.attributes.set(key, value); }
  get src() { return this._src; }
  set src(value) { this._src = value; }
  click() { this.handlers.get('click')?.(); }
}

test('repair icon belongs to naval HUD and opens a separate interaction', () => {
  const originalDocument = globalThis.document;
  globalThis.document = { createElement: tag => new FakeNode(tag) };
  try {
    let life = 45, requested = 0;
    const controller = {
      getHealth: () => life,
      getStatus: () => ({
        health: life, firing: false, ready: false, reason: 'target',
        ammoId: 'rusted-iron', ammo: 10,
        options: [{ id: 'rusted-iron', name: 'Ferro', amount: 10 }],
      }),
      toggleFire() {},
      setAmmo() { return false; },
    };
    const hud = createNavalCombatHud(controller, {
      onRepair: () => { requested++; return true; },
    });
    const hullRow = hud.element.children[0];
    assert.equal(hullRow.className, 'combat-hull-row');
    const controls = hud.element.children[4];
    const repairButton = controls.children[2];
    assert.equal(controls.children[1].className, 'combat-fire-icon-button');
    assert.equal(repairButton.className, 'naval-repair-button');
    assert.equal(repairButton.attributes.get('aria-label'), 'Reparar navio resolvendo uma continha');
    assert.equal(repairButton.disabled, false);
    assert.match(repairButton.children[0].src, /consertar_navio\\.webp/);
    repairButton.click();
    assert.equal(requested, 1);

    life = 100;
    hud.refresh();
    assert.equal(repairButton.disabled, true);
    assert.match(repairButton.children[0].src, /consertar_navio_bloqueado\\.webp/);
    repairButton.click();
    assert.equal(requested, 1, 'a full-health ship must not initiate another repair');
  } finally {
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
});

test('hull restore is 20% of maximum HP, capped at 30% with future consumables', () => {
  let save = { combat: { shipHealth: 30 } };
  const first = repairHull(save);
  assert.equal(first.after, 50);
  save = { ...save, ...first.patch };
  const boosted = repairHull(save, 50);
  assert.equal(boosted.after, 80, 'even large bonuses may only restore 30 PV');
  save = { ...save, ...boosted.patch };
  assert.equal(repairHull(save).after, 100);
  assert.equal(repairHull({ combat: { shipHealth: 100 } }), null);
});
