# Integração com Supabase

## Identificação pública

- Projeto/ref: `jyxpofhoohxdqmkdgwtu`
- Base REST observada: `https://jyxpofhoohxdqmkdgwtu.supabase.co/rest/v1/`
- Não há credenciais, tokens, valores de variáveis ou registros pessoais neste documento.

## Uso encontrado no HTML de produção

| Operação | Endpoint | Campos |
|---|---|---|
| Ler progresso | `GET /dante_campaign?id=eq.main&select=goal_cents,confirmed_cents` | `goal_cents`, `confirmed_cents` |
| Registrar aviso | `POST /dante_donor_signals` | `donor_name`, `contact`, `amount_cents`, `message`, `consent_to_contact` |

A consulta pública de progresso retornou `goal_cents=350000` e `confirmed_cents=200000`, equivalentes a R$ 3.500 e R$ 2.000. A tentativa de leitura de avisos de doação não foi autorizada; nenhum dado de doador foi baixado.

## Segurança da cópia

A implantação original contém uma chave publicável no JavaScript do navegador. Como solicitado, ela não foi copiada para o ambiente local. Em `src/index.html`, o valor foi substituído por `window.__SUPABASE_ANON_KEY__ || ''`; a URL pública do projeto foi mantida porque não é uma credencial. O arquivo `.env.example` contém apenas os nomes de variáveis.

## O que não foi recuperado

O endpoint público não forneceu o schema SQL, as políticas RLS, funções, triggers ou migrations. O endpoint OpenAPI REST também não aceitou a consulta pública. Nenhuma tentativa de alteração, criação de tabela, migration ou consulta de dados pessoais foi feita.
