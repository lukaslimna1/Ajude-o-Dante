# Painel Administrativo V1 — Ajude o Dante

Documentação técnica do painel administrativo privado (`/adm`) do projeto **Ajude o Dante**.

---

## 1. Arquitetura e Rotas

- **Shell Modular**: construído no Next.js App Router com suporte a múltiplos módulos.
- **Rotas**:
  - `/adm`: **Dashboard** com visão geral da campanha (total arrecadado, meta, apoios financeiros e não-financeiros, registros recentes e status do Analytics).
  - `/adm/login`: **Tela de Login** protegida com autenticação via Supabase Auth.
  - `/adm/doacoes`: **Módulo 1 — Doações e Apoios** (listagem, busca, filtros, cadastro, edição e exclusão).
  - `/adm/acao-entre-amigos`: **Módulo 2** (marcado como "Em breve").
  - `/adm/timeline-transparencia`: **Módulo 3** (marcado como "Em breve").

---

## 2. Autenticação e Autorização (RLS Real)

A segurança não depende apenas do middleware do frontend. Ela é aplicada em duas camadas:

1. **Camada de Rota (Middleware / Server Components)**:
   - Valida a sessão ativa via `auth.getUser()`.
   - Redireciona usuários não autenticados para `/adm/login`.
2. **Camada de Banco de Dados (Row Level Security & Tabela `dante_admins`)**:
   - Apenas usuários cujo `auth.uid()` conste na tabela `public.dante_admins` têm acesso ao painel e permissão para executar operações administrativas nas tabelas `dante_contributions` e `dante_campaign`.
   - Usuários anônimos e usuários autenticados comuns (não administradores) têm acesso de escrita totalmente bloqueado.

---

## 3. Instruções: Como Criar o Primeiro Administrador

Para configurar o acesso do primeiro administrador no Supabase:

### Passo 1: Criar o usuário no Supabase Auth
1. Acesse o **Supabase Dashboard** > **Authentication** > **Users**.
2. Clique em **Add user** > **Create user**.
3. Insira o e-mail administrativo e uma senha segura.
4. Confirme a criação e copie o **User UID** gerado (ex: `e4b3c2a1-0000-0000-0000-000000000000`).

### Passo 2: Cadastrar o ID na tabela `dante_admins`
No **SQL Editor** do Supabase, execute:

```sql
insert into public.dante_admins (user_id, notes)
values ('SEU_USER_UID_AQUI', 'Administrador Principal - Lucas Lima')
on conflict (user_id) do nothing;
```

Pronto! O usuário agora terá acesso liberado para fazer login em `/adm/login`.

---

## 4. Módulo 1 — Doações e Apoios

### Tipos de Apoiador
- **Pessoa**: Ao preencher o nome completo interno (ex: `João Pedro da Silva`), o sistema sugere automaticamente os **dois primeiros nomes** (`João Pedro`) para exibição pública.
- **Empresa / Organização**: O sistema sugere o nome completo da empresa (ex: `Mattos Max Transporte e Turismo`).
- O campo **Nome Público** permanece 100% editável e nunca é sobrescrito após edição manual.

### Tipos de Apoio
- **Financeiro**: Exige valor em R$ (`amount_cents > 0`) e forma de recebimento (`pix_direct`, `cash`, `clinic_direct`, `mercado_pago`, `manual`).
- **Bem / Material**, **Serviço**, **Divulgação**, **Outro apoio**:
  - `amount_cents` fica `NULL` no banco.
  - Exibe campo para **Descrição Interna** (ex: "TV 32 polegadas doada para a rifa").
  - `counts_for_goal` é definido como `false` por padrão, garantindo que o valor da barra de arrecadação não seja alterado indevidamente.

### Regra de Privacidade dos Agradecimentos
- O site público consome a RPC `get_dante_public_supporters()`.
- Apenas apoiadores com `status = 'approved'` e `public_name = true` são retornados.
- A função retorna **exclusivamente** a coluna `display_name`.
- **Nenhum dado privado** (valor doado, banco, forma de pagamento, descrição de bem ou anotações) é exposto ao navegador do visitante público.

### Proteção Contra Exclusão de Registros do Mercado Pago
- Registros com origem `mercado_pago` são protegidos contra exclusão no painel para evitar furos na conciliação contábil/financeira da campanha.

---

## 5. Vercel Analytics e Speed Insights

- Pacotes instalados: `@vercel/analytics` e `@vercel/speed-insights`.
- **Exclusão de Tráfego Administrativo**:
  No `src/app/layout.tsx`, o Web Analytics utiliza o filtro oficial `beforeSend`:
  ```tsx
  <Analytics
    beforeSend={(event) => {
      if (event.url.includes("/adm")) {
        return null;
      }
      return event;
    }}
  />
  ```
  Isso garante que visualizações e navegações do administrador dentro do `/adm` não alterem as estatísticas públicas da campanha.

---

## 6. Variáveis de Ambiente Necessárias

Certifique-se de que as seguintes variáveis estejam configuradas no ambiente (`.env.local` / Vercel Project Settings):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...

# Supabase Service Role (apenas no servidor / scripts CLI / webhooks)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
MERCADOPAGO_WEBHOOK_SECRET=...

# URL do Site
NEXT_PUBLIC_SITE_URL=https://ajudeodante.vercel.app
```
