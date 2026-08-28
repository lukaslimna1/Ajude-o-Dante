# Configuração da Vercel

- Projeto informado: `ajudeodante`
- Domínio de produção: `https://ajudeodante.vercel.app/`
- Tipo de conteúdo: HTML estático.
- Framework preset: `Other`.
- Build command: vazio; não há etapa de build.
- Output directory: `.` (raiz do repositório). Essa definição é necessária porque `public/` contém assets, não o HTML de entrada.
- Root directory: raiz do repositório.
- Node.js configurado no projeto: `24.x` (não há código de servidor Node).
- Repositório conectado: `lukaslimna1/Ajude-o-Dante`, branch de produção `main`.
- Deploy Git de produção mais recente registrado: commit `d2b8872`, estado `Ready`.
- Domínios associados: `https://ajudeodante.vercel.app/` e aliases de implantação da Vercel.
- Autenticação de implantação da Vercel: desativada para permitir acesso público ao site.

## Fluxo de atualização

O push para `main` dispara automaticamente uma nova implantação no projeto Vercel `ajudeodante`. O projeto `lucaslimadigital` e o repositório `Lucas-Lima-Digital` não fazem parte deste fluxo.

## Segurança

Este arquivo não contém valores de variáveis de ambiente, tokens, chaves privadas ou service-role keys. Consulte `.env.example` apenas para os nomes esperados pelo código.
