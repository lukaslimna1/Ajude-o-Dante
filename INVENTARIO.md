# Inventário — Ajude o Dante

## Arquivos recuperados

| Arquivo | Origem | Finalidade | Em uso atualmente? | Observações |
|---|---|---|---|---|
| `src/index.html` | HTML da implantação pública | Página completa, incluindo HTML, CSS e JavaScript | Sim, representa a produção | Adaptado para usar imagens locais; credencial do Supabase removida. |
| `public/images/dante-2.jpg` | GitHub `lukaslimna1/lukaslimna1`, `assets/ajudeodante/` | Foto do Dante | Não referenciado pela produção | Recuperado como asset preparado. |
| `public/images/dante-3.jpg` | GitHub `lukaslimna1/lukaslimna1`, `assets/ajudeodante/` | Foto do Dante | Sim | A produção usa esta mesma imagem no hero e três vezes na galeria. |
| `public/images/dante-animal-house.jpg` | GitHub `lukaslimna1/lukaslimna1`, `assets/ajudeodante/` | Material visual relacionado à Animal House | Não referenciado pela produção | Recuperado como asset preparado. |
| `public/images/dante-antes-clinica.jpg` | GitHub `lukaslimna1/lukaslimna1`, `assets/ajudeodante/` | Foto anterior à clínica | Não referenciado pela produção | Recuperado como asset preparado. |
| `public/images/dante-chegando.jpg` | GitHub `lukaslimna1/lukaslimna1`, `assets/ajudeodante/` | Foto da chegada | Não referenciado pela produção | Recuperado como asset preparado. |
| `public/images/dante-hero.jpg` | GitHub `lukaslimna1/lukaslimna1`, `assets/ajudeodante/` | Imagem preparada para hero/OG | Não referenciado no corpo da produção | É byte-a-byte igual a `dante-2.jpg` e `dante-3.jpg`; usada apenas no metadata OG/Twitter da cópia original. |
| `public/videos/dante-video.mp4` | GitHub `lukaslimna1/lukaslimna1`, `assets/ajudeodante/` | Vídeo relacionado ao Dante | Não referenciado pela produção | Arquivo recuperado; metadados de duração não foram verificados por falta de `ffprobe`. |
| `public/images/Animal House - Fachada.jpeg` | Workspace local `assets/` | Foto da fachada da Animal House | Não referenciado pela produção | Material adicionado localmente e preservado sem alteração. |
| `public/images/Campanha - 01.jpeg` | Workspace local `assets/` | Material visual da campanha | Não referenciado pela produção | Material adicionado localmente e preservado sem alteração. |
| `public/images/Campanha - 02.jpeg` | Workspace local `assets/` | Material visual da campanha | Não referenciado pela produção | Material adicionado localmente e preservado sem alteração. |
| `public/images/dante na caixa - 01.jpeg` | Workspace local `assets/` | Foto do Dante | Não referenciado pela produção | Material adicionado localmente e preservado sem alteração. |
| `public/images/Dante na CAIXA.jpeg` | Workspace local `assets/` | Foto do Dante | Não referenciado pela produção | Material adicionado localmente e preservado sem alteração. |
| `public/images/Dante no carrinho.jpeg` | Workspace local `assets/` | Foto do Dante | Não referenciado pela produção | Material adicionado localmente e preservado sem alteração. |
| `public/videos/Video - Levar o Dante para clinica.mp4` | Workspace local `assets/` | Vídeo da campanha | Não referenciado pela produção | Material adicionado localmente e preservado sem alteração. |
| `.gitignore` | Criado localmente | Evitar versionar credenciais, dependências e artefatos | Sim, no repositório local | Não contém credenciais. |
| `.env.example` | Criado localmente | Nomear variáveis de runtime do Supabase | Não | Não contém valores. |
| `docs/PRODUCAO.md` | Criado localmente a partir da investigação | Registrar versão pública e limites de recuperação | Documento | Não é arquivo de produção. |
| `docs/ASSETS.md` | Criado localmente a partir da investigação | Registrar assets, hashes e referências | Documento | Não é arquivo de produção. |
| `docs/SUPABASE.md` | Criado localmente a partir da investigação | Registrar integração sem dados pessoais ou credenciais | Documento | Não é arquivo de produção. |
| `config/VERCEL.md` | Criado localmente a partir da investigação | Registrar informações públicas do deploy | Documento | Não contém configuração autenticada do projeto. |
| `database/schema/README.md` | Criado localmente | Documentar schema conhecido e lacunas | Documento | Nenhum SQL foi inventado ou executado. |
| `database/migrations/README.md` | Criado localmente | Documentar migrations não recuperadas | Documento | Nenhuma alteração foi feita no Supabase. |
| `archive/README.md` | Criado localmente | Registrar ausência de versões históricas | Documento | Não foram encontradas versões antigas públicas. |

## Confirmações solicitadas

| Item | Resultado |
|---|---|
| Imagens do Dante | Seis imagens recuperadas; somente `dante-3.jpg` é referenciada na produção. |
| Imagens da Animal House | `dante-animal-house.jpg` recuperada; não referenciada na produção atual. |
| Materiais da campanha | Textos, Pix, contatos, agradecimentos e compartilhamento estão no `src/index.html`; os assets preparados estão em `public/`. |
| Vídeo do Dante | `dante-video.mp4` recuperado; não referenciado na produção. |
| Barra de arrecadação | Presente; meta e confirmado são calculados em centavos e renderizados no DOM. |
| Formulário “Já doou?” | Presente; envio opcional para `dante_donor_signals`. |
| Integração da barra com Supabase | Presente; leitura REST de `dante_campaign`, filtro `id=main`. |
| Agradecimentos/doadores | Agradecimentos estáticos para Animal House, Rosângela e Mariana Lorenzetti Gil; não há lista dinâmica de doadores. |
| Pix, WhatsApp e compartilhamento | Presentes; Pix `14988025296`, WhatsApp e links para WhatsApp/Facebook/X/Telegram. |

## Referências quebradas ou ausentes

- Não foram encontrados links locais quebrados após a adaptação das imagens para `../public/images/`.
- `dante-animal-house.jpg`, `dante-antes-clinica.jpg`, `dante-chegando.jpg`, `dante-2.jpg`, `dante-video.mp4` e os novos arquivos locais existem, mas não têm uso na versão de produção recuperada.
- Não foram recuperados `package.json`, `vercel.json`, `README`, migrations, schema SQL, configuração autenticada da Vercel ou histórico de versões.
- A produção não expõe `robots.txt`, `sitemap.xml` ou favicon nos caminhos testados.
