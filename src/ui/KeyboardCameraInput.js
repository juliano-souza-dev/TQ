// Desktop-only camera input. Does not move the ship or change its heading.
export function createKeyboardCameraInput() {
  const pressed = new Set();
  const keys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD']);
  const editable = element => element?.closest?.('input, textarea, select, [contenteditable="true"]');
  const down = event => {
    if (!keys.has(event.code) || editable(event.target)) return;
    pressed.add(event.code);
    event.preventDefault();
  };
  const up = event => { pressed.delete(event.code); };
  const clear = () => pressed.clear();
  document.addEventListener('keydown', down, true);
  document.addEventListener('keyup', up, true);
  window.addEventListener('blur', clear);
  return {
    getVector() {
      const x = Number(pressed.has('KeyD')) - Number(pressed.has('KeyA'));
      const y = Number(pressed.has('KeyS')) - Number(pressed.has('KeyW'));
      const len = Math.max(1, Math.hypot(x, y));
      return { x: x / len, y: y / len };
    },
    dispose() {
      document.removeEventListener('keydown', down, true);
      document.removeEventListener('keyup', up, true);
      window.removeEventListener('blur', clear);
      clear();
    },
  };
}
