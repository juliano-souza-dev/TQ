# Arquitetura do Tabuada Quest

## Regra fundamental
Uma responsabilidade por módulo. Dependências fluem de fora para dentro: UI, rendering, network e persistence dependem dos contratos do domínio, nunca o contrário.

## Camadas
- `app/`: composição, inicialização e ciclo de vida da aplicação. Conecta adaptadores às regras.
- `core/`: relógio, game loop, eventos e contratos de infraestrutura agnósticos ao jogo.
- `domain/`: regras puras, valores, invariantes, tipos de comando e eventos de domínio. Sem DOM, rede ou banco.
- `entities/`: fábricas e estado de navios, monstros, projéteis e tesouros; sem renderização.
- `systems/`: simulação de movimento, colisão, combate, IA, loot, economia e progressão. Recebem estado e comandos, produzem novo estado/eventos.
- `world/`: regiões, coordenadas, ilhas, spawn e consultas espaciais.
- `rendering/`: câmera, interpolação, sprites e animações. Apenas lê snapshots da simulação.
- `input/`: teclado, mouse, touch e mapeamento para comandos.
- `ui/`: HUD, loja, estaleiro e menus; CSS próprio por componente. UI emite comandos, não altera entidades.
- `data/`: catálogos versionados e configurações estáticas. Referências por IDs estáveis.
- `persistence/`: serialização, migração de saves, armazenamento local e adaptadores remotos.
- `network/`: transporte WebSocket, protocolo, reconciliação e estado de conexão.
- `assets/`: sprites, sons e manifestos; arquivos de imagem nunca embutidos nas regras.
- `tests/`: testes unitários, integração e regressão.

## Fluxo por frame
1. Input produz comandos.
2. App encaminha comandos ao núcleo da simulação.
3. Sistemas atualizam o estado em passo fixo.
4. Simulação emite eventos e um snapshot somente-leitura.
5. Rendering desenha o snapshot; UI apresenta projeções do mesmo estado.
6. Persistence salva checkpoints; network envia/recebe comandos e snapshots conforme a autoridade configurada.

## Multiplayer e offline
- Online: servidor autoritativo para combate, posições, recompensas e economia.
- Offline: mesma simulação com autoridade local; progresso registrado em fila persistente.
- Reconciliação: operações idempotentes, IDs de evento, versões e regras explícitas para conflitos.
- Nunca confiar em recompensa informada apenas pelo cliente conectado.

## Contratos
- `GameCommand`: intenção do jogador, sem efeito colateral imediato na UI.
- `GameEvent`: fato ocorrido, com identificador e instante lógico.
- `WorldSnapshot`: estado serializável consumido por rendering/UI.
- `CatalogId`: chave estável; caminhos de assets ficam nos catálogos, não no combate.

## Convenções
- ES Modules e nomes de arquivo descritivos.
- CSS isolado por componente, mobile-first, sem `!important`.
- Sem singletons globais mutáveis de gameplay.
- Sem importação circular entre camadas.
- Nenhuma lógica de regra de negócio em callbacks de DOM.
- Todo bug corrigido ganha teste de regressão.
- Nenhum sistema de missões/tutorial legado é migrado automaticamente.

## Ordem de implementação
1. Contratos, estado e loop fixo com testes.
2. Entidades, mundo e navegação.
3. Renderer, câmera e sprites.
4. Combate, projéteis e dano.
5. HUD e interações.
6. Inventário, economia e estaleiro.
7. Persistência e migrações.
8. Multiplayer autoritativo e reconciliação.
