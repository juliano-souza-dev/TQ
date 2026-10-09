#!/usr/bin/env node
'use strict';

const BrowserSync = require('browser-sync');
const QRCode = require('qrcode');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const DEFAULT_PORT = 8080;
const PULL_INTERVAL_MS = 45_000;
const QR_FILE_NAME = 'TQ-Servidor-QR.png';

function restoreConsoleWindow() {
  if (process.platform !== 'win32') return;

  const command = [
    'Add-Type -TypeDefinition \'using System; using System.Runtime.InteropServices; public static class TQServerConsole { [DllImport("kernel32.dll")] public static extern IntPtr GetConsoleWindow(); [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr handle, int command); [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr handle); }\'',
    '$handle = [TQServerConsole]::GetConsoleWindow()',
    'if ($handle -ne [IntPtr]::Zero) { [TQServerConsole]::ShowWindow($handle, 9); [TQServerConsole]::SetForegroundWindow($handle) }',
  ].join('; ');

  const helper = spawn('powershell.exe', ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', command], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  helper.on('error', () => {});
  helper.unref();
}
function parseOptions(argv) {
  const result = {
    port: Number(process.env.TQ_PORT || DEFAULT_PORT),
    pullEnabled: process.env.TQ_DISABLE_GIT_PULL !== '1',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--no-pull') {
      result.pullEnabled = false;
    } else if (argument === '--port') {
      result.port = Number(argv[index + 1]);
      index += 1;
    } else if (argument.startsWith('--port=')) {
      result.port = Number(argument.slice('--port='.length));
    } else if (argument === '--help' || argument === '-h') {
      console.log('Uso: TQ-Servidor.exe [--port 8080] [--no-pull]');
      process.exit(0);
    } else {
      throw new Error('Opção desconhecida: ' + argument);
    }
  }

  if (!Number.isInteger(result.port) || result.port < 1 || result.port > 65_535) {
    throw new Error('A porta deve ser um número inteiro entre 1 e 65535.');
  }

  return result;
}

function containsProject(candidate) {
  return fs.existsSync(path.join(candidate, 'index.html')) && fs.existsSync(path.join(candidate, '.git'));
}

function findProjectRoot() {
  const executableDirectory = path.dirname(process.execPath);
  const candidates = [
    process.cwd(),
    executableDirectory,
    path.dirname(executableDirectory),
    __dirname,
    path.dirname(__dirname),
  ];

  for (const candidate of candidates) {
    if (containsProject(candidate)) {
      return fs.realpathSync(candidate);
    }
  }

  throw new Error('Não encontrei a raiz do Tabuada Quest. Mantenha TQ-Servidor.exe dentro da pasta do projeto ou da pasta dist.');
}

function findNetworkAddresses() {
  const candidates = [];
  for (const [name, addresses] of Object.entries(os.networkInterfaces())) {
    for (const entry of addresses || []) {
      if (entry.family !== 'IPv4' || entry.internal || entry.address.startsWith('169.254.')) {
        continue;
      }
      const preference = /wi[- ]?fi|wireless|wlan/i.test(name) ? 0 : /ethernet|lan/i.test(name) ? 1 : 2;
      candidates.push({ address: entry.address, name, preference });
    }
  }

  return candidates.sort((left, right) => left.preference - right.preference || left.name.localeCompare(right.name));
}

function responseGuard(request, response, next) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url || '/', 'http://localhost').pathname);
  } catch {
    response.statusCode = 400;
    response.end('URL inválida.');
    return;
  }

  const browserSyncRequest = pathname.startsWith('/browser-sync/');
  const segments = pathname.split('/').filter(Boolean);
  const forbidden = segments.some((segment) => (
    segment === '..' ||
    segment === '.git' ||
    segment === 'node_modules' ||
    segment === 'dist' ||
    segment.startsWith('.')
  ));

  if (!['GET', 'HEAD'].includes(request.method || 'GET') && !browserSyncRequest) {
    response.statusCode = 405;
    response.setHeader('Allow', 'GET, HEAD');
    response.end('Método não permitido.');
    return;
  }
  if (forbidden) {
    response.statusCode = 404;
    response.end('Arquivo não encontrado.');
    return;
  }

  response.setHeader('Cache-Control', 'no-store, max-age=0');
  next();
}

function runGit(projectRoot, args, timeoutMs) {
  return new Promise((resolve) => {
    let finished = false;
    let stdout = '';
    let stderr = '';
    const child = spawn('git', args, {
      cwd: projectRoot,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
      shell: false,
      windowsHide: true,
    });

    const finish = (result) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve(result);
    };
    const timer = setTimeout(() => {
      child.kill();
      finish({ code: null, stdout, stderr: (stderr + '\nTempo limite atingido.').trim() });
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', (error) => finish({ code: null, stdout, stderr: error.message }));
    child.on('close', (code) => finish({ code, stdout, stderr }));
  });
}

function createPuller(projectRoot, browserSync) {
  let pulling = false;

  return async function pullRepository() {
    if (pulling) return;
    const status = await runGit(projectRoot, ['status', '--porcelain', '--untracked-files=no'], 30_000);
    if (status.code !== 0) {
      console.warn('[git] Não foi possível verificar o repositório: ' + (status.stderr || 'Git indisponível.'));
      return;
    }
    if (status.stdout.trim()) {
      console.warn('[git] Pull ignorado: há arquivos rastreados com alterações locais.');
      return;
    }

    const before = await runGit(projectRoot, ['rev-parse', 'HEAD'], 30_000);
    if (before.code !== 0) {
      console.warn('[git] Pull ignorado: ' + (before.stderr || 'não foi possível identificar o commit atual.'));
      return;
    }

    pulling = true;
    console.log('[git] Verificando atualizações do repositório...');
    const pull = await runGit(projectRoot, ['pull', '--ff-only', '--quiet'], 60_000);
    const after = await runGit(projectRoot, ['rev-parse', 'HEAD'], 30_000);
    pulling = false;

    if (pull.code !== 0) {
      console.warn('[git] Pull não aplicado: ' + (pull.stderr || pull.stdout || 'erro desconhecido').trim());
      return;
    }

    if (after.code === 0 && before.stdout.trim() !== after.stdout.trim()) {
      console.log('[git] Repositório atualizado; recarregando navegadores.');
      browserSync.reload();
    } else {
      console.log('[git] Repositório já está atualizado.');
    }
  };
}

function startBrowserSync(browserSync, projectRoot, port) {
  const watchedFiles = [
    path.join(projectRoot, 'index.html').replace(/\\/g, '/'),
    path.join(projectRoot, 'src', '**', '*').replace(/\\/g, '/'),
    path.join(projectRoot, 'assets', '**', '*').replace(/\\/g, '/'),
  ];

  return new Promise((resolve, reject) => {
    browserSync.init({
      ghostMode: false,
      host: '0.0.0.0',
      middleware: [responseGuard],
      notify: false,
      open: false,
      port,
      server: { baseDir: projectRoot },
      ui: false,
    }, (error) => {
      if (error) {
        reject(error);
        return;
      }

      const watcher = browserSync.watch(watchedFiles, { ignoreInitial: true });
      watcher.on('all', (_eventName, filePath) => {
        if (path.basename(filePath) === QR_FILE_NAME) return;
        console.log('[reload] Arquivo alterado: ' + path.relative(projectRoot, filePath));
        browserSync.reload();
      });
      resolve();
    });
  });
}

async function main() {
  restoreConsoleWindow();
  const options = parseOptions(process.argv.slice(2));
  const projectRoot = findProjectRoot();
  const browserSync = BrowserSync.create('tq-server');
  await startBrowserSync(browserSync, projectRoot, options.port);

  const addresses = findNetworkAddresses();
  const localUrl = 'http://localhost:' + options.port;
  const accessUrl = addresses.length ? 'http://' + addresses[0].address + ':' + options.port : localUrl;
  const qrPath = path.join(projectRoot, QR_FILE_NAME);
  await QRCode.toFile(qrPath, accessUrl, {
    color: { dark: '#081a33', light: '#FFFFFFFF' },
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 640,
  });

  console.log('\nTabuada Quest está disponível.');
  console.log('Local: ' + localUrl);
  if (addresses.length) {
    console.log('Rede local:');
    for (const network of addresses) {
      console.log('  ' + network.name + ': http://' + network.address + ':' + options.port);
    }
  } else {
    console.warn('Nenhum IPv4 de rede local foi detectado. Conecte-se ao Wi-Fi para acessar por outro dispositivo.');
  }
  console.log('QR Code: ' + qrPath);
  console.log('Se o Windows pedir permissão de firewall, permita em Redes privadas.');
  console.log('Pressione Ctrl+C para encerrar.\n');

  let pullTimer = null;
  if (options.pullEnabled) {
    pullTimer = setInterval(createPuller(projectRoot, browserSync), PULL_INTERVAL_MS);
    console.log('[git] Pull automático agendado a cada 45 segundos.');
  } else {
    console.log('[git] Pull automático desativado para esta execução.');
  }

  const shutdown = () => {
    clearInterval(pullTimer);
    browserSync.exit();
    process.exit(0);
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Não foi possível iniciar o TQ Server: ' + error.message);
    process.exitCode = 1;
  });
}

module.exports = { findNetworkAddresses, parseOptions, responseGuard };


