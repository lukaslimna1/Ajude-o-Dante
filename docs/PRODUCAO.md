# Investigação da produção

## Identificação

- URL: `https://ajudeodante.vercel.app/`
- Projeto Vercel informado: `ajudeodante`
- Resposta observada: HTTP 200, servidor Vercel, conteúdo `text/html`, aproximadamente 22 KB.
- A página é um documento HTML estático com CSS e JavaScript inline; não há bundles ou rotas de framework expostos.
- O HTML de produção consultado contém `Last-Modified: Fri, 28 Aug 2026 13:06:14 GMT`, `X-Vercel-Cache: HIT` e um ETag. Esses cabeçalhos identificam a resposta observada, mas não revelam o ID interno da implantação nem o commit de origem.

## Arquivos de produção

O único arquivo recuperável diretamente da produção foi o documento `/`, salvo localmente como `src/index.html`. A cópia local mantém textos, layout, funções e endpoints, mas aponta as imagens para os arquivos baixados e substitui a chave do Supabase por uma variável vazia de runtime.

## Caminhos testados e não encontrados

`/package.json`, `/vercel.json`, `/README.md`, `/src/index.html`, `/robots.txt`, `/sitemap.xml` e `/favicon.ico` não estavam disponíveis (404). Sem acesso autenticado ao painel Vercel ou ao repositório de origem, não foi possível recuperar configurações de build, histórico de deploy ou variáveis de ambiente.

## Histórico

Não foram encontradas versões antigas do HTML no workspace, na implantação pública ou no diretório público de assets consultado. O diretório `archive/` registra essa ausência para evitar misturar arquivos históricos inexistentes com a versão atual.

Há uma diferença temporal importante: a resposta HTML de produção indicou `Last-Modified` em 28/08/2026 às 13:06:14, enquanto o commit mais recente do diretório de assets no GitHub foi às 13:28:17. Portanto, os novos arquivos de Animal House e o vídeo podem ter sido adicionados depois da versão HTML atualmente observada; eles foram copiados, mas não são tratados como parte efetivamente usada pela produção.
