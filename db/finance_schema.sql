-- =====================================================================
-- SCHÉMA FINANCEMENT PARTICIPATIF — ELECTRO MEN
-- =====================================================================
-- Additif uniquement : n'altère jamais les tables existantes
-- (products, orders, settings, push_subscriptions).
--
-- À exécuter dans Supabase SQL Editor. Idempotent (IF NOT EXISTS partout)
-- pour pouvoir être rejoué sans risque.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PROFILS PARTICIPANTS
-- ---------------------------------------------------------------------
-- Un participant = un compte Supabase Auth (auth.users) + un profil ici.
create table if not exists public.participant_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  status text not null default 'active' check (status in ('active', 'suspended', 'closed')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. RÔLES ADMIN (remplace progressivement le mot de passe partagé)
-- ---------------------------------------------------------------------
create table if not exists public.admin_roles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'manager', 'employee')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. OPÉRATIONS D'IMPORTATION FINANCÉES
-- ---------------------------------------------------------------------
create table if not exists public.operations (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  title text not null,
  description text,
  target_amount_fcfa bigint not null check (target_amount_fcfa > 0),
  status text not null default 'open'
    check (status in ('open', 'funded', 'in_progress', 'closed', 'cancelled')),
  start_date date not null default current_date,
  end_date date,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. PARTICIPATIONS (un participant investit dans une opération)
-- ---------------------------------------------------------------------
create table if not exists public.participations (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references public.operations(id) on delete restrict,
  participant_id uuid not null references public.participant_profiles(id) on delete restrict,
  amount_fcfa bigint not null check (amount_fcfa > 0),
  status text not null default 'active' check (status in ('active', 'closed', 'cancelled')),
  result_fcfa bigint, -- bénéfice (positif) ou perte (négatif), rempli à la clôture
  created_at timestamptz not null default now()
);

create index if not exists idx_participations_operation on public.participations(operation_id);
create index if not exists idx_participations_participant on public.participations(participant_id);

-- Vue calculée : montant collecté + nombre de participants, dérivés des
-- participations réelles (jamais saisis manuellement). Placée ici, après la
-- création de `participations`, car elle en dépend directement.
create or replace view public.operations_with_stats as
select
  o.*,
  coalesce(sum(p.amount_fcfa) filter (where p.status = 'active'), 0) as collected_amount_fcfa,
  count(distinct p.participant_id) filter (where p.status = 'active') as participants_count
from public.operations o
left join public.participations p on p.operation_id = o.id
group by o.id;

-- ---------------------------------------------------------------------
-- 5. COMMANDES D'IMPORTATION (fournisseurs, coûts, réception)
-- ---------------------------------------------------------------------
create table if not exists public.import_orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  operation_id uuid references public.operations(id) on delete set null,
  supplier_name text not null,
  product_description text not null,
  quantity integer not null check (quantity > 0),
  purchase_price_fcfa bigint not null check (purchase_price_fcfa > 0),
  transport_fee_fcfa bigint not null default 0,
  customs_fee_fcfa bigint not null default 0,
  tax_fee_fcfa bigint not null default 0,
  other_fees_fcfa bigint not null default 0,
  status text not null default 'draft'
    check (status in ('draft', 'ordered', 'in_transit', 'customs', 'received', 'cancelled')),
  order_date date not null default current_date,
  expected_reception_date date,
  received_date timestamptz,
  linked_product_id text, -- référence informative vers products.id ; pas de contrainte FK
                           -- stricte ici pour éviter un conflit de type si products.id
                           -- n'est pas exactement `text` dans ta base existante
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_import_orders_operation on public.import_orders(operation_id);

-- ---------------------------------------------------------------------
-- 6. GRAND LIVRE (append-only — jamais de suppression ni update de montant)
-- ---------------------------------------------------------------------
create table if not exists public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid references public.participant_profiles(id),
  operation_id uuid references public.operations(id),
  type text not null check (type in ('deposit', 'participation', 'profit', 'loss', 'refund', 'withdrawal', 'adjustment')),
  amount_fcfa bigint not null, -- positif = crédit, négatif = débit
  reference text not null,
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_ledger_participant on public.ledger_entries(participant_id);

-- Empêche toute suppression/modification d'écriture depuis l'API (append-only).
-- Les corrections doivent passer par une nouvelle écriture de type 'adjustment'.
create or replace function public.forbid_ledger_mutation()
returns trigger as $$
begin
  raise exception 'Les écritures du grand livre sont en lecture seule après création. Utilisez un ajustement.';
end;
$$ language plpgsql;

drop trigger if exists trg_forbid_ledger_update on public.ledger_entries;
create trigger trg_forbid_ledger_update
  before update or delete on public.ledger_entries
  for each row execute function public.forbid_ledger_mutation();

-- ---------------------------------------------------------------------
-- 7. RETRAITS
-- ---------------------------------------------------------------------
create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participant_profiles(id),
  amount_fcfa bigint not null check (amount_fcfa > 0),
  method text not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'approved', 'rejected', 'completed')),
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by uuid references auth.users(id)
);

create index if not exists idx_withdrawals_participant on public.withdrawals(participant_id);

-- ---------------------------------------------------------------------
-- 8. DISTRIBUTIONS
-- ---------------------------------------------------------------------
create table if not exists public.distributions (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references public.operations(id),
  total_amount_fcfa bigint not null check (total_amount_fcfa <> 0),
  status text not null default 'draft' check (status in ('draft', 'validated', 'confirmed')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create table if not exists public.distribution_lines (
  id uuid primary key default gen_random_uuid(),
  distribution_id uuid not null references public.distributions(id) on delete cascade,
  participant_id uuid not null references public.participant_profiles(id),
  amount_fcfa bigint not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 9. JOURNAL D'AUDIT (écrit uniquement par le backend, jamais par le client)
-- ---------------------------------------------------------------------
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  actor_name text not null,
  action text not null check (action in ('create', 'update', 'delete', 'approve', 'reject', 'login')),
  resource text not null,
  previous_value text,
  new_value text,
  created_at timestamptz not null default now()
);

create or replace function public.forbid_audit_mutation()
returns trigger as $$
begin
  raise exception 'Le journal d''audit est en lecture seule après création.';
end;
$$ language plpgsql;

drop trigger if exists trg_forbid_audit_update on public.audit_log;
create trigger trg_forbid_audit_update
  before update or delete on public.audit_log
  for each row execute function public.forbid_audit_mutation();

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
-- Le backend Express utilise la clé service_role (contourne RLS) — ces
-- policies sont une deuxième ligne de défense si un client Supabase
-- direct (anon key) est utilisé plus tard (ex: auth participant côté
-- frontend). Un participant ne voit jamais les données d'un autre.

alter table public.participant_profiles enable row level security;
alter table public.operations enable row level security;
alter table public.participations enable row level security;
alter table public.import_orders enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.withdrawals enable row level security;
alter table public.distributions enable row level security;
alter table public.distribution_lines enable row level security;
alter table public.audit_log enable row level security;
alter table public.admin_roles enable row level security;

drop policy if exists "participant reads own profile" on public.participant_profiles;
create policy "participant reads own profile" on public.participant_profiles
  for select using (auth.uid() = id);

drop policy if exists "anyone reads open operations" on public.operations;
create policy "anyone reads open operations" on public.operations
  for select using (true);

drop policy if exists "participant reads own participations" on public.participations;
create policy "participant reads own participations" on public.participations
  for select using (auth.uid() = participant_id);

drop policy if exists "participant reads own ledger" on public.ledger_entries;
create policy "participant reads own ledger" on public.ledger_entries
  for select using (auth.uid() = participant_id);

drop policy if exists "participant reads own withdrawals" on public.withdrawals;
create policy "participant reads own withdrawals" on public.withdrawals
  for select using (auth.uid() = participant_id);

-- Aucune policy INSERT/UPDATE/DELETE pour les participants : toute écriture
-- passe obligatoirement par le backend (clé service_role), qui applique les
-- règles métier (validation de solde, calculs serveur, etc.).

-- =====================================================================
-- MIGRATION 2 — file d'attente de participation (paiement à confirmer par l'admin)
-- =====================================================================
-- Un participant déclare vouloir investir (comme une commande boutique avec
-- paiement mobile money) ; ça reste en 'pending' et hors des statistiques
-- collectées tant qu'un admin n'a pas confirmé la réception réelle du paiement
-- et basculé le statut à 'active'. Idempotent, sûr à rejouer.

alter table public.participations drop constraint if exists participations_status_check;
alter table public.participations add constraint participations_status_check
  check (status in ('pending', 'active', 'closed', 'cancelled'));

alter table public.participations alter column status set default 'pending';

alter table public.participations add column if not exists payment_method text;
alter table public.participations add column if not exists payment_reference text;
alter table public.participations add column if not exists reviewed_by uuid references auth.users(id);
alter table public.participations add column if not exists reviewed_at timestamptz;

-- Un participant peut créer sa propre demande de participation (statut pending
-- imposé côté backend), mais ne peut ni la valider ni en créer pour quelqu'un d'autre.
drop policy if exists "participant creates own pending participation" on public.participations;
create policy "participant creates own pending participation" on public.participations
  for insert with check (auth.uid() = participant_id);

-- =====================================================================
-- MIGRATION 4 — détails précis d'une opération (pour une décision informée)
-- =====================================================================
alter table public.operations add column if not exists product_category text;
alter table public.operations add column if not exists estimated_quantity integer;
alter table public.operations add column if not exists resale_channel text; -- ex: "boutique en ligne + WhatsApp"
alter table public.operations add column if not exists risk_notes text; -- risques spécifiques identifiés par l'admin
alter table public.operations add column if not exists estimated_duration_days integer;

-- Trace explicitement que le participant a bien vu et accepté l'avertissement de
-- risque au moment de sa demande — utile en cas de litige.
alter table public.participations add column if not exists risk_acknowledged_at timestamptz;

-- =====================================================================
-- MIGRATION 3 — documents (factures fournisseurs, justificatifs)
-- =====================================================================
-- Stockage privé (bucket Supabase Storage "documents", non public) : les fichiers
-- ne sont accessibles que via une URL signée générée à la demande par le backend.

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  storage_path text not null,
  operation_id uuid references public.operations(id) on delete set null,
  import_order_id uuid references public.import_orders(id) on delete set null,
  participant_id uuid references public.participant_profiles(id) on delete set null,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_documents_operation on public.documents(operation_id);
create index if not exists idx_documents_participant on public.documents(participant_id);

alter table public.documents enable row level security;

drop policy if exists "participant reads own documents" on public.documents;
create policy "participant reads own documents" on public.documents
  for select using (auth.uid() = participant_id);
