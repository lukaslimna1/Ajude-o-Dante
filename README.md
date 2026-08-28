# Ajude o Dante — nova aplicação

Esta é uma aplicação isolada para a próxima versão da campanha **Ajude o Dante**. Ela foi criada fora do projeto atual e usa Next.js, TypeScript, Tailwind CSS, Motion e Supabase.

## Localização

`G:\Sites\Ajude o Dante\ajude-o-dante-next`

A pasta existente `G:\Sites\Ajude o Dante\Ajude-o-Dante` não faz parte desta aplicação e não foi alterada nesta etapa.

## Executar localmente

```bash
npm install
npm run dev -- --port 8080
```

Depois abra [http://localhost:8080](http://localhost:8080).

Para carregar os dados reais da campanha, copie `.env.example` para `.env.local` e preencha somente a URL do Supabase e a chave publicável. A aplicação consulta `dante_campaign` e preserva a estrutura de `dante_donor_signals`. Sem essas variáveis, a interface continua disponível, mas a arrecadação aparece como não configurada.

## Estrutura principal

- `src/app/`: rota principal, layout, metadados SEO e estilos globais.
- `src/components/campaign-page.tsx`: landing page interativa, galeria, vídeo, compartilhamento, Pix, formulário e accordion.
- `src/app/sitemap.ts` e `src/app/robots.ts`: descoberta técnica para mecanismos de busca.
- `public/images/Usar/Fotos/`: única fonte de fotos usada atualmente pela página; cada arquivo selecionado aparece uma única vez na composição, e `Dante 07.png` é o destaque.
- `public/images/Usar/Video/`: única fonte do vídeo usado atualmente pela página.
- `public/images/Usar/qr-pix-direto.png`: imagem do QR Code Pix direto fornecida para a campanha.
- `.env.example`: nomes das variáveis, sem valores secretos.

## Integrações

- Supabase usa `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` no navegador para consultar o progresso da campanha em `dante_campaign`.
- Pix continua sendo exibido e pode ser copiado.
- Compartilhamento usa a API nativa do navegador, com cópia do link como fallback.
- WhatsApp permanece como contato direto.
- SEO inclui metadados canônicos, Open Graph/Twitter, JSON-LD para WebSite/WebPage/FAQ, sitemap e robots.
- Mercado Pago usa Checkout Pro por Route Handlers do Next.js. `MERCADOPAGO_ACCESS_TOKEN` e `MERCADOPAGO_WEBHOOK_SECRET` ficam somente no servidor; o navegador recebe apenas a URL temporária de checkout. O webhook valida `x-signature` por HMAC e consulta o pagamento diretamente na API do Mercado Pago.
- A confirmação do webhook ainda não soma automaticamente o valor em `dante_campaign`: isso exige uma tabela de pagamentos com idempotência no Supabase. Esse bloqueio é intencional para não duplicar doações quando o Mercado Pago repetir uma notificação e para não alterar o schema sem aprovação.

## Assets utilizados

Foram reutilizados, sem alteração, os materiais reais selecionados nas pastas `public/images/Usar/Fotos/` e `public/images/Usar/Video/`. `Dante 07.png` é a imagem de destaque atual; o player usa `levando o Dante para Clinica.mp4`. A página não referencia mais as fotos antigas fora de `Usar/Fotos`.

## Mercado Pago em desenvolvimento

1. Copie `.env.example` para `.env.local`.
2. Preencha `MERCADOPAGO_ACCESS_TOKEN` e `MERCADOPAGO_WEBHOOK_SECRET` no ambiente do servidor. Nunca os coloque em variáveis `NEXT_PUBLIC_*`.
3. Defina `NEXT_PUBLIC_SITE_URL` com uma URL pública HTTPS. Para receber webhooks durante o desenvolvimento local, defina também `MERCADOPAGO_WEBHOOK_URL` com um endpoint HTTPS acessível pelo Mercado Pago.
4. O botão “Continuar no Mercado Pago” chama `/api/mercadopago/preference` e encaminha o doador para o Checkout Pro.
5. O endpoint `/api/mercadopago/webhook` valida a notificação e confirma o status pela API. A persistência financeira no Supabase depende da aprovação de uma tabela de eventos/pagamentos idempotente.

## Situação desta etapa

Esta é uma versão DEV isolada. Não houve commit, push, deploy, alteração na Vercel ou alteração no Supabase. O `index.html` da raiz e os demais arquivos do projeto original permanecem separados.
