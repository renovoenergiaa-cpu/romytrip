# Romy — instruções do projeto

App móvel (Android/iOS/web) de turismo social com leve feeling de dating, feito com **Expo (SDK 57) + Expo Router + TypeScript + Supabase**. Este projeto é independente de qualquer outro (inclusive o site "Double Check"): não reutilize regras, design system ou identidade visual de outros projetos.

## Stack e comandos
- `npx expo start` (dev / Expo Go), `npm run web`, `npm run build` (export web), `npm run lint`, `npx tsc --noEmit`.
- Rotas em `app/` (file-based): `(auth)`, `(tabs)` = Romy, Conexões, Comunidades, Chat, Perfil; `(modals)/paywall`; `chat/[id]`, `community/[id]`, `user/[id]`.
- Estilo com `StyleSheet` + tokens de `constants/theme.ts` (tema claro/escuro). Ícones: `lucide-react-native` / `@expo/vector-icons`. Estado: `zustand`; dados: `@tanstack/react-query` + `@supabase/supabase-js`; sessão em AsyncStorage.
- Esquema do banco: arquivos `supabase_*.sql`, `supabase/` e `deploy_all_rls.sql`. Tabelas centrais: `profiles`, `trips`, `communities`, `messages`.

## Produto e design
- Marca: primário `#6338FA`; gradiente premium `#6338FA` → `#D936B4`; fundo `#FAFAFA`, cards `#FFFFFF` com sombra suave; glassmorphism leve.
- Feed imersivo em tela cheia com overlay e ações à direita; drawer "Estou aqui" (Ajudinha, Acontecendo Agora, Pessoas Livres por Perto).
- Idioma da interface: português (BR).

## Padrões de código
- Integração real: login/cadastro via `supabase.auth`; leituras via `supabase.from(...).select(...)`. Sem dados mockados fora de `app/dev-seed.tsx`.
- Feedback visual em toda requisição (loading/skeleton) e `Alert` para erros.
- Lógica do Supabase centralizada ou em hooks (`useAuth`, `useTrips`…); UI separada de regras de negócio.
- Respeite o tema claro/escuro e a safe area; teste em dispositivo/Expo Go quando mexer em câmera, notificações, localização ou mapas.

## Segurança
- `.env` contém chaves reais e **nunca** deve ser commitado nem impresso em respostas. Variáveis `EXPO_PUBLIC_*` vão para o bundle: só use nelas chaves públicas/restritas (ex.: anon do Supabase). Tokens de Duffel/SerpApi devem ser de teste/restritos ou ir para um backend/Edge Function.
- Toda tabela nova precisa de RLS. As correções de pentest estão em `pentest_fixes*.sql` e `security_*.sql`; não as desfaça.
- Há restrição de idade para menores (`minor_age_restriction.sql`) e requisitos de LGPD: preserve-os.

## Skills (em `.claude/skills/`, cópia de `.agents/skills/`)
- **Entender:** `graphify` — para dúvidas de arquitetura, rode `graphify query "<pergunta>"` (ou `path` / `explain`) antes de varrer o código; `graphify-out/GRAPH_REPORT.md` só para visão ampla. Após alterar código, `graphify update .`. Se ausente/desatualizado, siga com grep/leitura.
- **Planejar/implementar:** `spec-driven-development`, `planning-and-task-breakdown`, `incremental-implementation`, `test-driven-development`, `debugging-and-error-recovery`, `code-review-and-quality`, `security-and-hardening`, `performance-optimization`, `frontend-ui-engineering`, `api-and-interface-design`.
- **Simplificar:** `ponytail` (modo full), `ponytail-review`, `ponytail-audit`, `ponytail-debt`. Reutilize o que existe antes de criar; nunca corte validação, segurança, acessibilidade ou testes.
- **Design/frontend:** `impeccable` (pbakaus/impeccable — sem hooks; o launcher `scripts/impeccable` baixa um binário, só rode com autorização), skills do Emil Kowalski (`emil-design-eng`, `animate-expo`, `review-animations`, `break-ui`, `mobile-native`…), `taste` (senlindesign; pede Playwright MCP — o navegador embutido serve no lugar).
- Use de forma proporcional ao tamanho da tarefa; nada disso é burocracia para mudanças mínimas.
- Precedência em conflitos: pedido do usuário > comportamento correto > segurança > acessibilidade > regras deste arquivo > skills.

## Cuidados
- Mantenha `.agents/` (Antigravity/Cursor) e `.claude/skills/` em sincronia se atualizar skills; `.cursorrules` é legado e está resumido aqui.
- `scratch/`, `qr_*.png`, `zap-*` e `graphify-out/cache` são ignorados pelo git; não dependa deles.
