# Tabuada Quest

Jogo educativo de navegação e multiplicação, com gameplay de missões, navios e combate naval. Aplicação JavaScript ES modules, sem etapa de build, mobile-first.

## Executar

```bash
npx serve .
```

Abrir a URL informada pelo servidor no navegador. Para desenvolver, atualizar os arquivos locais com `git pull` antes de testar. O GitHub Pages publica o branch `main` em https://juliano-souza-dev.github.io/TQ/.

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
