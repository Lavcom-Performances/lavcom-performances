-- TAEX-227: Performance Indexes for Dashboard/Operations
-- Add composite indexes for optimized queries

-- Operations table indexes
CREATE INDEX IF NOT EXISTS idx_operations_site_date ON public.operations(site_id, operation_date DESC);
CREATE INDEX IF NOT EXISTS idx_operations_site_source_date ON public.operations(site_id, source, operation_date DESC);
CREATE INDEX IF NOT EXISTS idx_operations_site_date_payment ON public.operations(site_id, operation_date DESC, payment_mode);

-- Analytics daily index
CREATE INDEX IF NOT EXISTS idx_analytics_daily_site_date ON public.analytics_daily(site_id, date DESC);

-- Import batches index
CREATE INDEX IF NOT EXISTS idx_import_batches_site_created ON public.import_batches(site_id, created_at DESC);

-- System events index for performance monitoring
CREATE INDEX IF NOT EXISTS idx_system_events_source_created ON public.system_events(source, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_events_source_severity ON public.system_events(source, severity, created_at DESC);