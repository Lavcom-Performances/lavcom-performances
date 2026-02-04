/**
 * TAEX-245: Canonical Operations Import Hook
 * 
 * Unified import hook that uses the adapter architecture to handle
 * multiple CSV providers with consistent business rules.
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAnalyticsRefresh } from "@/hooks/useAnalyticsRefresh";
import { buildDedupeKeyHashed } from "@/lib/csv/buildDedupeKey";
import { round2 } from "@/lib/csv/businessRules";
import {
  CanonicalTransaction,
  CsvProvider,
  SiteProviderConfig,
  CanonicalImportResult,
  adapterRegistry,
  validateCsvForSite,
  getProviderDisplayName,
} from "@/lib/csv/adapters";

/**
 * Chunk an array into smaller arrays
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Convert canonical transaction to database operation
 */
function canonicalToDbOperation(
  tx: CanonicalTransaction,
  userId: string,
  siteId: string,
  batchId: string
): Record<string, unknown> {
  // Convert cents to euros
  const amountEur = round2(tx.price_cents / 100);
  const insertedEur = tx.inserted_cents !== null ? round2(tx.inserted_cents / 100) : null;
  const priceEur = round2(tx.price_cents / 100);
  const changeEur = tx.change_cents !== null ? round2(tx.change_cents / 100) : null;
  const priceCb = tx.price_cb_cents > 0 ? round2(tx.price_cb_cents / 100) : null;
  const priceEsp = tx.price_esp_cents > 0 ? round2(tx.price_esp_cents / 100) : null;
  const priceFi = tx.price_fi_cents > 0 ? round2(tx.price_fi_cents / 100) : null;

  // Build dedupe key
  const dedupeKey = tx.raw_source_id
    ? buildDedupeKeyHashed({
        siteId,
        operationDate: tx.date_local || '',
        operationTime: tx.time_local,
        paymentMode: tx.payment_mode,
        type: tx.category,
        priceCb,
        priceEsp,
        amount: amountEur,
      })
    : buildDedupeKeyHashed({
        siteId,
        operationDate: tx.date_local || '',
        operationTime: tx.time_local,
        paymentMode: tx.payment_mode,
        type: tx.category,
        priceCb,
        priceEsp,
        amount: amountEur,
      });

  return {
    user_id: userId,
    site_id: siteId,
    operation_date: tx.date_local,
    operation_time: tx.time_local,
    amount: amountEur,
    machine: tx.display_label,
    machine_name: tx.machine_label,
    program: tx.category,
    payment_mode: tx.payment_mode,
    inserted_eur: insertedEur,
    price_eur: priceEur,
    change_eur: changeEur,
    price_cb: priceCb,
    price_esp: priceEsp,
    price_fi: priceFi,
    type: tx.category,
    source: tx.provider,
    import_batch_id: batchId,
    dedupe_key: dedupeKey,
    raw_data: { original: tx.raw_payload },
    raw: {
      ...tx.raw_payload,
      validation_warnings: tx.validation_warnings,
    },
  };
}

export interface CanonicalImportOptions {
  /** Skip provider validation (for unknown providers) */
  skipProviderValidation?: boolean;
  /** Only import selected transactions */
  selectedOnly?: boolean;
}

export function useCanonicalImport() {
  const { user } = useAuth();
  const [isImporting, setIsImporting] = useState(false);
  const { refreshWithNotification } = useAnalyticsRefresh();

  /**
   * Parse CSV file using the appropriate adapter
   */
  const parseFile = useCallback((
    filename: string,
    content: string,
    siteConfig: SiteProviderConfig
  ): CanonicalTransaction[] => {
    const adapter = adapterRegistry.getAdapter(siteConfig.provider);
    
    if (!adapter) {
      // Try to auto-detect
      const detected = adapterRegistry.detectAdapter(
        content.split('\n')[0]?.split(/[,;]/) || []
      );
      
      if (detected) {
        return detected.parse(filename, content, siteConfig);
      }
      
      console.warn(`[CanonicalImport] No adapter found for provider: ${siteConfig.provider}`);
      return [];
    }
    
    return adapter.parse(filename, content, siteConfig);
  }, []);

  /**
   * Validate CSV file against site's configured provider
   */
  const validateFile = useCallback((
    content: string,
    siteProvider: CsvProvider
  ): { valid: boolean; errorMessage: string | null } => {
    return validateCsvForSite(content, siteProvider);
  }, []);

  /**
   * Import canonical transactions to database
   */
  const importTransactions = useCallback(
    async (
      siteId: string,
      filename: string,
      transactions: CanonicalTransaction[],
      options: CanonicalImportOptions = {}
    ): Promise<CanonicalImportResult> => {
      if (!user) {
        return {
          success: false,
          imported_count: 0,
          ignored_count: transactions.length,
          duplicate_count: 0,
          errors: ["Utilisateur non connecté"],
          warnings: [],
          by_payment_mode: { cb_count: 0, esp_count: 0, fi_count: 0, unknown_count: 0 },
          date_range: { min: null, max: null },
          provider_detected: 'unknown',
          provider_mismatch_warning: false,
        };
      }

      setIsImporting(true);

      try {
        // Filter by selection and validation status
        const selectedTx = options.selectedOnly
          ? transactions.filter(tx => tx.selected)
          : transactions.filter(tx => tx.validation_status !== 'invalid');

        if (selectedTx.length === 0) {
          return {
            success: false,
            imported_count: 0,
            ignored_count: transactions.length,
            duplicate_count: 0,
            errors: ["Aucune ligne valide à importer"],
            warnings: [],
            by_payment_mode: { cb_count: 0, esp_count: 0, fi_count: 0, unknown_count: 0 },
            date_range: { min: null, max: null },
            provider_detected: transactions[0]?.provider || 'unknown',
            provider_mismatch_warning: false,
          };
        }

        // Create import batch record
        const { data: batch, error: batchError } = await supabase
          .from("import_batches")
          .insert({
            user_id: user.id,
            site_id: siteId,
            filename,
            total_rows: transactions.length,
            imported_rows: selectedTx.length,
            ignored_rows: transactions.length - selectedTx.length,
          })
          .select()
          .single();

        if (batchError) {
          console.error("Error creating import batch:", batchError);
          throw new Error("Erreur lors de la création du batch d'import");
        }

        // Convert to database operations
        const operations = selectedTx.map(tx => 
          canonicalToDbOperation(tx, user.id, siteId, batch.id)
        );

        // Insert in batches
        const BATCH_SIZE = 500;
        let insertedCount = 0;
        let duplicatesIgnored = 0;
        const errors: string[] = [];

        const chunks = chunkArray(operations, BATCH_SIZE);

        for (const chunk of chunks) {
          const countBefore = await supabase
            .from("operations")
            .select("id", { count: "exact", head: true })
            .eq("site_id", siteId);

          const { error: upsertError } = await supabase
            .from("operations")
            .upsert(chunk as any[], {
              onConflict: "site_id,dedupe_key",
              ignoreDuplicates: true,
            });

          if (upsertError) {
            console.error("Error upserting operations chunk:", upsertError);
            errors.push(`Erreur: ${upsertError.message}`);
          } else {
            const countAfter = await supabase
              .from("operations")
              .select("id", { count: "exact", head: true })
              .eq("site_id", siteId);

            const actualInserted = (countAfter.count || 0) - (countBefore.count || 0);
            insertedCount += actualInserted;
            duplicatesIgnored += chunk.length - actualInserted;
          }
        }

        // Update batch with actual counts
        const actualIgnored = transactions.length - insertedCount;
        if (insertedCount !== selectedTx.length || duplicatesIgnored > 0) {
          await supabase
            .from("import_batches")
            .update({
              imported_rows: insertedCount,
              ignored_rows: actualIgnored,
            })
            .eq("id", batch.id);
        }

        // Calculate statistics
        const byMode = {
          cb_count: selectedTx.filter(tx => tx.payment_mode === 'CB').length,
          esp_count: selectedTx.filter(tx => tx.payment_mode === 'ESP').length,
          fi_count: selectedTx.filter(tx => tx.payment_mode === 'FI').length,
          unknown_count: selectedTx.filter(tx => !tx.payment_mode).length,
        };

        const dates = selectedTx
          .map(tx => tx.date_local)
          .filter((d): d is string => d !== null)
          .sort();

        // Build result messages
        const warnings: string[] = [];
        const invalidCount = transactions.filter(tx => tx.validation_status === 'invalid').length;
        if (invalidCount > 0) {
          warnings.push(`${invalidCount} lignes ignorées (données invalides)`);
        }
        if (duplicatesIgnored > 0) {
          warnings.push(`${duplicatesIgnored} doublons ignorés`);
        }

        // Trigger analytics refresh
        if (insertedCount > 0) {
          refreshWithNotification(siteId, insertedCount).catch((err) => {
            console.warn("Analytics refresh failed:", err);
          });
        }

        return {
          success: insertedCount > 0,
          imported_count: insertedCount,
          ignored_count: actualIgnored - duplicatesIgnored,
          duplicate_count: duplicatesIgnored,
          errors,
          warnings,
          by_payment_mode: byMode,
          date_range: {
            min: dates[0] || null,
            max: dates[dates.length - 1] || null,
          },
          provider_detected: transactions[0]?.provider || 'unknown',
          provider_mismatch_warning: false,
        };
      } catch (err) {
        console.error("Import error:", err);
        return {
          success: false,
          imported_count: 0,
          ignored_count: transactions.length,
          duplicate_count: 0,
          errors: [err instanceof Error ? err.message : "Erreur inconnue"],
          warnings: [],
          by_payment_mode: { cb_count: 0, esp_count: 0, fi_count: 0, unknown_count: 0 },
          date_range: { min: null, max: null },
          provider_detected: 'unknown',
          provider_mismatch_warning: false,
        };
      } finally {
        setIsImporting(false);
      }
    },
    [user, refreshWithNotification]
  );

  return {
    parseFile,
    validateFile,
    importTransactions,
    isImporting,
    getProviderDisplayName,
  };
}
