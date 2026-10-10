# Checklist de mapeamento de navios

Critério de **mapeamento completo**: atlas de navegação configurado e origens de disparo (`sprite.cannonMuzzles`) definidas para todos os slots de canhão nos quadros em que a bateria é visualmente utilizável. Proa/popa podem usar fallback somente quando a arte não expõe uma boca verificável.

## Concluídos

- [x] **Galeão Rosas de Ouro** (`galeao-rosas-de-ouro`) — movimento + canhões. [Asset](../assets/ships/galeao-rosas-de-ouro.webp)
- [x] **Galeão Negro Imperial** (`galeao-negro-imperial`) — movimento + canhões + bounds/alinhamento. [Asset](../assets/ships/galeao-negro-imperial.webp)
- [x] **Terror do Mar** (`terror-do-mar`) — 10 slots mapeados por bordo nos quadros laterais; N/S usam fallback por ausência de boca lateral verificável. [Asset](../assets/ships/terror%20do%20mar.webp)
- [x] **Galeão da Frota das Abóboras** (`galeao-frota-das-aboboras`) — 8 slots mapeados em todo o giro, incluindo os dois bordos nas vistas N/S. [Asset](../assets/ships/geleao-frota-dos-aboboras.webp)
- [x] **Galeão Halloween da Tabuada** (`galeao-halloween-tabuada`) — 7 slots mapeados nos quadros laterais; vistas N/S usam fallback por ausência de bateria lateral verificável. [Asset](../assets/ships/navio_pirata_halloween_tabuada_400x400.webp)
- [x] **Galeão Dourado** (`galeao-dourado`) — 7 slots mapeados nos quadros laterais; vistas N/S usam fallback por ausência de bateria lateral verificável. [Asset](../assets/ships/galeão%20dourdado.webp)

## Pendentes

- [ ] **Galeão Eclipse** (`galeao-eclipse`) — movimento pronto; 10 slots de canhão pendentes. [Asset](../assets/ships/eclipse.webp)
- [ ] **Galeão das Velas Rubras** (`starter-red-sails`) — movimento pronto; 3 slots de canhão pendentes. [Asset](../assets/ships/Sprite%20Sheet%20de%20Galeões%20Piratas%20em%20Fundo%20Transparente%20(2).png)
- [ ] **Fragata Caçadora das Sombras** (`fragata-sombra-cacadora`) — movimento pronto; 1 slot de canhão pendente. [Asset](../assets/ships/sombra_fugitiva.webp)

## Sem trabalho de canhão

- [x] **Ladrão da Sombra** (`fragata-sombra-fugitiva`) — possui `cannonSlots: 0`; não requer `cannonMuzzles` enquanto permanecer desarmado. [Asset](../assets/ships/sombra_fugitiva.webp)


## Novos NPCs mapeados aguardando integração do asset

- [x] **Corsário Vermelho Sangue** (`corsario-vermelho-sangue`) — asset integrado ao catálogo NPC e ao Mapa 3 como **Silas Rubro, o Mercador do Breu**; atlas 4x4/16 direções e 10 origens de canhão por bateria lateral mapeados. [Asset](../assets/ships/corsário-vermelho-sangue.webp)

- [x] **Corsário do Véu Negro** (`corsario-do-veu-negro`) — asset e mapping concluídos, mantido apenas em catálogo técnico; não entra em nenhum mapa por enquanto. Reutiliza o atlas 4x4/16 direções e as 10 origens de canhão por bateria do casco compartilhado. [Asset](../assets/ships/Corsario_do_Veu_Negro_1600x1600.webp)
