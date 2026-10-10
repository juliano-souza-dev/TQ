import {createGuidedPointerImage,computeGuidePointerAngle} from './GuidedPointer.js';
export {computeGuidePointerAngle} from './GuidedPointer.js';
// First-voyage onboarding. The visual guide points at the selected destination.
export function createFirstVoyageGuide(world, { onAcknowledge = () => {} } = {}) {
  let destination = 'missions';
  const getTarget = () => typeof destination === 'object' ? destination : world.region.islands.find(island => island.kind === destination);
  const arrow = document.createElement('div');
  arrow.className = 'voyage-arrow';
  arrow.setAttribute('aria-label', 'Direção do porto das missões');
  arrow.innerHTML = '<span class="voyage-arrow-symbol"></span><span class="voyage-arrow-label">Porto das Missões</span>';
  arrow.querySelector('.voyage-arrow-symbol').append(createGuidedPointerImage('voyage-arrow-image'));
  arrow.hidden = true;
  const pointerIcon=arrow.querySelector('.voyage-arrow-symbol');
  const pointerLabel=arrow.querySelector('.voyage-arrow-label');
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
    // Prefer the live entity position, e.g. Silas Rubro, over its initial spawn.
    const live=typeof destination==='object' ? world.entities?.get?.(destination.id) : null;
    const objective=live && Number.isFinite(live.x) && Number.isFinite(live.y) ? live : target;
    const oceanRect=document.getElementById('ocean')?.getBoundingClientRect();
    const viewportRect=oceanRect?.width>0 && oceanRect?.height>0
      ? oceanRect : {left:0,top:0,width:window.innerWidth,height:window.innerHeight};
    const angle=computeGuidePointerAngle({
      target:objective,
      cameraView:world.cameraView??world.camera,
      zoom:world.camera.zoom,
      viewportRect,
      pointerRect:pointerIcon.getBoundingClientRect(),
    });
    arrow.style.setProperty('--voyage-angle', angle + 'deg');
    const distance=Math.round(Math.hypot(objective.x-world.camera.x,objective.y-world.camera.y));
    pointerLabel.textContent=(typeof destination==='object' ? destination.name : destination==='shipyard' ? 'Estaleiro' : 'Porto das Missões')+' · '+distance+' m';
  }
  return {
    elements: [arrow, modal],
    update,
    guideTo(kind) { destination = kind; modal.hidden = true; arrow.hidden = false; update(); },
    finish() { arrow.hidden = true; modal.hidden = true; },
    dispose() { arrow.remove(); modal.remove(); },
  };
}
