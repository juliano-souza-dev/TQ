import { normalizeJoystickVector } from '../world/WorldNavigationInput.mjs';

// Pointer-only analog input. No world, renderer or gameplay dependencies.
export function createAnalogJoystick({ onChange = () => {} } = {}) {
  const base = document.createElement('div');
  base.className = 'analog-joystick';
  base.setAttribute('role', 'group');
  base.setAttribute('aria-label', 'Controle de navegação');
  const knob = document.createElement('div');
  knob.className = 'analog-knob';
  base.append(knob);
  let activePointer = null;
  let vector = { x: 0, y: 0 };
  const emit = (x, y) => {
    vector = { x, y };
    knob.style.transform = `translate(${x * 38}px, ${y * 38}px)`;
    onChange({ ...vector });
  };
  const move = event => {
    if (event.pointerId !== activePointer) return;
    const rect = base.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const radius = rect.width * 0.28;
    const length = Math.hypot(dx, dy);
    const input = normalizeJoystickVector(dx, dy, radius);
    emit(input.x, input.y);
  };
  const release = event => {
    if (event.pointerId !== activePointer) return;
    activePointer = null;
    if (base.hasPointerCapture(event.pointerId)) base.releasePointerCapture(event.pointerId);
    emit(0, 0);
  };
  base.addEventListener('pointerdown', event => {
    if (activePointer !== null) return;
    activePointer = event.pointerId;
    base.setPointerCapture(event.pointerId);
    move(event);
    event.preventDefault();
  });
  base.addEventListener('pointermove', move);
  base.addEventListener('pointerup', release);
  base.addEventListener('pointercancel', release);
  base.addEventListener('lostpointercapture', () => { activePointer = null; emit(0, 0); });
  return { element: base, getVector: () => ({ ...vector }), reset: () => emit(0, 0) };
}
