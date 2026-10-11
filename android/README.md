# Tabuada Quest para Android 🏴‍☠️

Aplicativo Android nativo que empacota o próprio jogo web 2.5D/3D do repositório.

## Como baixar o APK

1. Abra [GitHub Actions → Build Android APK](https://github.com/juliano-souza-dev/TQ/actions/workflows/android-apk.yml).
2. Abra a execução concluída mais recente (ícone verde).
3. Em **Artifacts**, baixe **TabuadaQuest-Android-APK**.
4. Extraia o ZIP e transfira `app-debug.apk` para o celular.
5. Abra o APK no Android, permita a instalação por essa fonte se solicitado e instale.

O aplicativo abre diretamente o **modo local** do TQ. Os arquivos do jogo e seus assets vão no APK e não dependem de carregar o GitHub Pages ou o servidor do PC.

**Importante:** o APK de teste (`app-debug.apk`) é assinado automaticamente pela máquina do GitHub Actions. Cada execução pode ter uma assinatura diferente. Para instalar uma versão nova sem desinstalar a anterior e **sem perder o progresso local**, distribua sempre um APK *release* assinado com **a mesma chave privada**. Não desinstale o aplicativo que guarda seu progresso.

## Como fica no celular

- **Orientação horizontal obrigatória**, inclusive ao girar o aparelho.
- **Tela cheia imersiva**, sem barra do navegador e com barras do Android ocultas. Gestos do sistema ainda podem revelá-las temporariamente.
- **WebGL2** com aceleração por GPU quando compatível com o Android System WebView instalado.
- **Modo offline local**, com progresso armazenado no armazenamento privado do aplicativo.
- Jogo, artes, músicas, CSS e módulos JavaScript copiados de `index.html`, `src/` e `assets/` a cada build.
- Mesma política de atualização dinâmica dos módulos do TQ. O código e o CSS são recarregados do pacote, sem cache fixo.

O jogo web em execução no navegador e o APK têm **armazenamentos de progresso separados**, pois as origens são diferentes. A instalação do APK não copia automaticamente um save do Chrome.

### Requisitos

Android **7.0 (API 24)** ou posterior; recomenda-se Android System WebView/Chrome atualizados e suporte a WebGL2 para os efeitos completos.

### Recursos on-line

O login por popup do Firebase/Google não está habilitado no aplicativo nativo: o WebView inicia no perfil local. O multiplayer externo não é garantido pelo empacotamento e requer backend e conexão WSS compatíveis. Não confundir o armazenamento local do APK com contas on-line.

## Como gerar no PC

Instale o **Android SDK 35**, Build Tools **35.0.0**, **JDK 17** e **Gradle 8.9** (ou use o workflow de GitHub Actions que instala tudo automaticamente).

Na raiz do TQ:

```bash
gradle -p android :app:assembleDebug
```

Resultado: `android/app/build/outputs/apk/debug/app-debug.apk`.

Os assets são copiados automaticamente por `stageGameAssets` durante o build. **Não** é necessário copiar os arquivos do jogo manualmente.

## APK de distribuição com assinatura estável (atualizações sem perder dados)

Gere e guarde uma chave de assinatura fora do repositório:

```bash
keytool -genkeypair -v -keystore tq-release.jks -alias tq -keyalg RSA -keysize 3072 -validity 10000
```

Configure em **Settings → Secrets and variables → Actions** do repositório:

- `TQ_ANDROID_KEYSTORE_BASE64`: conteúdo completo do keystore em Base64, sem quebras de linha.
- `TQ_ANDROID_STORE_PASSWORD`: senha do keystore.
- `TQ_ANDROID_KEY_ALIAS`: alias da chave (no exemplo, `tq`).
- `TQ_ANDROID_KEY_PASSWORD`: senha da chave.

Quando esses quatro segredos estiverem presentes, o workflow também gera o artifact **TabuadaQuest-Android-Release-Signed**, com `app-release.apk`. Mantenha sempre a mesma chave privada e não a envie para o Git. O Android só permite atualizar a instalação existente com APKs de assinatura compatível e `versionCode` crescente.

**Nunca compartilhe a chave privada nem suas senhas.**

## Arquitetura

- `app/src/main/java/br/com/tabuadaquest/game/GameActivity.java`: Activity landscape imersiva e WebView.
- `WebViewAssetLoader` publica os arquivos embarcados na origem virtual segura `https://appassets.androidplatform.net/`.
- O `localStorage` desse domínio é estável entre aberturas e atualizações corretamente assinadas.
- Os recursos `.js` e `.mjs` são servidos com MIME `text/javascript`, necessário para módulos ES nativos.
- `app/build.gradle`: copia automaticamente `index.html`, `src/**` e `assets/**` para `www/`.
- `.github/workflows/android-apk.yml`: compila o APK e disponibiliza o download.

## Segurança e limitações

Não habilitamos acesso irrestrito a arquivos locais nem tráfego HTTP inseguro. Links externos abrem no navegador padrão, e o jogo opera sob uma origem HTTPS virtual. O código JavaScript do site original não precisa de `file://`, que quebraria módulos ES. Para testar WebGL e o desempenho final, instale o APK em um aparelho Android real.
