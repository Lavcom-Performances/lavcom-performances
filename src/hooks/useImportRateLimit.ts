import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { 
  validateCSVFile, 
  validateLineCount, 
  formatCooldown,
  CSV_MAX_SIZE_BYTES,
  CSV_MAX_LINES 
} from "@/lib/rateLimiter";

interface RateLimitCheckResult {
  allowed: boolean;
  error?: string;
  cooldownSeconds?: number;
  cooldownFormatted?: string;
}

interface FileValidationResult {
  valid: boolean;
  error?: string;
  errorKey?: string;
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
          error: "Session expirée. Veuillez vous reconnecter." 
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
          
          const cooldownSeconds = errorData?.cooldown_seconds || 120;
          const cooldownFormatted = formatCooldown(cooldownSeconds);
          
          // Determine if it's site or user rate limit
          const scope = errorData?.scope || "import/csv-site";
          const errorKey = scope === "import/csv-user" 
            ? "frequencyErrorUser" 
            : "frequencyErrorSite";

          return {
            allowed: false,
            error: t(`csvImport.${errorKey}`, { time: cooldownFormatted }),
            cooldownSeconds,
            cooldownFormatted
          };
        }

        console.error("Rate limit check error:", error);
        // Fail open on other errors
        return { allowed: true };
      }

      return { 
        allowed: data?.allowed ?? true 
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

  // Show file validation error (size/lines)
  const showFileError = useCallback((errorKey: string) => {
    const message = t(`csvImport.${errorKey}`);
    const suggestion = t("csvImport.suggestion");

    toast({
      title: errorKey === "fileSizeError" 
        ? t("csvImport.fileSizeError").split(".")[0] 
        : t("csvImport.maxLinesError").split(".")[0],
      description: `${message}`,
      variant: "destructive"
    });

    return message;
  }, [t, toast]);

  return {
    validateFile,
    validateLines,
    checkRateLimit,
    showValidationError,
    showFileError,
    isChecking,
    limits: {
      maxSizeBytes: CSV_MAX_SIZE_BYTES,
      maxSizeMB: 20,
      maxLines: CSV_MAX_LINES
    }
  };
}
