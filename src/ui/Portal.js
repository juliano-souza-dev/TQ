function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function renderLogin(root, { onLogin, onLocal, busy = false, error = '' }) {
  const screen = element('main', 'screen');
  const card = element('section', 'portal-card');
  card.append(element('p', 'eyebrow', 'TABUADA QUEST'), element('h1', '', 'Sua aventura começa aqui'));
  card.append(element('p', 'description', 'Entre com sua conta Google para acessar o portal do jogador.'));
  const button = element('button', 'primary-button', busy ? 'Conectando...' : 'Entrar com Google');
  button.type = 'button';
  button.disabled = busy;
  button.addEventListener('click', onLogin);
  card.append(button);
  if (onLocal) {
    const local = element('button', 'secondary-button', 'Jogar sem sincronizar dados');
    local.type = 'button';
    local.disabled = busy;
    local.addEventListener('click', onLocal);
    card.append(local, element('p', 'description', 'Modo local: o progresso fica apenas neste navegador e pode ser perdido ao limpar os dados.'));
  }
  if (error) card.append(element('p', 'error-message', error));
  screen.append(card);
  root.replaceChildren(screen);
}

export function renderPortal(root, user, { onPlay, onLogout, onModeChange, syncMode, busy = false, profile = {} }) {
  const screen = element('main', 'screen portal-screen');
  const stage = element('section', 'portal-stage');
  stage.setAttribute('aria-label', 'Portal do jogador');
  const fields = element('div', 'portal-fields');
  const entries = [
    ['gold', 'Ouro atual', profile.gold],
    ['level', 'Nível do jogador', profile.level],
    ['educationalProgress', 'Progressão pedagógica', profile.educationalProgress],
    ['currentMission', 'Missão atual', profile.currentMission],
    ['focusTable', 'Tabuada em foco', profile.focusTable],
    ['dailyChallenge', 'Desafio do dia', profile.dailyChallenge],
    ['nextReward', 'Próxima recompensa', profile.nextReward],
  ];
  for (const [id, label, value] of entries) {
    const field = element('div', 'portal-field');
    field.dataset.field = id;
    field.setAttribute('aria-label', label);
    const name = element('span', 'portal-field-name', label);
    const display = element('span', 'portal-field-value',
      value === undefined || value === null ? 'Em breve' : String(value));
    field.append(name, display);
    fields.append(field);
  }
  stage.append(fields);
  const play = element('button', 'portal-play', 'Jogar');
  play.type = 'button';
  play.disabled = busy || syncMode !== 'local';
  play.addEventListener('click', onPlay);
  stage.append(play);
  screen.append(stage);

  const footer = element('div', 'portal-footer');
  const identity = element('p', 'portal-user',
    (user.displayName || 'Marujo') + (user.isGuest ? ' · Perfil local' : ' · Google'));
  footer.append(identity);
  footer.append(element('p', 'portal-storage-note',
    syncMode === 'local'
      ? 'Sem sincronização. Limpar os dados do navegador pode apagar seu progresso.'
      : 'Escolha como guardar seu progresso.'));
  if (syncMode !== 'local') {
    const local = element('button', 'portal-utility', 'Não sincronizar dados');
    local.type = 'button';
    local.disabled = busy;
    local.addEventListener('click', () => onModeChange('local'));
    footer.append(local);
  }
  const cloud = element('button', 'portal-utility', 'Sincronizar agora');
  cloud.type = 'button';
  cloud.disabled = true;
  cloud.title = 'Sincronização em nuvem ainda não implementada';
  const logout = element('button', 'portal-utility', user.isGuest ? 'Voltar ao início' : 'Sair da conta');
  logout.type = 'button';
  logout.addEventListener('click', onLogout);
  footer.append(cloud, logout);
  screen.append(footer);
  root.replaceChildren(screen);
}

export function renderLoading(root) {
  const screen = element('main', 'screen');
  screen.append(element('p', 'description', 'Verificando sessão...'));
  root.replaceChildren(screen);
}

export function renderConfigurationRequired(root, { onLocal } = {}) {
  const screen = element('main', 'screen');
  const card = element('section', 'portal-card');
  card.append(element('h1', '', 'Autenticação não configurada'));
  card.append(element('p', 'description', 'Configure src/config/firebase-config.js para habilitar o login Google. Enquanto isso, é possível jogar com dados apenas locais.'));
  const local = element('button', 'primary-button', 'Jogar sem sincronizar dados');
  local.type = 'button';
  local.addEventListener('click', onLocal);
  card.append(local, element('p', 'description', 'O progresso local não é sincronizado. Limpar os dados do navegador pode apagá-lo.'));
  screen.append(card);
  root.replaceChildren(screen);
}
