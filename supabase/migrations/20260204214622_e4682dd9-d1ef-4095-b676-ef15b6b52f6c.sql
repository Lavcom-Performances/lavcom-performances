-- TAEX-247: Knowledge Base + Rules Engine + Data Trust Score Schema

-- =====================================================
-- 1. KNOWLEDGE BASE TABLES
-- =====================================================

-- 1.1 kb_sources: Stores sources/references and default reliability
CREATE TABLE public.kb_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL CHECK (source_type IN ('manual', 'forum', 'manufacturer', 'internal', 'regulation', 'expert')),
  source_name TEXT NOT NULL,
  default_reliability_label TEXT NOT NULL CHECK (default_reliability_label IN ('EXPERT', 'TERRAIN', 'SYMPTOME')),
  notes_internal TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.2 kb_knowledge: Atomic knowledge records
CREATE TABLE public.kb_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  know_id TEXT UNIQUE NOT NULL,
  pillar TEXT NOT NULL CHECK (pillar IN ('Payment', 'Maintenance', 'UX', 'Marketing', 'Data', 'Operations')),
  sub_pillar TEXT,
  truth_type TEXT NOT NULL CHECK (truth_type IN ('technical', 'behavioral', 'marketing', 'data')),
  title_short TEXT NOT NULL,
  description_long TEXT NOT NULL,
  business_impact TEXT NOT NULL CHECK (business_impact IN ('CA', 'COST', 'UX', 'DOWNTIME', 'DATA_RELIABILITY')),
  urgency TEXT NOT NULL CHECK (urgency IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  source_id UUID REFERENCES public.kb_sources(id) ON DELETE SET NULL,
  reliability_label TEXT NOT NULL CHECK (reliability_label IN ('EXPERT', 'TERRAIN', 'SYMPTOME')),
  applicable_if JSONB,
  not_applicable_if JSONB,
  ai_usage TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'TO_CONFIRM' CHECK (status IN ('VALIDATED', 'TO_CONFIRM', 'MONITOR')),
  version INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.3 kb_knowledge_versions: Audit/history tracking
CREATE TABLE public.kb_knowledge_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_id UUID NOT NULL REFERENCES public.kb_knowledge(id) ON DELETE CASCADE,
  version INT NOT NULL,
  snapshot JSONB NOT NULL,
  change_summary TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.4 kb_faq: Public/pedagogical layer
CREATE TABLE public.kb_faq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faq_id TEXT UNIQUE NOT NULL,
  knowledge_id UUID REFERENCES public.kb_knowledge(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  answer_simple TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'public' CHECK (audience IN ('public', 'operator', 'project_owner')),
  tone TEXT NOT NULL DEFAULT 'neutral' CHECK (tone IN ('neutral', 'pedagogical')),
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.5 kb_rules: Rules engine entries
CREATE TABLE public.kb_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id TEXT UNIQUE NOT NULL,
  knowledge_id UUID REFERENCES public.kb_knowledge(id) ON DELETE SET NULL,
  trigger TEXT NOT NULL CHECK (trigger IN ('on_import', 'on_kpi_refresh', 'on_diagnostic')),
  conditions JSONB NOT NULL DEFAULT '{}',
  actions JSONB NOT NULL DEFAULT '{}',
  severity TEXT NOT NULL DEFAULT 'INFO' CHECK (severity IN ('INFO', 'WARNING', 'BLOCKING')),
  priority INT NOT NULL DEFAULT 50,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- 2. DATA TRUST SCORE TABLES
-- =====================================================

-- 2.1 company_payment_config: Payment configuration per company
CREATE TABLE public.company_payment_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  has_card BOOLEAN NOT NULL DEFAULT true,
  cash_step NUMERIC,
  accepted_denominations NUMERIC[],
  payment_stack TEXT CHECK (payment_stack IN ('LMControl', 'Wiline', 'CKSquare', 'Other')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- 2.2 trust_line: Per-operation trust scores
CREATE TABLE public.trust_line (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  operation_id UUID NOT NULL REFERENCES public.operations(id) ON DELETE CASCADE,
  import_id UUID REFERENCES public.import_batches(id) ON DELETE SET NULL,
  dts_score INT NOT NULL CHECK (dts_score >= 0 AND dts_score <= 100),
  is_blocking_invalid BOOLEAN NOT NULL DEFAULT false,
  flags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(operation_id)
);

-- 2.3 trust_import: Aggregate trust scores per import
CREATE TABLE public.trust_import (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  import_id UUID NOT NULL REFERENCES public.import_batches(id) ON DELETE CASCADE,
  dts_score INT NOT NULL CHECK (dts_score >= 0 AND dts_score <= 100),
  invalid_rate NUMERIC NOT NULL DEFAULT 0,
  mapping_rate NUMERIC NOT NULL DEFAULT 0,
  duplicate_rate NUMERIC NOT NULL DEFAULT 0,
  top_flags JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, import_id)
);

-- 2.4 trust_day: Daily aggregate trust scores
CREATE TABLE public.trust_day (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  dts_score INT NOT NULL CHECK (dts_score >= 0 AND dts_score <= 100),
  invalid_rate NUMERIC NOT NULL DEFAULT 0,
  excluded_revenue NUMERIC NOT NULL DEFAULT 0,
  top_flags JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, day)
);

-- =====================================================
-- 3. INDEXES
-- =====================================================

CREATE INDEX idx_kb_knowledge_pillar ON public.kb_knowledge(pillar);
CREATE INDEX idx_kb_knowledge_status ON public.kb_knowledge(status);
CREATE INDEX idx_kb_knowledge_active ON public.kb_knowledge(is_active);
CREATE INDEX idx_kb_knowledge_source ON public.kb_knowledge(source_id);
CREATE INDEX idx_kb_rules_trigger ON public.kb_rules(trigger);
CREATE INDEX idx_kb_rules_active ON public.kb_rules(is_active);
CREATE INDEX idx_kb_faq_published ON public.kb_faq(is_published);
CREATE INDEX idx_trust_line_company ON public.trust_line(company_id);
CREATE INDEX idx_trust_line_import ON public.trust_line(import_id);
CREATE INDEX idx_trust_line_blocking ON public.trust_line(is_blocking_invalid);
CREATE INDEX idx_trust_import_company ON public.trust_import(company_id);
CREATE INDEX idx_trust_day_company_day ON public.trust_day(company_id, day);

-- =====================================================
-- 4. UPDATE TRIGGERS
-- =====================================================

CREATE TRIGGER update_kb_sources_updated_at
  BEFORE UPDATE ON public.kb_sources
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_kb_knowledge_updated_at
  BEFORE UPDATE ON public.kb_knowledge
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_kb_faq_updated_at
  BEFORE UPDATE ON public.kb_faq
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_kb_rules_updated_at
  BEFORE UPDATE ON public.kb_rules
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_company_payment_config_updated_at
  BEFORE UPDATE ON public.company_payment_config
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_trust_line_updated_at
  BEFORE UPDATE ON public.trust_line
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_trust_import_updated_at
  BEFORE UPDATE ON public.trust_import
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_trust_day_updated_at
  BEFORE UPDATE ON public.trust_day
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- 5. ROW LEVEL SECURITY
-- =====================================================

-- KB tables: Admins can CRUD, authenticated users can read active/published
ALTER TABLE public.kb_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kb_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kb_knowledge_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kb_faq ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kb_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_payment_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_line ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_import ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_day ENABLE ROW LEVEL SECURITY;

-- KB Sources policies
CREATE POLICY "Platform admins can manage kb_sources"
  ON public.kb_sources FOR ALL
  USING (public.is_platform_admin());

CREATE POLICY "Authenticated users can read kb_sources"
  ON public.kb_sources FOR SELECT
  TO authenticated
  USING (true);

-- KB Knowledge policies
CREATE POLICY "Platform admins can manage kb_knowledge"
  ON public.kb_knowledge FOR ALL
  USING (public.is_platform_admin());

CREATE POLICY "Authenticated users can read active kb_knowledge"
  ON public.kb_knowledge FOR SELECT
  TO authenticated
  USING (is_active = true);

-- KB Knowledge Versions policies
CREATE POLICY "Platform admins can manage kb_knowledge_versions"
  ON public.kb_knowledge_versions FOR ALL
  USING (public.is_platform_admin());

CREATE POLICY "Authenticated users can read kb_knowledge_versions"
  ON public.kb_knowledge_versions FOR SELECT
  TO authenticated
  USING (true);

-- KB FAQ policies
CREATE POLICY "Platform admins can manage kb_faq"
  ON public.kb_faq FOR ALL
  USING (public.is_platform_admin());

CREATE POLICY "Authenticated users can read published kb_faq"
  ON public.kb_faq FOR SELECT
  TO authenticated
  USING (is_published = true);

-- KB Rules policies
CREATE POLICY "Platform admins can manage kb_rules"
  ON public.kb_rules FOR ALL
  USING (public.is_platform_admin());

CREATE POLICY "Authenticated users can read active kb_rules"
  ON public.kb_rules FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Company Payment Config policies
CREATE POLICY "Users can manage their own company_payment_config"
  ON public.company_payment_config FOR ALL
  USING (public.owns_site(company_id));

CREATE POLICY "Platform admins can manage all company_payment_config"
  ON public.company_payment_config FOR ALL
  USING (public.is_platform_admin());

-- Trust Line policies
CREATE POLICY "Users can read their own trust_line"
  ON public.trust_line FOR SELECT
  USING (public.owns_site(company_id));

CREATE POLICY "System can insert trust_line"
  ON public.trust_line FOR INSERT
  WITH CHECK (public.owns_site(company_id));

CREATE POLICY "Platform admins can manage all trust_line"
  ON public.trust_line FOR ALL
  USING (public.is_platform_admin());

-- Trust Import policies
CREATE POLICY "Users can read their own trust_import"
  ON public.trust_import FOR SELECT
  USING (public.owns_site(company_id));

CREATE POLICY "System can insert trust_import"
  ON public.trust_import FOR INSERT
  WITH CHECK (public.owns_site(company_id));

CREATE POLICY "Platform admins can manage all trust_import"
  ON public.trust_import FOR ALL
  USING (public.is_platform_admin());

-- Trust Day policies
CREATE POLICY "Users can read their own trust_day"
  ON public.trust_day FOR SELECT
  USING (public.owns_site(company_id));

CREATE POLICY "System can insert trust_day"
  ON public.trust_day FOR INSERT
  WITH CHECK (public.owns_site(company_id));

CREATE POLICY "Platform admins can manage all trust_day"
  ON public.trust_day FOR ALL
  USING (public.is_platform_admin());

-- =====================================================
-- 6. DTS SCORING FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.compute_dts_for_import(
  p_company_id UUID,
  p_import_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_config RECORD;
  v_op RECORD;
  v_score INT;
  v_flags TEXT[];
  v_is_blocking BOOLEAN;
  v_total_rows INT := 0;
  v_invalid_rows INT := 0;
  v_total_revenue NUMERIC := 0;
  v_excluded_revenue NUMERIC := 0;
  v_flag_counts JSONB := '{}';
  v_p99_amount NUMERIC;
BEGIN
  -- Get company payment config
  SELECT * INTO v_config
  FROM public.company_payment_config
  WHERE company_id = p_company_id;
  
  -- Get P99 amount for outlier detection (last 30 days)
  SELECT PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY amount)
  INTO v_p99_amount
  FROM public.operations
  WHERE site_id = p_company_id
    AND operation_date >= CURRENT_DATE - INTERVAL '30 days'
    AND amount > 0;
  
  -- Process each operation in the import
  FOR v_op IN
    SELECT o.*
    FROM public.operations o
    WHERE o.import_batch_id = p_import_id
      AND o.site_id = p_company_id
  LOOP
    v_total_rows := v_total_rows + 1;
    v_score := 100;
    v_flags := '{}';
    v_is_blocking := false;
    v_total_revenue := v_total_revenue + COALESCE(v_op.amount, 0);
    
    -- BLOCKING checks
    IF v_op.amount <= 0 THEN
      v_score := 0;
      v_is_blocking := true;
      v_flags := array_append(v_flags, 'INVALID_AMOUNT_ZERO');
    END IF;
    
    IF v_op.operation_date IS NULL THEN
      v_score := 0;
      v_is_blocking := true;
      v_flags := array_append(v_flags, 'INVALID_DATE');
    END IF;
    
    -- Cash step validation (only for non-CB)
    IF v_score > 0 AND UPPER(v_op.payment_mode) != 'CB' AND v_config.cash_step IS NOT NULL THEN
      IF MOD(v_op.amount * 100, v_config.cash_step * 100) > 0.01 THEN
        v_score := 0;
        v_is_blocking := true;
        v_flags := array_append(v_flags, 'INVALID_CASH_STEP');
      END IF;
    END IF;
    
    -- MAJOR penalties (only if not already blocking)
    IF v_score > 0 THEN
      -- Unknown payment mode
      IF v_op.payment_mode IS NULL OR v_op.payment_mode = '' THEN
        v_score := v_score - 25;
        v_flags := array_append(v_flags, 'UNKNOWN_PAYMENT_MODE');
      END IF;
      
      -- Unknown machine
      IF v_op.machine IS NULL OR v_op.machine = '' THEN
        v_score := v_score - 20;
        v_flags := array_append(v_flags, 'UNKNOWN_MACHINE');
      END IF;
      
      -- Outlier amount
      IF v_p99_amount IS NOT NULL AND v_op.amount > v_p99_amount * 1.5 THEN
        v_score := v_score - 25;
        v_flags := array_append(v_flags, 'OUTLIER_AMOUNT');
      END IF;
      
      -- Payment capability conflict
      IF v_config.has_card = false AND UPPER(v_op.payment_mode) = 'CB' THEN
        v_score := v_score - 25;
        v_flags := array_append(v_flags, 'PAYMENT_CAPABILITY_CONFLICT');
      END IF;
    END IF;
    
    -- MINOR penalties
    IF v_score > 0 THEN
      IF v_op.operation_time IS NULL THEN
        v_score := v_score - 5;
        v_flags := array_append(v_flags, 'MISSING_TIME');
      END IF;
    END IF;
    
    -- Ensure score doesn't go below 0
    v_score := GREATEST(v_score, 0);
    
    -- Track invalid rows and excluded revenue
    IF v_is_blocking THEN
      v_invalid_rows := v_invalid_rows + 1;
      v_excluded_revenue := v_excluded_revenue + COALESCE(v_op.amount, 0);
    END IF;
    
    -- Count flags
    FOR i IN 1..array_length(v_flags, 1) LOOP
      IF v_flag_counts ? v_flags[i] THEN
        v_flag_counts := jsonb_set(v_flag_counts, ARRAY[v_flags[i]], to_jsonb((v_flag_counts->>v_flags[i])::int + 1));
      ELSE
        v_flag_counts := jsonb_set(v_flag_counts, ARRAY[v_flags[i]], '1');
      END IF;
    END LOOP;
    
    -- Upsert trust_line
    INSERT INTO public.trust_line (company_id, operation_id, import_id, dts_score, is_blocking_invalid, flags)
    VALUES (p_company_id, v_op.id, p_import_id, v_score, v_is_blocking, v_flags)
    ON CONFLICT (operation_id) DO UPDATE SET
      dts_score = EXCLUDED.dts_score,
      is_blocking_invalid = EXCLUDED.is_blocking_invalid,
      flags = EXCLUDED.flags,
      updated_at = now();
  END LOOP;
  
  -- Calculate aggregate score (amount-weighted)
  DECLARE
    v_agg_score INT;
    v_invalid_rate NUMERIC;
    v_top_flags JSONB;
  BEGIN
    SELECT COALESCE(
      SUM(tl.dts_score * o.amount) / NULLIF(SUM(o.amount), 0),
      0
    )::INT
    INTO v_agg_score
    FROM public.trust_line tl
    JOIN public.operations o ON o.id = tl.operation_id
    WHERE tl.import_id = p_import_id;
    
    v_invalid_rate := CASE WHEN v_total_rows > 0 THEN v_invalid_rows::NUMERIC / v_total_rows ELSE 0 END;
    
    -- Get top 10 flags
    SELECT jsonb_agg(row_to_json(f))
    INTO v_top_flags
    FROM (
      SELECT key as flag, value::int as count
      FROM jsonb_each_text(v_flag_counts)
      ORDER BY value::int DESC
      LIMIT 10
    ) f;
    
    -- Upsert trust_import
    INSERT INTO public.trust_import (company_id, import_id, dts_score, invalid_rate, mapping_rate, duplicate_rate, top_flags)
    VALUES (p_company_id, p_import_id, v_agg_score, v_invalid_rate, 0, 0, COALESCE(v_top_flags, '[]'))
    ON CONFLICT (company_id, import_id) DO UPDATE SET
      dts_score = EXCLUDED.dts_score,
      invalid_rate = EXCLUDED.invalid_rate,
      top_flags = EXCLUDED.top_flags,
      updated_at = now();
    
    -- Update trust_day for affected dates
    INSERT INTO public.trust_day (company_id, day, dts_score, invalid_rate, excluded_revenue, top_flags)
    SELECT 
      p_company_id,
      o.operation_date,
      COALESCE(AVG(tl.dts_score)::INT, 0),
      COALESCE(SUM(CASE WHEN tl.is_blocking_invalid THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(*), 0), 0),
      COALESCE(SUM(CASE WHEN tl.is_blocking_invalid THEN o.amount ELSE 0 END), 0),
      '[]'::jsonb
    FROM public.operations o
    JOIN public.trust_line tl ON tl.operation_id = o.id
    WHERE o.import_batch_id = p_import_id
    GROUP BY o.operation_date
    ON CONFLICT (company_id, day) DO UPDATE SET
      dts_score = EXCLUDED.dts_score,
      invalid_rate = EXCLUDED.invalid_rate,
      excluded_revenue = EXCLUDED.excluded_revenue,
      updated_at = now();
    
    RETURN jsonb_build_object(
      'success', true,
      'total_rows', v_total_rows,
      'invalid_rows', v_invalid_rows,
      'aggregate_score', v_agg_score,
      'invalid_rate', v_invalid_rate,
      'excluded_revenue', v_excluded_revenue,
      'top_flags', v_top_flags
    );
  END;
END;
$$;

-- =====================================================
-- 7. KNOWLEDGE VERSION TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION public.kb_knowledge_version_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- On update, save the OLD version to history
  IF TG_OP = 'UPDATE' AND OLD.version != NEW.version THEN
    INSERT INTO public.kb_knowledge_versions (knowledge_id, version, snapshot, change_summary, created_by)
    VALUES (
      OLD.id,
      OLD.version,
      to_jsonb(OLD),
      'Version ' || OLD.version || ' archived',
      NEW.created_by
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER kb_knowledge_version_on_update
  AFTER UPDATE ON public.kb_knowledge
  FOR EACH ROW
  EXECUTE FUNCTION public.kb_knowledge_version_trigger();