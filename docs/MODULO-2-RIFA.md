# Módulo 2 — Ação entre Amigos / Rifa do Dante (V3 Final)

Documentação técnica da arquitetura, segurança, regras de banco e integração da Ação entre Amigos (Rifa da Smart TV SEMP 43").

---

## 1. Especificações da Ação

- **Prêmio**: Smart TV SEMP TCL 43" Full HD (Modelo 43S5300)
- **Quantidade Total de Números**: 100 números (001 a 100)
- **Valor por Número**: R$ 15,00 (1.500 centavos)
- **Arrecadação Máxima**: R$ 1.500,00 (150.000 centavos)
- **Forma de Pagamento**: Pix Direto (EMVCo BR Code / Copia e Cola)
- **Chave Pix**: `+5514988025296`
- **Nome do Recebedor**: `LUCAS M S LIMA` (14 caracteres $\le 25$)
- **Cidade do Recebedor**: `BAURU` (5 caracteres $\le 15$)

---

## 2. Isolamento de Banco de Dados e Ledger

- **Tabelas do Módulo**: `public.dante_raffle`, `public.dante_raffle_numbers`, `public.dante_raffle_reservations`.
- **Isolamento Total**: O total arrecadado da rifa **NÃO** altera o saldo da campanha principal (`dante_campaign.confirmed_cents` e `dante_contributions`).
- **Segurança RLS e Grants**:
  - Tabelas de reservas e números são inacessíveis para o cliente `anon`.
  - RPC pública sanitizada `get_dante_raffle_public_state` retorna estritamente `[number, visual_status]`.
  - RPCs de escrita e gestão são executadas por `service_role` (Server Actions) ou administradores autenticados (`is_dante_admin()`).

---

## 3. Máquina de Estados e Regras de Negócio

### Estados da Reserva:
1. `reserved`: Reserva inicial com validade de 30 minutos (`expires_at = now() + 30 min`).
2. `awaiting_confirmation`: Acionada quando o participante clica em *"Já enviei meu comprovante"*. **NÃO expira automaticamente** (`expires_at = null`), mantendo os números bloqueados até decisão do administrador.
3. `paid`: Confirmada pelo administrador após conferência do Pix. Estado **imutável e definitivo**.
4. `expired`: Marcada automaticamente pela função de limpeza quando uma reserva `reserved` passa de 30 minutos sem envio de comprovante.
5. `cancelled`: Liberada manualmente pelo administrador caso o comprovante seja inválido.

### Proteções de Concorrência e Integridade:
- **Bloqueio Pessimista Real (`SELECT ... FOR UPDATE`)**: A função `reserve_dante_raffle_numbers` trava as linhas em ordem crescente antes de validar disponibilidade.
- **Advisory Lock de 64 bits por Telefone**: Previne requisições concorrentes disparadas pelo mesmo WhatsApp.
- **Limite por Telefone**: Máximo de 2 reservas ativas simultâneas por WhatsApp.
- **Limite por Pedido**: Máximo de 10 números por pedido.
- **Token Secreto**: As operações públicas da reserva exigem um token criptográfico de 128 bits cujo hash SHA-256 é armazenado no banco.

---

## 4. Rotas e Componentes

- `/acao-entre-amigos`: Página pública da rifa com grade de números, verificação de status (`draft` / `active`) e checkout Pix.
- `/adm/acao-entre-amigos`: Módulo administrativo para monitoramento de KPIs, conferência de pedidos, confirmação de pagamentos, liberação de números e controle do status da ação (`Rascunho`, `Ativar Ação`, `Encerrar`, `Cancelar`).
