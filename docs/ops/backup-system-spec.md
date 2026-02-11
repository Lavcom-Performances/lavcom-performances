# Lavcom Platform -- Production Backup System Specification

Generated: 2026-02-11 21:27:08 UTC

------------------------------------------------------------------------

## OBJECTIVE

Implement a secure, production-grade full backup system with:

-   Weekly automated full backup (Sunday 03:00 UTC)
-   Manual SuperAdmin trigger
-   PostgreSQL full dump via pg_dump
-   Storage archive (excluding backups bucket)
-   Metadata tracking in database
-   30-day retention policy
-   Secure callback reconciliation
-   Downloadable backups via Admin UI
-   Concurrency protection
-   Full observability

Execution engine: GitHub Actions\
Orchestration layer: Supabase Edge Functions

------------------------------------------------------------------------

# 1. REQUIRED GITHUB SECRETS

Configure the following repository secrets:

-   SUPABASE_DB_URL (direct connection string with sslmode=require)
-   SUPABASE_SERVICE_ROLE_KEY
-   SUPABASE_PROJECT_REF
-   SUPABASE_ACCESS_TOKEN
-   BACKUP_CALLBACK_SECRET

------------------------------------------------------------------------

# 2. STORAGE BUCKET

Create private bucket:

backups

Folder structure (UTC-based):

backups/YYYY/MM/DD/backup_YYYYMMDD_HHMMSS/ database_full.sql
storage_archive.zip metadata.json

Important: Exclude bucket "backups" from storage archive to prevent
recursion.

------------------------------------------------------------------------

# 3. DATABASE MIGRATION

create table backup_jobs ( id uuid primary key default
gen_random_uuid(), triggered_by uuid references auth.users(id),
trigger_type text not null check (trigger_type in ('manual','cron')),
status text not null check (status in ('running','completed','failed')),
started_at timestamptz not null default now(), completed_at timestamptz,
total_size bigint default 0, error_message text, created_at timestamptz
default now() );

create index idx_backup_jobs_status on backup_jobs(status); create index
idx_backup_jobs_created_at on backup_jobs(created_at desc);

create table backup_files ( id uuid primary key default
gen_random_uuid(), backup_job_id uuid references backup_jobs(id) on
delete cascade, file_type text not null check (file_type in
('database','storage')), file_path text not null, file_size bigint not
null, created_at timestamptz default now() );

Enable RLS: - SELECT allowed only to super_admin - INSERT/UPDATE only
via service role

------------------------------------------------------------------------

# 4. EDGE FUNCTION: backup-system

Responsibilities: 1. Validate JWT 2. Confirm role = super_admin 3. Check
no running backup exists 4. Insert backup_jobs (status='running',
trigger_type='manual') 5. Trigger GitHub workflow via REST API 6. Return
job_id immediately

Concurrency check: select exists (select 1 from backup_jobs where
status='running');

------------------------------------------------------------------------

# 5. GITHUB WORKFLOW

File: .github/workflows/backup.yml

Triggers: - workflow_dispatch (manual) - schedule: 0 3 \* \* 0 (Sunday
03:00 UTC)

Workflow steps: 1. Checkout repo 2. Install PostgreSQL client 3.
Generate UTC timestamp 4. Run pg_dump using SUPABASE_DB_URL 5. Archive
storage (excluding backups bucket) 6. Upload files to Supabase Storage
bucket 7. Compute total size 8. POST results to backup-callback Edge
Function

Callback payload example:

{ "job_id": "...", "status": "completed", "files": \[
{"type":"database","path":"...","size":12345},
{"type":"storage","path":"...","size":45678} \], "total_size":58023 }

If failure: status = "failed" include error_message

------------------------------------------------------------------------

# 6. EDGE FUNCTION: backup-callback

Responsibilities: 1. Validate BACKUP_CALLBACK_SECRET 2. Update
backup_jobs status 3. Insert backup_files records 4. Set completed_at 5.
Execute retention cleanup 6. Log metrics 7. Trigger CRITICAL alert on
failure

Retention: Delete backups older than 30 days. Remove both DB metadata
and storage folder.

------------------------------------------------------------------------

# 7. ADMIN UI

Route: /admin/backups\
Access: SuperAdmin only

Features: - Trigger backup button - Table of backup jobs - Status
indicators - Download via signed URLs (1 hour expiry) - Metrics summary

------------------------------------------------------------------------

# 8. SAFETY REQUIREMENTS

Must NOT: - Run pg_dump in Edge Function - Use pooled DB URL - Expose
restore endpoint - Make bucket public - Delete backups outside retention
policy - Expose service role to frontend

------------------------------------------------------------------------

# EXPECTED RESULT

-   Weekly automated full backup
-   Manual trigger capability
-   Secure metadata tracking
-   30-day retention enforcement
-   Fully restorable system
-   Observability and audit compliance
