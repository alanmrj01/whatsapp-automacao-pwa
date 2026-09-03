# Atende PWA

Fundação mobile-first do aplicativo de automação de atendimento e agenda. Esta etapa usa dados locais centralizados apenas para apresentar a experiência visual; ainda não há autenticação nem integração com backend ou Meta.

## Requisitos

- Node.js 22 ou superior
- npm 10 ou superior

## Desenvolvimento

```bash
npm install
npm run dev
```

Acesse `http://localhost:5173`. A rota raiz redireciona para `/app`.

## Validação

```bash
npm run lint
npm run build
npm run preview
```

O PWA é gerado no build com manifest e service worker. O cache desta etapa contém somente o shell e assets estáticos; respostas futuras de API não são cacheadas por padrão.

## Estrutura

- `src/app`: providers, rotas e shell responsivo
- `src/components`: componentes reutilizáveis
- `src/features`: telas organizadas por domínio
- `src/lib/mocks.ts`: dados locais temporários
- `src/styles`: tokens e estilos mobile-first

## Escopo atual

- Início e estados vazios de Agenda, Conversas e Mais
- WhatsApp desconectado e onboarding visual informativo
- Modos apresentados como “WhatsApp Business + Automação” e “Atendimento pela plataforma”
- Navegação inferior no mobile e sidebar no desktop
- aviso offline sem simular envio ou sincronização

A conexão oficial da Meta e o consumo do backend ficam para uma etapa posterior.
