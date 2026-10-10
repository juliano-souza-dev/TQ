# Checklist de consistência global de missões

Este checklist cobre o comportamento compartilhado entre mapas/regiões. A regra é: estado da missão é responsabilidade do motor de campanha; HUD, navegação, guia e mapa apenas refletem esse estado.

## Corrigido

- [x] Removido o normalizador runtime que alterava `active/claimed` silenciosamente ao abrir o oceano.
- [x] Criadas invariantes compartilhadas de estado em `CampaignState.js`.
- [x] Uma missão marcada como `claimed` nunca aparece simultaneamente como ativa no board.
- [x] `board.active` agora usa o status canônico (`active/ready`) em vez de um booleano contraditório.
- [x] IDs duplicados em `claimed` não inflam mais o contador de missões concluídas.
- [x] Resgate de recompensa não duplica IDs em `claimed`.
- [x] As mesmas invariantes foram aplicadas à R1 e R2.
- [x] Eventos processados agora são escopados pela missão, evitando que um evento antigo bloqueie progresso de um contrato futuro.
- [x] Transições narrativas automáticas da R2 passam por `advanceR2Story`, em vez de montar `active/claimed/progress` manualmente.
- [x] Migrações que rebobinam a campanha R2 agora pertencem a uma versão de schema e executam uma única vez.
- [x] Ao concluir uma missão, a rota para o Porto das Missões é criada pelo mesmo fluxo em qualquer região que possua campanha.
- [x] Ao carregar um save com missão pronta para resgate, a rota para o Porto das Missões é restaurada uma vez.
- [x] Ao aceitar uma nova missão, rota e guia da missão anterior são descartados.
- [x] Ao resgatar uma missão, rota e guia da missão anterior são descartados.
- [x] “Continuar navegando” realmente cancela a rota automática para o porto.
- [x] O HUD não recria continuamente uma rota que o jogador cancelou.
- [x] Rotas de tesouro pendentes são canceladas quando o ciclo da missão muda.
- [x] Testes da campanha foram atualizados para a sequência atual de 25 missões na R2.
- [x] Foram adicionados testes de conflito `active + claimed` para R1 e R2.
- [x] Foram adicionados testes de deduplicação de eventos por missão.
- [x] Foi adicionada cobertura para transição narrativa sequencial da R2.

## Regra a manter daqui para frente

Nenhum sistema visual, mapa, NPC, migração ou HUD deve decidir sozinho que uma missão foi concluída ou voltar a campanha para uma etapa anterior. Mudanças de estado devem passar pelo motor de campanha ou por uma transição explícita e testada.
