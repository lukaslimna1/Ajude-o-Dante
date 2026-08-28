# Schema do Supabase

O código público referencia duas tabelas:

- `dante_campaign`: leitura de `goal_cents`, `confirmed_cents`, filtrando `id=main`.
- `dante_donor_signals`: inserção dos campos `donor_name`, `contact`, `amount_cents`, `message` e `consent_to_contact`.

O schema SQL completo, tipos, chaves, índices e políticas RLS não estavam disponíveis por uma fonte pública consultável. Este arquivo é somente um registro de investigação; não é uma definição SQL e nenhuma alteração foi executada.
