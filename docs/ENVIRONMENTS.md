# Ambientes Alovia

## Produção

- Branch: `main`
- PWA: conta/site Netlify de produção
- Backend: serviço Cloud Run de produção
- Banco: banco de produção
- Pagamentos: credenciais de produção
- Tracking: dados reais
- Regra: nenhuma mudança entra diretamente. Promoções ocorrem somente após validação completa em produtividade.

## Produtividade

- Branch: `productivity`
- PWA: segunda conta/site Netlify
- Backend: serviço Cloud Run separado
- Banco: banco separado
- Pagamentos: sandbox
- Tracking: ambiente/projeto de teste
- WhatsApp/Meta: ativos de teste antes de qualquer validação com número real

## Fluxo de entrega

1. Criar feature branch a partir de `productivity`.
2. Implementar uma unidade pequena e testável.
3. Abrir PR para `productivity`.
4. Exigir CI verde e validar no site de produtividade.
5. Agrupar mudanças em um pacote de release.
6. Fazer smoke test completo do pacote no ambiente de produtividade.
7. Promover o pacote validado para `main` em janela de baixo risco.
8. Fazer deploy de produção com revisão candidata/sem tráfego quando aplicável.
9. Validar health, ready, versão e smoke funcional.
10. Manter rollback explícito para a revisão anterior.

## Regra de isolamento

A PWA usa proxy same-origin para `/api/*`. O destino é injetado no build pela
variável Netlify `ALOVIA_API_ORIGIN`. Produção e produtividade devem usar origins
diferentes. O build falha se a variável não estiver definida.

Nunca configurar o site de produtividade com o origin do backend de produção.
