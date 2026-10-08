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

export function renderPortal(root, user, { onPlay, onLogout, onModeChange, syncMode, busy = false }) {
  const screen = element('main', 'screen');
  const card = element('section', 'portal-card');
  card.append(element('p', 'eyebrow', 'PORTAL DO JOGADOR'), element('h1', '', 'Bem-vindo a bordo!'));
  if (user.photoURL) {
    const avatar = element('img', 'avatar');
    avatar.src = user.photoURL;
    avatar.alt = 'Foto do jogador';
    avatar.referrerPolicy = 'no-referrer';
    card.append(avatar);
  }
  card.append(element('p', 'player-name', user.displayName || 'Marujo'));
  if (user.email) card.append(element('p', 'description', user.email));
  const info = element('div', 'account-info');
  info.append(element('p', '', user.isGuest ? 'Perfil local sem conta Google' : 'Conta conectada com Google'), element('p', '', 'Região inicial: R1'));
  card.append(info);

  const modeLabel = element('p', 'description', syncMode === 'local'
    ? 'Modo local: progresso somente neste dispositivo. Limpar os dados do navegador apaga o progresso.'
    : syncMode === 'cloud'
      ? 'Sincronização selecionada. A conexão com o salvamento em nuvem ainda será implementada.'
      : 'Escolha como deseja guardar seu progresso antes de jogar.');
  card.append(modeLabel);
  const localButton = element('button', 'secondary-button', 'Não sincronizar dados');
  localButton.type = 'button';
  localButton.disabled = busy;
  localButton.addEventListener('click', () => onModeChange('local'));
  const cloudButton = element('button', 'secondary-button', syncMode === 'local' ? 'Sincronizar agora' : 'Ativar sincronização');
  cloudButton.type = 'button';
  cloudButton.disabled = true;
  cloudButton.title = 'Disponível quando o salvamento em nuvem estiver implementado';
  card.append(localButton, cloudButton);
  const play = element('button', 'primary-button', 'Jogar');
  play.type = 'button';
  play.disabled = busy || syncMode !== 'local';
  play.addEventListener('click', onPlay);
  const logout = element('button', 'secondary-button', user.isGuest ? 'Voltar ao início' : 'Sair da conta');
  logout.type = 'button';
  logout.addEventListener('click', onLogout);
  card.append(play, logout);
  screen.append(card);
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
