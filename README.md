# Atende PWA

Aplicativo mobile-first de atendimento e agenda. A etapa 16.5B integra autenticação,
sessão e consulta/planejamento de WhatsApp à API pública. O visual 16.5A é preservado;
dados de agenda/conversas ainda são demonstrativos. Nenhuma chamada é feita à Meta
ou a endpoints `/internal/*`.

## Requisitos

- Node.js 24 ou superior (testes nativos com TypeScript)
- npm 10 ou superior

## Desenvolvimento

```bash
npm install
cp .env.example .env
npm run dev
```

Defina `VITE_API_BASE_URL` com a origem pública do backend, sem `/api/v1`. Vazio usa
a mesma origem (requer proxy de `/api` ao backend). Nunca coloque secrets em
variáveis `VITE_*`: elas são públicas no bundle.

Localmente, use o mesmo hostname no PWA e na API (por exemplo `127.0.0.1` em portas
distintas), configure essa origem exata em `PWA_ALLOWED_ORIGINS` do backend e acesse
`http://127.0.0.1:5173`. Produção exige HTTPS e mesmo site da API ou proxy same-origin
para o refresh cookie SameSite=Lax; CORS não contorna bloqueio de cookies cross-site.
O backend requer a migration 0006 e provisionamento explícito de usuário pelo CLI.
Esta branch não deve ser mergeada/deployada antes da aprovação operacional da 0006.

## Validação

```bash
npm run lint
npm test
npm run build
npm run preview
```

O PWA é gerado no build com manifest e service worker. Somente shell/assets estáticos
entram no precache. `/api/*`, auth e `/internal/*` são excluídos do fallback e não
há runtime caching. Respostas privadas/tokens nunca são persistidos.

## Estrutura

- `src/app`: providers, rotas e shell responsivo
- `src/components`: componentes reutilizáveis
- `src/features`: telas organizadas por domínio
- `src/features/auth`: sessão, login, proteção de rotas e seleção de empresa
- `src/lib/httpClient.ts`: fetch com timeout, memória privada e refresh único
- `src/lib/mocks.ts`: dados demonstrativos ainda sem API (sem mock de WhatsApp)
- `src/styles`: tokens e estilos mobile-first

## Escopo atual

- Início e estados vazios de Agenda, Conversas e Mais
- WhatsApp com estado real da API pública e planejamento sem conectar à Meta
- Modos apresentados como “WhatsApp Business + Automação” e “Atendimento pela plataforma”
- Navegação inferior no mobile e sidebar no desktop
- aviso offline sem simular envio ou sincronização

## Sessão e permissões

Ao abrir/recarregar, o app tenta refresh com cookie HttpOnly, recebe access token
somente em memória e consulta `/me`. Não usa localStorage, sessionStorage ou IndexedDB
para sessão/dados privados. Um 401 tenta refresh uma única vez (single-flight), sem
loop; logout bloqueia imediatamente o acesso local e revoga no backend. Falha de
rede ao sair mantém a tela bloqueada até confirmar a revogação. Um cookie local
`atende_logout_pending=1` conserva apenas essa intenção (sem token, usuário ou dado
privado), inclusive após recarregar/reabrir. Só o logout confirmado remove o marcador.

`super_admin` acessa somente o shell `/admin`. Clientes vão para `/app`; uma empresa
é automática, várias exigem seleção autorizada. Troca de empresa cancela consultas
e limpa cache em memória. `owner/admin` veem configuração WhatsApp; `attendant/viewer`
ficam somente em leitura. A proteção definitiva é revalidada pelo backend a cada
request. Não há cadastro, recuperação de senha, Embedded Signup ou conexão simulada.
