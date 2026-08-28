# Mercado Pago — integração segura

## O que já está implementado

- Checkout Pro criado no servidor pela rota `src/app/api/mercadopago/preference/route.ts`.
- Valor informado pelo visitante validado a partir de R$ 0,01, em centavos, até R$ 3.500,00.
- URLs de retorno para pagamento aprovado, pendente ou rejeitado.
- `notification_url` configurável por `MERCADOPAGO_WEBHOOK_URL`.
- Webhook em `src/app/api/mercadopago/webhook/route.ts`.
- Validação da assinatura `x-signature` com HMAC-SHA256 e comparação em tempo constante.
- Consulta do pagamento confirmado em `GET /v1/payments/{id}`.
- O token de acesso nunca é importado pelo frontend.

## O que ainda não é feito automaticamente

O webhook não altera `dante_campaign.confirmed_cents`. O banco atualmente expõe a campanha agregada, mas não há nesta aplicação uma tabela de pagamentos/eventos com uma chave única para impedir duplicidade. Somar diretamente no agregado seria inseguro porque o Mercado Pago pode reenviar a mesma notificação.

Para concluir essa parte em uma etapa posterior, será necessário aprovar uma estrutura no Supabase com, no mínimo, `payment_id` único, status, valor em centavos, `external_reference`, timestamps e uma rotina transacional que atualize o agregado apenas uma vez por pagamento aprovado. Essa alteração deve ser feita com migration revisada, RLS/políticas adequadas e uma chave server-only.

## Variáveis necessárias

```text
MERCADOPAGO_ACCESS_TOKEN
MERCADOPAGO_WEBHOOK_SECRET
NEXT_PUBLIC_SITE_URL
MERCADOPAGO_WEBHOOK_URL (opcional)
```

As variáveis privadas devem ser cadastradas apenas no ambiente de servidor. O `.env.example` desta cópia local não contém valores secretos.

## Fontes técnicas

- [Criar preferência — Mercado Pago Developers](https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-pro/preferences/create-preference/post)
- [Configurar URLs de retorno — Mercado Pago Developers](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/configure-back-urls)
- [Notificações Webhooks e assinatura — Mercado Pago Developers](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks)
