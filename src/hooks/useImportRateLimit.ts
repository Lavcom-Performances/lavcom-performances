import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { 
  validateCSVFile, 
  validateLineCount,
  validateFilesCount,
  formatCooldown,
  CSV_MAX_SIZE_BYTES,
  CSV_MAX_SIZE_MB,
  CSV_MAX_LINES,
  CSV_MAX_FILES_PER_BATCH,
  DAILY_IMPORT_BATCHES_PER_SITE,
  HOURLY_IMPORT_BATCHES_PER_SITE,
} from "@/lib/rateLimiter";

interface RateLimitCheckResult {
  allowed: boolean;
  error?: string;
  cooldownSeconds?: number;
  cooldownFormatted?: string;
  remaining?: { hourly: number; daily: number };
}

interface FileValidationResult {
  valid: boolean;
  error?: string;
  errorKey?: string;
}

// TAEX-197: Log validation errors to system_events
async function logValidationError(
  siteId: string,
  filename: string,
  reason: string,
  details?: Record<string, unknown>
) {
  try {
    await supabase.functions.invoke("import-csv-check", {
      body: { 
        site_id: siteId, 
        filename,
        validation_error: { reason, details }
      }
    });
  } catch (err) {
    console.error("Failed to log validation error:", err);
  }
}

export function useImportRateLimit() {
  const { toast } = useToast();
  const { t } = useTranslation("app");
  const [isChecking, setIsChecking] = useState(false);

  // Validate file size and extension (client-side, instant)
  const validateFile = useCallback((file: File): FileValidationResult => {
    const result = validateCSVFile(file);
    if (!result.valid) {
      return {
        valid: false,
        error: t(`csvImport.${result.error}`),
        errorKey: result.error
      };
    }
    return { valid: true };
  }, [t]);

  // Validate line count after parsing (client-side)
  const validateLines = useCallback((lineCount: number): FileValidationResult => {
    const result = validateLineCount(lineCount);
    if (!result.valid) {
      return {
        valid: false,
        error: t(`csvImport.${result.error}`),
        errorKey: result.error
      };
    }
    return { valid: true };
  }, [t]);

  // Validate file count in batch (TAEX-197)
  const validateFilesInBatch = useCallback((count: number): FileValidationResult => {
    const result = validateFilesCount(count);
    if (!result.valid) {
      return {
        valid: false,
        error: t(`csvImport.maxFilesError`),
        errorKey: result.error
      };
    }
    return { valid: true };
  }, [t]);

  // Check server-side rate limit before import
  const checkRateLimit = useCallback(async (
    siteId: string, 
    filename?: string
  ): Promise<RateLimitCheckResult> => {
    setIsChecking(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { 
          allowed: false, 
          error: t("csvImport.sessionExpired")
        };
      }

      const { data, error } = await supabase.functions.invoke("import-csv-check", {
        body: { site_id: siteId, filename }
      });

      if (error) {
        // Handle rate limit response (429)
        if (error.message?.includes("429") || (error as any).status === 429) {
          const errorData = typeof error === 'object' && 'context' in error 
            ? (error as any).context 
            : null;
          
          const cooldownSeconds = errorData?.cooldown_seconds || 3600;
          const cooldownFormatted = formatCooldown(cooldownSeconds);
          
          // Determine message based on scope
          const messageKey = errorData?.message_key || 'csvImport.rateLimitGeneric';
          const errorKey = messageKey.includes('Hourly') 
            ? 'rateLimitHourly' 
            : messageKey.includes('Daily') 
              ? 'rateLimitDaily' 
              : 'frequencyErrorSite';

          return {
            allowed: false,
            error: t(`csvImport.${errorKey}`, { time: cooldownFormatted }),
            cooldownSeconds,
            cooldownFormatted,
            remaining: errorData?.remaining
          };
        }

        console.error("Rate limit check error:", error);
        // Fail open on other errors
        return { allowed: true };
      }

      return { 
        allowed: data?.allowed ?? true,
        remaining: data?.remaining
      };
    } catch (err) {
      console.error("Rate limit check failed:", err);
      // Fail open on network errors
      return { allowed: true };
    } finally {
      setIsChecking(false);
    }
  }, [t]);

  // Show validation error toast + return inline message
  const showValidationError = useCallback((
    errorKey: string, 
    cooldownFormatted?: string
  ) => {
    const message = cooldownFormatted 
      ? t(`csvImport.${errorKey}`, { time: cooldownFormatted })
      : t(`csvImport.${errorKey}`);

    toast({
      title: t("rateLimit.import_csv.title"),
      description: message,
      variant: "destructive"
    });

    return message;
  }, [t, toast]);

  // Show file validation error (size/lines/files) + log to system_events
  const showFileError = useCallback((errorKey: string, siteId?: string, filename?: string) => {
    const message = t(`csvImport.${errorKey}`);

    toast({
      title: t(`csvImport.${errorKey}`).split(".")[0],
      description: message,
      variant: "destructive"
    });

    // TAEX-197: Log to system_events if we have site context
    if (siteId) {
      logValidationError(siteId, filename || 'unknown', errorKey, {
        error_type: errorKey,
        max_size_mb: CSV_MAX_SIZE_MB,
        max_lines: CSV_MAX_LINES,
        max_files: CSV_MAX_FILES_PER_BATCH
      });
    }

    return message;
  }, [t, toast]);

  return {
    validateFile,
    validateLines,
    validateFilesInBatch,
    checkRateLimit,
    showValidationError,
    showFileError,
    logValidationError,
    isChecking,
    limits: {
      maxSizeBytes: CSV_MAX_SIZE_BYTES,
      maxSizeMB: CSV_MAX_SIZE_MB,
      maxLines: CSV_MAX_LINES,
      maxFiles: CSV_MAX_FILES_PER_BATCH,
      hourlyImports: HOURLY_IMPORT_BATCHES_PER_SITE,
      dailyImports: DAILY_IMPORT_BATCHES_PER_SITE
    }
  };
}