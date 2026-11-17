-- WeQ4U platform operations schema extension (design draft; NOT a migration).
-- Requires the base entities in postgres-schema-draft.sql.
-- Review names, enums, RLS, retention, payment and accounting rules before use.

create table public.workflow_versions (
  id uuid primary key default gen_random_uuid(),
  service_type_id text not null references public.service_types(id) on delete restrict,
  version integer not null check (version > 0),
  state text not null check (state in ('draft', 'approved', 'retired')),
  config jsonb not null default '{}'::jsonb,
  approved_by uuid references public.staff_profiles(user_id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique(service_type_id, version)
);

create table public.workflow_instances (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete restrict,
  request_service_id uuid not null references public.request_services(id) on delete restrict,
  workflow_version_id uuid not null references public.workflow_versions(id) on delete restrict,
  state text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(request_service_id)
);

create table public.workflow_tasks (
  id uuid primary key default gen_random_uuid(),
  workflow_instance_id uuid not null references public.workflow_instances(id) on delete restrict,
  task_key text not null,
  title text not null,
  department_id uuid references public.departments(id) on delete restrict,
  assignee_id uuid references public.staff_profiles(user_id) on delete restrict,
  state text not null check (state in ('queued', 'assigned', 'in_progress', 'waiting_customer', 'waiting_external', 'blocked', 'completed', 'cancelled')),
  priority smallint not null default 3 check (priority between 1 and 5),
  due_at timestamptz,
  completed_at timestamptz,
  pause_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workflow_task_events (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.workflow_tasks(id) on delete restrict,
  actor_id uuid references public.staff_profiles(user_id) on delete set null,
  event_key text not null,
  safe_metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create table public.sla_policies (
  id uuid primary key default gen_random_uuid(),
  service_type_id text references public.service_types(id) on delete restrict,
  task_key text,
  version integer not null check (version > 0),
  target_minutes integer not null check (target_minutes > 0),
  calendar_key text not null,
  state text not null check (state in ('draft', 'active', 'retired')),
  effective_from timestamptz,
  effective_until timestamptz,
  unique(service_type_id, task_key, version)
);

create table public.sla_clocks (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete restrict,
  task_id uuid references public.workflow_tasks(id) on delete restrict,
  policy_id uuid not null references public.sla_policies(id) on delete restrict,
  started_at timestamptz not null,
  due_at timestamptz not null,
  stopped_at timestamptz,
  breached_at timestamptz,
  pause_state text not null default 'running' check (pause_state in ('running', 'paused', 'stopped')),
  pause_reason text,
  policy_snapshot jsonb not null default '{}'::jsonb
);

create table public.sla_clock_events (
  id uuid primary key default gen_random_uuid(),
  sla_clock_id uuid not null references public.sla_clocks(id) on delete restrict,
  event_key text not null check (event_key in ('paused', 'resumed', 'stopped', 'breached', 'escalated')),
  reason text,
  actor_id uuid references public.staff_profiles(user_id) on delete set null,
  occurred_at timestamptz not null default now()
);

-- Quote lines remain immutable once issued. Each payment order represents an
-- approved quote amount or explicit service milestone, including later fees.
create table public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete restrict,
  quote_id uuid references public.quotes(id) on delete restrict,
  milestone_key text not null,
  amount_minor_units bigint not null check (amount_minor_units > 0),
  currency char(3) not null default 'ZAR',
  state text not null check (state in ('pending', 'initiated', 'partially_paid', 'paid', 'failed', 'cancelled', 'refunded')),
  due_at timestamptz,
  created_at timestamptz not null default now(),
  unique(request_id, milestone_key)
);

create table public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  payment_order_id uuid not null references public.payment_orders(id) on delete restrict,
  provider_key text not null,
  provider_reference text,
  idempotency_key text not null unique,
  amount_minor_units bigint not null check (amount_minor_units > 0),
  currency char(3) not null default 'ZAR',
  state text not null check (state in ('created', 'pending', 'succeeded', 'failed', 'reversed')),
  reconciled_at timestamptz,
  created_at timestamptz not null default now(),
  unique(provider_key, provider_reference)
);

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_transaction_id uuid references public.payment_transactions(id) on delete restrict,
  payment_order_id uuid not null references public.payment_orders(id) on delete restrict,
  event_key text not null,
  provider_event_id text unique,
  safe_metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_transaction_id uuid not null references public.payment_transactions(id) on delete restrict,
  amount_minor_units bigint not null check (amount_minor_units > 0),
  reason text not null,
  state text not null check (state in ('requested', 'approved', 'submitted', 'succeeded', 'failed', 'rejected')),
  requested_by uuid references public.staff_profiles(user_id) on delete set null,
  approved_by uuid references public.staff_profiles(user_id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.retention_policies (
  id uuid primary key default gen_random_uuid(),
  record_class text not null,
  purpose text not null,
  active_days integer check (active_days is null or active_days >= 0),
  archive_days integer check (archive_days is null or archive_days >= 0),
  state text not null check (state in ('draft', 'active', 'retired')),
  effective_from date not null,
  effective_until date,
  created_at timestamptz not null default now()
);

create table public.retention_records (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.service_requests(id) on delete restrict,
  entity_type text not null,
  entity_id uuid not null,
  policy_id uuid not null references public.retention_policies(id) on delete restrict,
  state text not null check (state in ('active', 'archived', 'deletion_review', 'deleted', 'legal_hold')),
  review_after timestamptz,
  changed_by uuid references public.staff_profiles(user_id) on delete set null,
  changed_at timestamptz not null default now()
);

create table public.purge_audit_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  request_id uuid references public.service_requests(id) on delete set null,
  policy_id uuid references public.retention_policies(id) on delete set null,
  action text not null check (action in ('archive', 'purge', 'anonymize', 'legal_hold', 'hold_release')),
  actor_id uuid references public.staff_profiles(user_id) on delete set null,
  reason text not null,
  occurred_at timestamptz not null default now()
);

create index workflow_tasks_queue_idx on public.workflow_tasks(state, department_id, due_at);
create index workflow_tasks_assignee_idx on public.workflow_tasks(assignee_id, due_at) where assignee_id is not null;
create index sla_clocks_due_idx on public.sla_clocks(due_at) where stopped_at is null;
create index payment_orders_state_idx on public.payment_orders(state, due_at);
create index retention_review_idx on public.retention_records(review_after) where state in ('active', 'archived', 'deletion_review');

-- Enable RLS and add policies only after the API identity/role model is selected.
