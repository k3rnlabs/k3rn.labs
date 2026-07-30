-- KERN Visual Gold Standard Pipeline — additive reference schema.
create extension if not exists pgcrypto;

create type public.audit_run_status as enum ('DRAFT','INPUTS_VALIDATED','PAGE_MAPPED','VISUAL_AUDITED','AI_FINGERPRINT_AUDITED','CRO_AUDITED','ART_DIRECTION_AUDITED','TECHNICAL_AUDITED','TECHNICAL_SKIPPED','PRIORITIZED','PROMPTS_PACKAGED','IMPLEMENTATION_PENDING','VERIFICATION_PENDING','VERIFIED','FINAL_REVIEWED','COMPLETE','BLOCKED','FAILED');
create type public.audit_severity as enum ('P0','P1','P2','P3');
create type public.audit_finding_status as enum ('OPEN','APPROVED','IN_PROGRESS','RESOLVED','PARTIALLY_RESOLVED','UNCHANGED','REGRESSED','REJECTED');

create table if not exists public.audit_projects (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null, product_name text, target_audience text, business_goal text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(owner_id,name)
);
create table if not exists public.audit_runs (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.audit_projects(id) on delete cascade,
 run_key text not null unique, mode text not null check(mode in('captures','url','repository')),
 evidence_level text not null check(evidence_level in('A','B','C')), status public.audit_run_status not null default 'DRAFT',
 prompt_version text not null, schema_version text not null, current_gate text,
 limitations jsonb not null default '[]', metadata jsonb not null default '{}',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.audit_inputs (
 id uuid primary key default gen_random_uuid(), run_id uuid not null references public.audit_runs(id) on delete cascade,
 kind text not null, storage_path text, external_url text, sha256 text, mime_type text,
 width_px integer, height_px integer, viewport_width_px integer, metadata jsonb not null default '{}',
 created_at timestamptz not null default now(), check(storage_path is not null or external_url is not null)
);
create table if not exists public.audit_sections (
 id uuid primary key default gen_random_uuid(), run_id uuid not null references public.audit_runs(id) on delete cascade,
 section_key text not null, position integer not null, role text not null, heading text,
 desktop jsonb not null, mobile jsonb not null, components jsonb not null default '[]', actions jsonb not null default '[]',
 asset_families jsonb not null default '[]', created_at timestamptz not null default now(), unique(run_id,section_key)
);
create table if not exists public.audit_findings (
 id uuid primary key default gen_random_uuid(), run_id uuid not null references public.audit_runs(id) on delete cascade,
 finding_key text not null, category text not null, severity public.audit_severity not null, viewport jsonb not null,
 section_key text not null, title text not null, observation text not null, evidence jsonb not null, impact text not null,
 recommendation text not null, skills jsonb not null, effort text not null check(effort in('XS','S','M','L','XL')),
 confidence numeric(4,3) not null check(confidence between 0 and 1), status public.audit_finding_status not null default 'OPEN',
 verification text not null, dependencies jsonb not null default '[]', lot_key text, raw_source jsonb not null default '{}',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(run_id,finding_key)
);
create table if not exists public.audit_scores (
 id uuid primary key default gen_random_uuid(), run_id uuid not null references public.audit_runs(id) on delete cascade,
 version integer not null default 1, axes jsonb not null, total numeric(5,2) not null check(total between 0 and 100),
 ai_fingerprint_score numeric(5,2) not null check(ai_fingerprint_score between 0 and 100),
 confidence numeric(4,3) not null check(confidence between 0 and 1), ceiling numeric(5,2) not null check(ceiling between 0 and 100),
 created_at timestamptz not null default now(), unique(run_id,version)
);
create table if not exists public.audit_prompt_packages (
 id uuid primary key default gen_random_uuid(), run_id uuid not null references public.audit_runs(id) on delete cascade,
 package_version integer not null default 1, payload jsonb not null, finding_snapshot jsonb not null,
 created_at timestamptz not null default now(), unique(run_id,package_version)
);
create table if not exists public.audit_verification_runs (
 id uuid primary key default gen_random_uuid(), run_id uuid not null references public.audit_runs(id) on delete cascade,
 verification_key text not null, input_hash text not null, payload jsonb not null,
 verdict text not null check(verdict in('PASS','REVISE','BLOCKED','FAIL')),
 created_at timestamptz not null default now(), unique(run_id,verification_key)
);
create table if not exists public.audit_artifacts (
 id uuid primary key default gen_random_uuid(), run_id uuid not null references public.audit_runs(id) on delete cascade,
 kind text not null, storage_path text not null, sha256 text, metadata jsonb not null default '{}', created_at timestamptz not null default now()
);
create index if not exists audit_runs_project_status_idx on public.audit_runs(project_id,status,created_at desc);
create index if not exists audit_findings_run_priority_idx on public.audit_findings(run_id,severity,status);
create index if not exists audit_inputs_run_kind_idx on public.audit_inputs(run_id,kind);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create trigger audit_projects_updated_at before update on public.audit_projects for each row execute function public.set_updated_at();
create trigger audit_runs_updated_at before update on public.audit_runs for each row execute function public.set_updated_at();
create trigger audit_findings_updated_at before update on public.audit_findings for each row execute function public.set_updated_at();

alter table public.audit_projects enable row level security;
alter table public.audit_runs enable row level security;
alter table public.audit_inputs enable row level security;
alter table public.audit_sections enable row level security;
alter table public.audit_findings enable row level security;
alter table public.audit_scores enable row level security;
alter table public.audit_prompt_packages enable row level security;
alter table public.audit_verification_runs enable row level security;
alter table public.audit_artifacts enable row level security;

create policy "owners manage projects" on public.audit_projects for all using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy "owners manage runs" on public.audit_runs for all using(exists(select 1 from public.audit_projects p where p.id=audit_runs.project_id and p.owner_id=auth.uid())) with check(exists(select 1 from public.audit_projects p where p.id=audit_runs.project_id and p.owner_id=auth.uid()));

-- Create equivalent run-owner policies on child tables during integration, using audit_runs -> audit_projects ownership.
