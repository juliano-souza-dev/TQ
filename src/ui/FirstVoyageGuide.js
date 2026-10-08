// First-voyage onboarding. The arrow points from the player to the mission harbor.
export function createFirstVoyageGuide(world, { onAcknowledge = () => {} } = {}) {
  let destination = 'missions';
  const getTarget = () => world.region.islands.find(island => island.kind === destination);
  const arrow = document.createElement('div');
  arrow.className = 'voyage-arrow';
  arrow.setAttribute('aria-label', 'Direção do porto das missões');
  arrow.innerHTML = '<span class="voyage-arrow-symbol">➤</span><span class="voyage-arrow-label">Porto das Missões</span>';
  arrow.hidden = true;
  const modal = document.createElement('section');
  modal.className = 'voyage-welcome';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Boas-vindas');
  const card = document.createElement('div');
  card.className = 'voyage-welcome-card';
  const title = document.createElement('h2');
  title.textContent = '🏴‍☠️ Bem-vindo ao Tabuada Quest!';
  const message = document.createElement('p');
  message.textContent = 'Sua aventura começa no Porto das Missões. Siga a seta para encontrar a ilha e iniciar suas missões!';
  const ok = document.createElement('button');
  ok.type = 'button';
  ok.className = 'primary-button';
  ok.textContent = 'Entendi! ⚓';
  ok.addEventListener('click', () => {
    modal.hidden = true;
    arrow.hidden = false;
    onAcknowledge();
  });
  card.append(title, message, ok);
  modal.append(card);
  function update() {
    const target = getTarget();
    if (arrow.hidden || !target) return;
    const dx = target.x - world.camera.x;
    const dy = target.y - world.camera.y;
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    arrow.style.setProperty('--voyage-angle', angle + 'deg');
    const distance = Math.round(Math.hypot(dx, dy));
    arrow.querySelector('.voyage-arrow-label').textContent = (destination === 'shipyard' ? 'Estaleiro' : 'Porto das Missões') + ' · ' + distance + ' m';
  }
  return {
    elements: [arrow, modal],
    update,
    guideTo(kind) { destination = kind; modal.hidden = true; arrow.hidden = false; update(); },
    finish() { arrow.hidden = true; modal.hidden = true; },
    dispose() { arrow.remove(); modal.remove(); },
  };
}
