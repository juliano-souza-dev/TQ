# Tabuada Quest

Jogo educativo de navegação e multiplicação, com gameplay de missões, navios e combate naval. Aplicação JavaScript ES modules, sem etapa de build, mobile-first.

## Executar

```bash
npx serve .
```

Abrir a URL informada pelo servidor no navegador. Para desenvolver, atualizar os arquivos locais com `git pull` antes de testar. O GitHub Pages publica o branch `main` em https://juliano-souza-dev.github.io/TQ/.

### Servidor local na rede Wi-Fi

Execute npm install e depois npm run build:server. O executável será criado em dist\TQ-Servidor.exe; mantenha-o nessa pasta e abra-o com dois cliques.

O servidor atende em 0.0.0.0:8080, mostra as URLs de rede, cria TQ-Servidor-QR.png com a URL Wi-Fi, recarrega os navegadores conectados quando index.html, src ou assets mudarem e executa git pull --ff-only a cada 45 segundos.

Para não sobrescrever trabalho local, ele pula o pull se houver alterações rastreadas. Na primeira execução, permita o acesso em Redes privadas se o Firewall do Windows solicitar. Use TQ-Servidor.exe --port 8081 para outra porta ou --no-pull para iniciar temporariamente sem a atualização automática.

## Arquitetura

- `src/main.js`: composição do mundo, serviços e telas. Não calcula dano nem desenha balas.
- `src/combat/NavalBattleRules.js`: regras determinísticas de alcance, hardpoints, interceptação, precisão, recarga e estatísticas.
- `src/combat/NavalCombatRules.mjs`: funções de cálculo de dano e munição portadas do projeto antigo.
- `src/combat/NavalBattleController.js`: seleção de alvo, disparo automático, vida, estoque, retaliação e resultado do impacto. Aceita dependências por injeção; não acessa DOM.
- `src/rendering/NavalCombatWebGLRenderer.mjs`: motor WebGL2 de disparos, trajetórias, brilhos, fumaça, texturas, explosões e respingos adaptado do Tabuada Quest anterior.
- `src/combat/fx/AmmoFxProfile.mjs`: perfis originais por tipo de munição.
- `src/ui/NavalCombatHud.js`: seleção de munição, indicador de vida, botão Atirar/Parar e feedback visual.
- `src/items/EquipmentCatalog.js`: IDs estáveis dos canhões e munições, eventos e caminhos dos assets.
- `src/persistence/LocalSaveStore.js`: persistência do inventário, moedas, missões e vida do casco.
- `src/npcs/`: entidades, navegação e comportamento dos corsários.
- `src/events/HalloweenSeaGlints.js`: recompensas colecionáveis condicionadas ao evento.

Regras de integração: somente o controlador pode consumir munição e aplicar dano; somente o WebGL desenha os disparos. `renderer.fire()` precisa aceitar o tiro antes do débito. O callback do impacto decide entre casco ou água conforme a posição real do NPC ao final do voo. Um disparo em voo nunca é cancelado pelo botão Parar.

O sistema antigo baseado em `CombatSystem.js`, `Projectiles.js` e `NavalProjectileRenderer.js` foi excluído.

## Testes

```bash
npm run check
npm test
```

Os testes incluem voo WebGL simulado, aplicação de dano somente no impacto, erros de alcance, consumo de munição, recarga, cancelamento do disparo automático e retaliação. O workflow `.github/workflows/naval-combat-tests.yml` roda os testes em push e pull request.

## Cache

`index.html` usa import map com versão de desenvolvimento dinâmica para os módulos JS. Os assets e a progressão persistida não usam a mesma chave de cache. Recarregar a página não deve zerar inventário ou missões.

## Névoa de Halloween (WebGL2)

Efeito **temporário e exclusivamente visual**, ativado apenas por `EVENTS.halloween === true` em `src/items/EquipmentCatalog.js`. Com a flag desligada, nenhuma camada sazonal é criada e o shader/texture padrão do oceano permanece inalterado.

Arquivos: `src/events/HalloweenAtmosphere.js` (configuração e qualidade mobile), `src/rendering/shaders/halloweenFog.js` (névoa procedural GLSL), `src/rendering/HalloweenFogRenderer.js` (WebGL2/câmera/limpeza) e `tests/halloween-atmosphere.test.js` (testes). Se não houver WebGL2 para a névoa, aplica-se um efeito CSS leve sem interferir na jogabilidade. Não afeta combate, inventário ou progresso.


## Oceano original da Tabuada Quest 2

A R1 usa **exatamente o shader e a pipeline WebGL2 do projeto anterior**, portados sem reescrever a fórmula de ondas, espuma, brilho e rastro em `src/rendering/LegacyOceanWebGLRenderer.mjs`. Os presets e a normalização também foram copiados sem alterações, em `src/world/WorldOceanEffect.mjs`.

- `src/rendering/OceanRenderer.js`: adaptador mínimo da interface do novo mundo para o motor antigo. Mantém `init(source)`, `render(world,timeMs)`, `dispose()` e alimenta o rastro pelo método `updatePlayerWake`.
- `src/rendering/PlayerWakeTrail.js`: amostras de posição, velocidade e rumo do navio conforme o comportamento do antigo `WorldRuntime`, para o shader original desenhar a espuma da esteira.
- `src/world/regions/r1.js`: parâmetros da **R1 antiga** (preset calm, speed 58, direction 1/.68, swell 55, tile 590, brilho 62, saturação 62, contraste 72, cores 84/79/99 e intensidade original de ondas, espuma e faíscas).
- `assets/globals/ocean-tile-tabuada-region01.webp`: o **mesmo arquivo binário** de `assets/oceans/ocean-tile-tabuada-region01.webp` do projeto antigo, Git blob SHA `005c2a584f5d7722f632d8674acb02fd555a33b6`. Não há duplicação de assets.
- `tests/ocean-legacy.test.js`: verifica a paridade do asset, os parâmetros originais, a câmera, a geração da esteira, o draw call WebGL e o fallback.

A névoa verde temporária de Halloween continua como sobreposição independente controlada por `EVENTS.halloween`. Desligar o evento remove a névoa e expõe o **oceano original**, sem trocar textura nem shader. O shader experimental anterior `src/rendering/shaders/ocean.js` foi removido.
