function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function renderLogin(root, { onLogin, busy = false, error = '' }) {
  const screen = element('main', 'screen');
  const card = element('section', 'portal-card');
  card.append(element('p', 'eyebrow', 'TABUADA QUEST'), element('h1', '', 'Sua aventura começa aqui'));
  card.append(element('p', 'description', 'Entre com sua conta Google para acessar o portal do jogador.'));
  const button = element('button', 'primary-button', busy ? 'Conectando...' : 'Entrar com Google');
  button.type = 'button';
  button.disabled = busy;
  button.addEventListener('click', onLogin);
  card.append(button);
  if (error) card.append(element('p', 'error-message', error));
  screen.append(card);
  root.replaceChildren(screen);
}

export function renderPortal(root, user, { onPlay, onLogout, busy = false }) {
  const screen = element('main', 'screen');
  const card = element('section', 'portal-card');
  card.append(element('p', 'eyebrow', 'PORTAL DO JOGADOR'), element('h1', '', 'Bem-vindo a bordo!'));
  if (user.photoURL) {
    const avatar = element('img', 'avatar');
    avatar.src = user.photoURL;
    avatar.alt = 'Foto da conta Google';
    avatar.referrerPolicy = 'no-referrer';
    card.append(avatar);
  }
  card.append(element('p', 'player-name', user.displayName || 'Marujo'));
  if (user.email) card.append(element('p', 'description', user.email));
  const info = element('div', 'account-info');
  info.append(element('p', '', 'Conta conectada com Google'), element('p', '', 'Região inicial: R1'));
  card.append(info);
  const play = element('button', 'primary-button', 'Jogar');
  play.type = 'button';
  play.disabled = busy;
  play.addEventListener('click', onPlay);
  const logout = element('button', 'secondary-button', 'Sair da conta');
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

export function renderConfigurationRequired(root) {
  const screen = element('main', 'screen');
  const card = element('section', 'portal-card');
  card.append(element('h1', '', 'Autenticação não configurada'));
  card.append(element('p', 'description', 'Configure src/config/firebase-config.js para habilitar o login Google. O oceano permanece protegido.'));
  screen.append(card);
  root.replaceChildren(screen);
}
