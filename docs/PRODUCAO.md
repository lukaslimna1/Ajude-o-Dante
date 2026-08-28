# Investigação da produção

## Identificação

- URL: `https://ajudeodante.vercel.app/`
- Projeto Vercel informado: `ajudeodante`
- A versão inicialmente investigada respondeu HTTP 200, servidor Vercel, conteúdo `text/html`, aproximadamente 22 KB.
- A página é um documento HTML estático com CSS e JavaScript inline; não há bundles ou rotas de framework expostos.
- O HTML de produção consultado contém `Last-Modified: Fri, 28 Aug 2026 13:06:14 GMT`, `X-Vercel-Cache: HIT` e um ETag. Esses cabeçalhos identificam a resposta observada, mas não revelam o ID interno da implantação nem o commit de origem.

## Arquivos de produção

O único arquivo recuperável diretamente da produção foi o documento `/`, salvo localmente como `src/index.html`. A cópia local mantém textos, layout, funções e endpoints, mas aponta as imagens para os arquivos baixados e substitui a chave do Supabase por uma variável vazia de runtime.

## Caminhos testados e não encontrados

`/package.json`, `/vercel.json`, `/README.md`, `/src/index.html`, `/robots.txt`, `/sitemap.xml` e `/favicon.ico` não estavam disponíveis (404). Sem acesso autenticado ao painel Vercel ou ao repositório de origem, não foi possível recuperar configurações de build, histórico de deploy ou variáveis de ambiente.

## Estado atual após a cópia

O repositório local foi publicado em `lukaslimna1/Ajude-o-Dante` e conectado ao projeto Vercel `ajudeodante`. A implantação Git atual é a fonte de produção e usa o commit `d2b8872`. A raiz `.` foi definida como output directory para que o `index.html` da raiz seja servido mesmo com a pasta `public/` reservada aos assets.

## Histórico

Não foram encontradas versões antigas do HTML no workspace, na implantação pública ou no diretório público de assets consultado. O diretório `archive/` registra essa ausência para evitar misturar arquivos históricos inexistentes com a versão atual.

Há uma diferença temporal importante: a resposta HTML original de produção indicou `Last-Modified` em 28/08/2026 às 13:06:14, enquanto os novos materiais foram adicionados depois. Eles foram copiados para o novo repositório, mas só estarão visualmente usados quando forem referenciados pelo HTML.
