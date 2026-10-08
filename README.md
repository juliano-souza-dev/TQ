# Tabuada Quest

Recomeço do jogo pirata educativo com arquitetura modular, mobile-first e responsabilidades separadas.

## Princípios

- Motor e regras de jogo independentes de DOM e renderização.
- Entidades e sistemas separados; nenhuma função monolítica.
- Catálogos de navios, monstros, munições e canhões com IDs estáveis.
- Estilos por componente, sem `!important` e sem CSS legado.
- O repositório anterior é apenas referência de assets e documentação, não fonte de código a copiar indiscriminadamente.

## Estrutura

- `src/core/`: loop, eventos e estado do jogo.
- `src/entities/`: entidades e componentes.
- `src/systems/`: navegação, combate, IA, recompensas.
- `src/rendering/`: renderização visual.
- `src/ui/`: interface e estilos.
- `src/data/`: catálogos versionados.
- `src/network/`: sincronização online/offline.
- `assets/`: arquivos gráficos validados e seus metadados.
- `tests/`: testes automatizados.

Esta primeira versão é uma fundação vazia. Nenhuma gameplay ou asset foi migrado ainda.
