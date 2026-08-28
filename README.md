# Ajude o Dante

Cópia local organizada da versão pública do site [ajudeodante.vercel.app](https://ajudeodante.vercel.app/), recuperada somente por leitura em 28/08/2026. O projeto é uma página estática de campanha para arrecadar recursos para cirurgia veterinária, internação e recuperação do Dante, em Bauru/SP.

## Situação da cópia

- A implantação de produção responde com um único `index.html` contendo HTML, CSS e JavaScript embutidos.
- Não foi encontrado um repositório público com o código-fonte do site. O repositório `lukaslimna1/lukaslimna1` contém os assets da campanha.
- `index.html` é o ponto de entrada da Vercel; `src/index.html` preserva a cópia organizada da produção. Ambos têm o mesmo conteúdo, com referências locais em `public/images/` e a credencial do Supabase removida.
- Nenhum arquivo foi enviado, publicado ou alterado online. Não houve commit, push, deploy, alteração no Vercel, GitHub ou Supabase.

## Estrutura

| Pasta/arquivo | Conteúdo |
|---|---|
| `src/index.html` | Código atual da página publicada: HTML, CSS e JavaScript embutidos. |
| `public/images/` | Imagens recuperadas do GitHub e dos novos materiais adicionados localmente em `assets/`. |
| `public/videos/` | Vídeos recuperados do GitHub e dos novos materiais adicionados localmente em `assets/`. |
| `docs/` | Relatórios sobre produção, assets e Supabase. |
| `database/schema/` | Registro do esquema inferido a partir do código público; o schema SQL original não estava disponível. |
| `database/migrations/` | Registro de que não foram encontradas migrations recuperáveis. |
| `config/` | Observações de deploy e configuração pública. |
| `archive/` | Histórico local e itens não usados na produção atual. Não foram encontradas versões antigas do código. |
| `.env.example` | Somente nomes das variáveis necessárias, sem valores. |
| `INVENTARIO.md` | Inventário arquivo a arquivo e status de uso. |

## Como o site funciona

O navegador abre `src/index.html`. O estilo está todo dentro de `<style>` e o comportamento dentro de `<script>`:

1. A página apresenta a campanha, a meta de R$ 3.500, a chave Pix e os contatos.
2. `loadProgress()` consulta `dante_campaign` no Supabase e atualiza o valor confirmado, a porcentagem e a barra.
3. O formulário “Já doou?” envia avisos opcionais para `dante_donor_signals`; ele não realiza pagamento.
4. Os botões copiam a chave Pix ou o link, abrem o WhatsApp e montam links de compartilhamento para WhatsApp, Facebook, X e Telegram.
5. A produção atual usa `dante-3.jpg` no hero e nas três fotos da seção “Fotos reais”. Os outros assets foram preservados, mas não são referenciados pelo HTML publicado.

## Supabase

O projeto público identificado é `jyxpofhoohxdqmkdgwtu`. O código de produção usa a API REST do Supabase para:

- ler `dante_campaign` filtrando `id=main`, com `goal_cents` e `confirmed_cents`;
- inserir um aviso em `dante_donor_signals` com nome, contato, valor em centavos, mensagem e consentimento.

O acesso de leitura aos avisos de doação não foi permitido pela API pública, e nenhum registro de doador foi baixado. A cópia local não contém a chave publicada pela implantação. Para desenvolvimento local, defina valores reais em um mecanismo local de ambiente e injete-os no runtime; não grave credenciais em HTML, Git ou documentação. O `.env.example` contém somente os nomes `SUPABASE_URL` e `SUPABASE_ANON_KEY`.

O schema SQL, políticas RLS e migrations originais não estavam disponíveis publicamente. Por isso, `database/schema/` e `database/migrations/` documentam a lacuna, sem inventar definições ou executar alterações.

## Executar localmente

A forma mais simples é servir a pasta por HTTP, porque a página usa fetch para o Supabase:

```powershell
cd "G:\Sites\Ajude o Dante\Ajude-o-Dante"
python -m http.server 8080
```

Depois abra [http://localhost:8080/src/](http://localhost:8080/src/). A página e as imagens locais estarão disponíveis. Sem configurar a chave do Supabase, a interface continua visível, mas o progresso dinâmico e o envio do formulário não poderão autenticar na API.

## Deploy futuro (não executado)

Como a implantação pública não expõe configuração de build, a opção mais direta seria servir este conteúdo estático pela Vercel com a raiz do projeto apontando para `Ajude-o-Dante/`. Antes de um novo deploy, seria necessário decidir se `src/index.html` será movido para a raiz pública ou se será criada uma configuração explícita de saída, além de configurar as variáveis do Supabase no ambiente da Vercel. Nenhuma dessas ações foi realizada nesta coleta.

## Fontes consultadas

- [Site em produção](https://ajudeodante.vercel.app/)
- [Diretório de assets no GitHub](https://github.com/lukaslimna1/lukaslimna1/tree/main/assets/ajudeodante/)
- [API pública do Supabase](https://jyxpofhoohxdqmkdgwtu.supabase.co/)
- Workspace local `G:\Sites\Ajude o Dante`

Consulte `docs/PRODUCAO.md`, `docs/ASSETS.md`, `docs/SUPABASE.md` e `INVENTARIO.md` para os detalhes da investigação.
