# Ajude o Dante

Cópia local organizada do site [ajudeodante.vercel.app](https://ajudeodante.vercel.app/), preparada para continuar o desenvolvimento pelo computador. O projeto é uma página estática de campanha para arrecadar recursos para cirurgia veterinária, internação e recuperação do Dante, em Bauru/SP.

## Situação da cópia

- O repositório de desenvolvimento é [lukaslimna1/Ajude-o-Dante](https://github.com/lukaslimna1/Ajude-o-Dante), na branch `main`.
- O projeto Vercel `ajudeodante` está conectado a esse repositório e usa o domínio [ajudeodante.vercel.app](https://ajudeodante.vercel.app/).
- A implantação Git de produção mais recente usa o commit `ee9cfac` (`Trigger Vercel deployment from GitHub`).
- `index.html` é o ponto de entrada publicado pela Vercel; `src/index.html` preserva a cópia organizada da produção. Ambos têm referências locais em `public/images/` e não armazenam credenciais privadas.
- A Vercel está configurada para publicar a raiz `.` do repositório, pois `public/` contém somente imagens e vídeos.

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

## Deploy futuro

O fluxo atual é GitHub → Vercel: alterações enviadas para a branch `main` geram uma nova implantação de produção no projeto `ajudeodante`. A configuração de build é `Other`, sem comando de build, com a pasta de saída definida como `.`. Para habilitar o progresso dinâmico e o formulário, as variáveis de ambiente do Supabase devem ser configuradas na Vercel sem colocá-las no Git.

Não é necessário usar o projeto `lucaslimadigital` nem o repositório `Lucas-Lima-Digital`.

## Fontes consultadas

- [Site em produção](https://ajudeodante.vercel.app/)
- [Diretório de assets no GitHub](https://github.com/lukaslimna1/lukaslimna1/tree/main/assets/ajudeodante/)
- [API pública do Supabase](https://jyxpofhoohxdqmkdgwtu.supabase.co/)
- Workspace local `G:\Sites\Ajude o Dante`

Consulte `docs/PRODUCAO.md`, `docs/ASSETS.md`, `docs/SUPABASE.md` e `INVENTARIO.md` para os detalhes da investigação.
