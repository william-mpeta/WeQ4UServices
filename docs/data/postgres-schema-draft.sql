-- WeQ4UServices PostgreSQL schema proposal (not applied).
-- Supabase-oriented: references auth.users for staff identities.
-- Review workflow, retention, legal/privacy and access decisions before execution.
-- Start in a disposable development project. This file is not a production migration.

create extension if not exists pgcrypto;

create table public.service_types (
  id text primary key,
  name text not null,
  description text not null default '',
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.request_statuses (
  key text primary key,
  label text not null unique,
  is_terminal boolean not null default false,
  is_customer_visible boolean not null default true,
  display_order integer not null unique
);

create table public.request_status_transitions (
  from_status text not null references public.request_statuses(key),
  to_status text not null references public.request_statuses(key),
  permission_code text not null,
  primary key (from_status, to_status)
);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.staff_profiles (
  user_id uuid primary key references auth.users(id) on delete restrict,
  display_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.roles (
  id text primary key,
  name text not null unique,
  description text not null default '',
  is_system boolean not null default false
);

create table public.permissions (
  code text primary key,
  description text not null
);

create table public.role_permissions (
  role_id text not null references public.roles(id) on delete cascade,
  permission_code text not null references public.permissions(code) on delete cascade,
  primary key (role_id, permission_code)
);

create table public.staff_user_roles (
  user_id uuid not null references public.staff_profiles(user_id) on delete cascade,
  role_id text not null references public.roles(id) on delete restrict,
  granted_by uuid references public.staff_profiles(user_id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create table public.service_checklist_versions (
  id uuid primary key default gen_random_uuid(),
  service_type_id text not null references public.service_types(id) on delete restrict,
  version integer not null check (version > 0),
  approval_state text not null check (approval_state in ('draft', 'approved', 'retired')),
  approved_by uuid references public.staff_profiles(user_id) on delete set null,
  approved_at timestamptz,
  effective_from date,
  effective_until date,
  created_at timestamptz not null default now(),
  unique (service_type_id, version),
  check ((approval_state = 'approved') = (approved_at is not null and approved_by is not null))
);

create table public.service_checklist_items (
  id uuid primary key default gen_random_uuid(),
  checklist_version_id uuid not null references public.service_checklist_versions(id) on delete cascade,
  item_key text not null,
  label text not null,
  guidance text not null default '',
  applicability jsonb not null default '{}'::jsonb,
  requirement text not null check (requirement in ('required', 'optional', 'conditional', 'staff_confirmed')),
  display_order integer not null default 0,
  is_active boolean not null default true,
  unique (checklist_version_id, item_key)
);

create table public.request_sequences (
  request_year integer primary key,
  last_number bigint not null default 0 check (last_number >= 0)
);

create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique,
  requester_name text not null,
  requester_phone text not null,
  requester_email text,
  suburb text not null,
  address text,
  courier_requested boolean not null default false,
  current_status text not null references public.request_statuses(key),
  source text not null default 'website',
  message text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

create table public.request_services (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete restrict,
  service_type_id text not null references public.service_types(id) on delete restrict,
  intake_schema_version integer not null default 1,
  intake_details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (request_id, service_type_id),
  unique (id, request_id)
);

create table public.request_consents (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete restrict,
  notice_version text not null,
  consent_given boolean not null check (consent_given),
  capture_channel text not null,
  captured_at timestamptz not null default now()
);

create table public.request_documents (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete restrict,
  request_service_id uuid,
  checklist_item_id uuid references public.service_checklist_items(id) on delete set null,
  document_key text,
  display_label text not null,
  storage_bucket text not null,
  object_path text not null unique,
  content_type text not null,
  byte_size bigint not null check (byte_size > 0),
  sha256 text,
  scan_state text not null default 'pending' check (scan_state in ('pending', 'clean', 'rejected', 'unavailable')),
  review_state text not null default 'unreviewed' check (review_state in ('unreviewed', 'accepted', 'rejected', 'replacement_requested')),
  expiry_date date,
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid references public.staff_profiles(user_id) on delete set null,
  deleted_at timestamptz,
  foreign key (request_service_id, request_id) references public.request_services(id, request_id) on delete restrict
);

create table public.request_status_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete restrict,
  from_status text references public.request_statuses(key),
  to_status text not null references public.request_statuses(key),
  changed_by uuid references public.staff_profiles(user_id) on delete set null,
  change_source text not null check (change_source in ('customer', 'staff', 'system', 'integration')),
  note text not null default '',
  occurred_at timestamptz not null default now()
);

create table public.request_assignments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete restrict,
  request_service_id uuid,
  department_id uuid references public.departments(id) on delete restrict,
  assignee_id uuid references public.staff_profiles(user_id) on delete restrict,
  assigned_by uuid references public.staff_profiles(user_id) on delete set null,
  assignment_note text not null default '',
  assigned_at timestamptz not null default now(),
  ended_at timestamptz,
  end_reason text,
  foreign key (request_service_id, request_id) references public.request_services(id, request_id) on delete restrict
);

create unique index one_active_request_assignment_per_request
  on public.request_assignments(request_id) where ended_at is null and request_service_id is null;
create unique index one_active_assignment_per_request_service
  on public.request_assignments(request_service_id) where ended_at is null and request_service_id is not null;

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete restrict,
  version integer not null check (version > 0),
  status text not null check (status in ('draft', 'pending', 'sent', 'approved', 'rejected', 'expired', 'cancelled')),
  currency char(3) not null default 'ZAR',
  total_minor_units bigint not null default 0 check (total_minor_units >= 0),
  valid_until timestamptz,
  prepared_by uuid references public.staff_profiles(user_id) on delete set null,
  approved_by uuid references public.staff_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (request_id, version)
);

create table public.quote_lines (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete restrict,
  request_service_id uuid references public.request_services(id) on delete restrict,
  category text not null check (category in ('handling', 'authority', 'third_party', 'courier', 'other')),
  description text not null,
  quantity numeric(10, 3) not null default 1 check (quantity > 0),
  unit_amount_minor bigint not null check (unit_amount_minor >= 0),
  line_total_minor bigint not null check (line_total_minor >= 0),
  display_order integer not null default 0
);

create table public.quote_decisions (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete restrict,
  decision text not null check (decision in ('approved', 'rejected', 'expired', 'withdrawn')),
  decision_channel text not null,
  evidence_reference text,
  recorded_by uuid references public.staff_profiles(user_id) on delete set null,
  decided_at timestamptz not null default now()
);

create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.service_requests(id) on delete restrict,
  event_key text not null,
  channel text not null check (channel in ('email', 'sms', 'whatsapp')),
  recipient text not null,
  template_key text not null,
  payload_safe jsonb not null default '{}'::jsonb,
  delivery_state text not null default 'queued' check (delivery_state in ('queued', 'sending', 'sent', 'failed', 'cancelled')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz,
  provider_reference text,
  last_error_code text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.staff_profiles(user_id) on delete set null,
  actor_type text not null check (actor_type in ('staff', 'customer', 'system', 'integration')),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  request_id uuid references public.service_requests(id) on delete restrict,
  safe_metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index service_requests_status_created_idx on public.service_requests(current_status, created_at desc);
create index request_services_service_idx on public.request_services(service_type_id, created_at desc);
create index request_documents_request_idx on public.request_documents(request_id, uploaded_at desc);
create index request_status_events_request_idx on public.request_status_events(request_id, occurred_at desc);
create index request_assignments_open_idx on public.request_assignments(assignee_id, assigned_at desc) where ended_at is null;
create index quotes_request_version_idx on public.quotes(request_id, version desc);
create index notification_outbox_queue_idx on public.notification_outbox(delivery_state, next_attempt_at) where delivery_state in ('queued', 'failed');
create index audit_events_request_idx on public.audit_events(request_id, occurred_at desc);

-- Deny direct browser roles by default. Add narrowly scoped RLS policies only
-- after the chosen API identity/authorization model is implemented and reviewed.
alter table public.service_types enable row level security;
alter table public.request_statuses enable row level security;
alter table public.request_status_transitions enable row level security;
alter table public.departments enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.staff_user_roles enable row level security;
alter table public.service_checklist_versions enable row level security;
alter table public.service_checklist_items enable row level security;
alter table public.request_sequences enable row level security;
alter table public.service_requests enable row level security;
alter table public.request_services enable row level security;
alter table public.request_consents enable row level security;
alter table public.request_documents enable row level security;
alter table public.request_status_events enable row level security;
alter table public.request_assignments enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_lines enable row level security;
alter table public.quote_decisions enable row level security;
alter table public.notification_outbox enable row level security;
alter table public.audit_events enable row level security;

-- Transactional reference allocation for the API:
-- insert request_year=YYYY,last_number=1; on conflict increment last_number;
-- return YYYY and last_number, then create reference_code as WQ-YYYY-NNNN
-- in the same transaction as the request insert and initial status event.
