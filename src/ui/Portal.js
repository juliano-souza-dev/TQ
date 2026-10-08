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
  const screen = element('main', 'screen pirate-portal');
  const panel = element('section', 'pirate-panel');
  const artwork = element('div', 'portal-artwork');
  artwork.setAttribute('aria-hidden', 'true');
  screen.append(artwork);
  panel.append(element('p', 'pirate-kicker', 'TABUADA QUEST · AVENTURA PIRATA'));
  panel.append(element('h1', 'pirate-title', 'PORTAL DO JOGADOR'));
  panel.append(element('h2', 'pirate-welcome', 'Bem-vindo a bordo!'));
  panel.append(element('p', 'pirate-subtitle', 'Domine a tabuada e conquiste novos mares!'));
  const identity = element('div', 'pirate-identity');
  if (user.photoURL) {
    const avatar = element('img', 'avatar');
    avatar.src = user.photoURL;
    avatar.alt = 'Foto do jogador';
    avatar.referrerPolicy = 'no-referrer';
    identity.append(avatar);
  }
  identity.append(element('strong', '', user.displayName || 'Marujo'));
  identity.append(element('span', '', user.isGuest ? 'Perfil local' : 'Conta Google'));
  panel.append(identity);
  const stats = element('div', 'pirate-stats');
  const items = [
    ['🪙', 'Ouro atual', profile.gold],
    ['🧭', 'Nível do jogador', profile.level],
    ['📖', 'Progressão pedagógica', profile.educationalProgress],
    ['🗺️', 'Missão atual', profile.currentMission],
    ['✖️', 'Tabuada em foco', profile.focusTable],
    ['🏆', 'Desafio do dia', profile.dailyChallenge],
    ['🎁', 'Próxima recompensa', profile.nextReward],
  ];
  const fieldIds = ['gold', 'level', 'educationalProgress', 'currentMission', 'focusTable', 'dailyChallenge', 'nextReward'];
  for (const [index, [icon, label, value]] of items.entries()) {
    const stat = element('div', 'pirate-stat');
    stat.dataset.field = fieldIds[index];
    stat.append(element('span', 'pirate-stat-icon', icon));
    const content = element('div', 'pirate-stat-content');
    content.append(element('span', 'pirate-stat-label', label));
    content.append(element('strong', 'pirate-stat-value', value === undefined || value === null ? 'Ainda não disponível' : String(value)));
    stat.append(content);
    stats.append(stat);
  }
  panel.append(stats);
  panel.append(element('p', 'pirate-mode', syncMode === 'local'
    ? 'Sem sincronização: os dados ficam neste navegador e serão perdidos se o armazenamento for apagado.'
    : 'Escolha onde salvar seu progresso antes de jogar.'));
  if (syncMode !== 'local') {
    const local = element('button', 'pirate-secondary', 'Não sincronizar dados');
    local.type = 'button';
    local.disabled = busy;
    local.addEventListener('click', () => onModeChange('local'));
    panel.append(local);
  }
  const play = element('button', 'pirate-play', '⚔ Jogar');
  play.type = 'button';
  play.disabled = busy || syncMode !== 'local';
  play.addEventListener('click', onPlay);
  panel.append(play);
  const actions = element('div', 'pirate-actions');
  const cloud = element('button', 'pirate-secondary', 'Sincronizar agora');
  cloud.type = 'button';
  cloud.disabled = true;
  cloud.title = 'A sincronização em nuvem ainda não foi implementada';
  const logout = element('button', 'pirate-secondary', user.isGuest ? 'Voltar ao início' : 'Sair da conta');
  logout.type = 'button';
  logout.addEventListener('click', onLogout);
  actions.append(cloud, logout);
  panel.append(actions);
  screen.append(panel);
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
