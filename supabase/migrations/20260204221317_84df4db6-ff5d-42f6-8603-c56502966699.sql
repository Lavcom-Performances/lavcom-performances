-- TAEX-301: Complete DTS foundation with taxonomy

-- 1. Add allowed_bills to company_payment_config (if not exists)
ALTER TABLE company_payment_config 
ADD COLUMN IF NOT EXISTS allowed_bills numeric[] DEFAULT ARRAY[5, 10, 20, 50];

-- 2. Add operation_category to operations table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'operations' AND column_name = 'operation_category'
  ) THEN
    ALTER TABLE operations ADD COLUMN operation_category text;
  END IF;
END $$;

-- 3. Add operation_id to trust_line if missing (for foreign key)
ALTER TABLE trust_line 
ADD COLUMN IF NOT EXISTS operation_id uuid REFERENCES operations(id) ON DELETE CASCADE;

-- 4. Add occurred_at to trust_line for time-based checks
ALTER TABLE trust_line 
ADD COLUMN IF NOT EXISTS occurred_at timestamptz;

-- 5. Create index for efficient DTS lookups
CREATE INDEX IF NOT EXISTS idx_trust_line_company_operation 
ON trust_line(company_id, operation_id);

CREATE INDEX IF NOT EXISTS idx_trust_day_company_date 
ON trust_day(company_id, day);

CREATE INDEX IF NOT EXISTS idx_operations_category 
ON operations(operation_category) WHERE operation_category IS NOT NULL;

-- 6. Function to classify operation category based on description/machine
CREATE OR REPLACE FUNCTION classify_operation_category(
  p_description text,
  p_machine text DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_desc text;
BEGIN
  v_desc := LOWER(COALESCE(p_description, '') || ' ' || COALESCE(p_machine, ''));
  
  -- CYCLE_MACHINE: laundry machines
  IF v_desc ~ '(lave[\-\s]?linge|séchoir|sécheuse|dryer|washer|machine|kg)' THEN
    RETURN 'CYCLE';
  END IF;
  
  -- PRODUCT: detergent, softener, etc.
  IF v_desc ~ '(lessive|assouplissant|savon|produit|détergent|detergent|softener|soap)' THEN
    RETURN 'PRODUCT';
  END IF;
  
  -- OPTION: cycle options
  IF v_desc ~ '(prélavage|rinçage|séchage\s+(long|court)|démarrage|essorage|option|extra)' THEN
    RETURN 'OPTION';
  END IF;
  
  -- Default to CYCLE if unknown (most common)
  RETURN 'CYCLE';
END;
$$;

-- 7. Enhanced DTS scoring function with TAEX-301 rules
CREATE OR REPLACE FUNCTION compute_dts_for_import(
  p_company_id uuid,
  p_import_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config company_payment_config%ROWTYPE;
  v_op RECORD;
  v_score int;
  v_flags text[];
  v_is_blocking boolean;
  v_total_count int := 0;
  v_invalid_count int := 0;
  v_total_revenue numeric := 0;
  v_excluded_revenue numeric := 0;
  v_weighted_score numeric := 0;
  v_all_flags text[] := '{}';
  v_p99_threshold numeric;
BEGIN
  -- Get company payment config
  SELECT * INTO v_config 
  FROM company_payment_config 
  WHERE company_id = p_company_id
  LIMIT 1;
  
  -- Default cash_step if not configured
  IF v_config.cash_step IS NULL THEN
    v_config.cash_step := 0.10;
  END IF;
  
  -- Calculate P99 for outlier detection (last 30 days)
  SELECT PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY amount)
  INTO v_p99_threshold
  FROM operations
  WHERE site_id = p_company_id
    AND operation_date >= CURRENT_DATE - 30
    AND amount > 0;
  
  IF v_p99_threshold IS NULL THEN
    v_p99_threshold := 100; -- Default if no history
  END IF;
  
  -- Process each operation in the import batch
  FOR v_op IN
    SELECT o.*
    FROM operations o
    WHERE o.site_id = p_company_id
      AND o.import_batch_id = p_import_id
  LOOP
    v_score := 100;
    v_flags := '{}';
    v_is_blocking := false;
    v_total_count := v_total_count + 1;
    
    -- ⛔ B1: Invalid cash step for ESP/FI payments
    IF v_op.payment_mode IN ('ESP', 'FI') THEN
      IF v_config.cash_step > 0 AND MOD(v_op.amount * 100, v_config.cash_step * 100)::int != 0 THEN
        v_score := 0;
        v_flags := array_append(v_flags, 'INVALID_CASH_STEP');
        v_is_blocking := true;
      END IF;
    END IF;
    
    -- ⛔ B2: Amount <= 0
    IF v_op.amount <= 0 THEN
      v_score := 0;
      v_flags := array_append(v_flags, 'INVALID_AMOUNT');
      v_is_blocking := true;
    END IF;
    
    -- ⛔ B3: Invalid timestamp
    IF v_op.operation_date IS NULL THEN
      v_score := 0;
      v_flags := array_append(v_flags, 'INVALID_TIMESTAMP');
      v_is_blocking := true;
    END IF;
    
    -- Only apply non-blocking penalties if not already blocked
    IF NOT v_is_blocking THEN
      -- ⚠️ M1: Unknown machine (-20)
      IF v_op.machine IS NULL OR v_op.machine = '' THEN
        v_score := v_score - 20;
        v_flags := array_append(v_flags, 'UNKNOWN_MACHINE');
      END IF;
      
      -- ⚠️ M2: Possible duplicate (-30)
      IF EXISTS (
        SELECT 1 FROM operations o2
        WHERE o2.site_id = v_op.site_id
          AND o2.id != v_op.id
          AND o2.machine = v_op.machine
          AND o2.amount = v_op.amount
          AND o2.operation_date = v_op.operation_date
          AND (
            o2.operation_time IS NULL 
            OR v_op.operation_time IS NULL
            OR ABS(EXTRACT(EPOCH FROM (o2.operation_time - v_op.operation_time))) < 60
          )
        LIMIT 1
      ) THEN
        v_score := v_score - 30;
        v_flags := array_append(v_flags, 'POSSIBLE_DUPLICATE');
      END IF;
      
      -- ⚠️ M3: Price outlier (-25)
      IF v_op.amount > v_p99_threshold THEN
        v_score := v_score - 25;
        v_flags := array_append(v_flags, 'PRICE_OUTLIER');
      END IF;
      
      -- ℹ️ m1: Low metadata (-5)
      IF v_op.program IS NULL OR v_op.program = '' THEN
        v_score := v_score - 5;
        v_flags := array_append(v_flags, 'LOW_METADATA');
      END IF;
    END IF;
    
    -- Ensure score doesn't go negative
    v_score := GREATEST(0, v_score);
    
    -- Track statistics
    IF v_is_blocking THEN
      v_invalid_count := v_invalid_count + 1;
      v_excluded_revenue := v_excluded_revenue + COALESCE(v_op.amount, 0);
    ELSE
      v_total_revenue := v_total_revenue + COALESCE(v_op.amount, 0);
      v_weighted_score := v_weighted_score + (v_score * COALESCE(v_op.amount, 0));
    END IF;
    
    -- Collect all flags for summary
    v_all_flags := v_all_flags || v_flags;
    
    -- Insert/update trust_line
    INSERT INTO trust_line (
      company_id, 
      operation_id, 
      dts_score, 
      is_blocking_invalid, 
      flags,
      occurred_at
    ) VALUES (
      p_company_id,
      v_op.id,
      v_score,
      v_is_blocking,
      v_flags,
      v_op.operation_date::timestamptz + COALESCE(v_op.operation_time, '00:00:00'::time)
    )
    ON CONFLICT (company_id, operation_id) 
    DO UPDATE SET
      dts_score = EXCLUDED.dts_score,
      is_blocking_invalid = EXCLUDED.is_blocking_invalid,
      flags = EXCLUDED.flags,
      occurred_at = EXCLUDED.occurred_at,
      updated_at = now();
      
    -- Update operation category
    UPDATE operations 
    SET operation_category = classify_operation_category(program, machine)
    WHERE id = v_op.id AND operation_category IS NULL;
  END LOOP;
  
  -- Calculate aggregate DTS score
  DECLARE
    v_import_dts int;
    v_invalid_rate numeric;
    v_top_flags jsonb;
  BEGIN
    IF v_total_revenue > 0 THEN
      v_import_dts := (v_weighted_score / v_total_revenue)::int;
    ELSE
      v_import_dts := 0;
    END IF;
    
    v_invalid_rate := CASE WHEN v_total_count > 0 
      THEN (v_invalid_count::numeric / v_total_count * 100)
      ELSE 0 END;
    
    -- Apply aggregate penalties
    IF v_invalid_rate > 10 THEN
      v_import_dts := GREATEST(0, v_import_dts - 40);
    ELSIF v_invalid_rate > 5 THEN
      v_import_dts := GREATEST(0, v_import_dts - 25);
    END IF;
    
    -- Count flag occurrences
    SELECT jsonb_object_agg(flag, cnt)
    INTO v_top_flags
    FROM (
      SELECT unnest(v_all_flags) as flag, COUNT(*) as cnt
      FROM (SELECT v_all_flags) t
      GROUP BY flag
      ORDER BY cnt DESC
      LIMIT 10
    ) sub;
    
    -- Insert/update trust_import
    INSERT INTO trust_import (
      company_id,
      import_id,
      dts_score,
      invalid_rate,
      mapping_rate,
      duplicate_rate,
      top_flags
    ) VALUES (
      p_company_id,
      p_import_id,
      v_import_dts,
      v_invalid_rate,
      0, -- Will be calculated separately if needed
      (SELECT COUNT(*) FROM unnest(v_all_flags) f WHERE f = 'POSSIBLE_DUPLICATE')::numeric / NULLIF(v_total_count, 0) * 100,
      COALESCE(v_top_flags, '{}'::jsonb)
    )
    ON CONFLICT (company_id, import_id) 
    DO UPDATE SET
      dts_score = EXCLUDED.dts_score,
      invalid_rate = EXCLUDED.invalid_rate,
      duplicate_rate = EXCLUDED.duplicate_rate,
      top_flags = EXCLUDED.top_flags,
      updated_at = now();
    
    -- Update trust_day for affected dates
    INSERT INTO trust_day (company_id, day, dts_score, invalid_rate, excluded_revenue, top_flags)
    SELECT 
      p_company_id,
      o.operation_date,
      COALESCE(
        (SUM(CASE WHEN NOT tl.is_blocking_invalid THEN tl.dts_score * o.amount ELSE 0 END) / 
         NULLIF(SUM(CASE WHEN NOT tl.is_blocking_invalid THEN o.amount ELSE 0 END), 0))::int,
        0
      ),
      (COUNT(*) FILTER (WHERE tl.is_blocking_invalid))::numeric / NULLIF(COUNT(*), 0) * 100,
      SUM(CASE WHEN tl.is_blocking_invalid THEN o.amount ELSE 0 END),
      '{}'::jsonb
    FROM operations o
    JOIN trust_line tl ON tl.operation_id = o.id
    WHERE o.site_id = p_company_id
      AND o.import_batch_id = p_import_id
    GROUP BY o.operation_date
    ON CONFLICT (company_id, day)
    DO UPDATE SET
      dts_score = EXCLUDED.dts_score,
      invalid_rate = EXCLUDED.invalid_rate,
      excluded_revenue = EXCLUDED.excluded_revenue,
      updated_at = now();
    
    RETURN jsonb_build_object(
      'total_count', v_total_count,
      'invalid_count', v_invalid_count,
      'dts_score', v_import_dts,
      'invalid_rate', v_invalid_rate,
      'excluded_revenue', v_excluded_revenue,
      'top_flags', v_top_flags
    );
  END;
END;
$$;

-- 8. Add unique constraint for trust_line deduplication
ALTER TABLE trust_line 
DROP CONSTRAINT IF EXISTS trust_line_company_operation_unique;

ALTER TABLE trust_line
ADD CONSTRAINT trust_line_company_operation_unique 
UNIQUE (company_id, operation_id);

-- 9. Add unique constraint for trust_import
ALTER TABLE trust_import 
DROP CONSTRAINT IF EXISTS trust_import_company_import_unique;

ALTER TABLE trust_import
ADD CONSTRAINT trust_import_company_import_unique 
UNIQUE (company_id, import_id);

-- 10. Add unique constraint for trust_day
ALTER TABLE trust_day 
DROP CONSTRAINT IF EXISTS trust_day_company_day_unique;

ALTER TABLE trust_day
ADD CONSTRAINT trust_day_company_day_unique 
UNIQUE (company_id, day);