/**
 * Multi-format import hook - TAEX-180
 * 
 * Handles import of operations from multiple CSV formats (LM Control, WiLine, Events)
 * into the canonical operations schema.
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { buildDedupeKeyHashed, buildWiLineDedupeKey } from "@/lib/csv/buildDedupeKey";
import { normMode, round2 } from "@/lib/csv/businessRules";
import { useAnalyticsRefresh } from "@/hooks/useAnalyticsRefresh";
import { MultiCsvParsedRow } from "@/lib/csv/multiCsvTypes";
import { centsToEuros } from "@/lib/csv/parseAmount";

export interface MultiFormatImportResult {
  success: boolean;
  imported: number;
  ignored: number;
  duplicates: number;
  errors: string[];
  mixedPaymentsWarned: number;
}

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

export function useMultiFormatImport() {
  const { user } = useAuth();
  const [isImporting, setIsImporting] = useState(false);
  const { refreshWithNotification } = useAnalyticsRefresh();

  const importMultiFormatRows = useCallback(
    async (
      siteId: string,
      filename: string,
      rows: MultiCsvParsedRow[]
    ): Promise<MultiFormatImportResult> => {
      if (!user) {
        return {
          success: false,
          imported: 0,
          ignored: 0,
          duplicates: 0,
          errors: ["Utilisateur non connecté"],
          mixedPaymentsWarned: 0,
        };
      }

      setIsImporting(true);

      try {
        const selectedRows = rows.filter(r => r.selected);
        
        if (selectedRows.length === 0) {
          return {
            success: false,
            imported: 0,
            ignored: rows.length,
            duplicates: 0,
            errors: ["Aucune ligne sélectionnée"],
            mixedPaymentsWarned: 0,
          };
        }

        // Create import batch record
        const { data: batch, error: batchError } = await supabase
          .from("import_batches")
          .insert({
            user_id: user.id,
            site_id: siteId,
            filename,
            total_rows: rows.length,
            imported_rows: selectedRows.length,
            ignored_rows: rows.length - selectedRows.length,
          })
          .select()
          .single();

        if (batchError) {
          console.error("Error creating import batch:", batchError);
          throw new Error("Erreur lors de la création du batch d'import");
        }

        let mixedPaymentsWarned = 0;

        // Build operations for insert
        const operations = selectedRows.map((row) => {
          const isWiLine = row.provider === 'wiline' || row.detected_type === 'wiline';
          
          const dateStr = row.date_iso || '';
          const time = row.time || null;
          
          // For WiLine, use the pre-computed breakdown
          // For other formats, compute from amount_cents and mode
          let priceCb: number | null = null;
          let priceEsp: number | null = null;
          let priceFi: number | null = null;
          let amountEur: number;
          
          if (isWiLine && row.prix_cb_cents !== undefined) {
            // WiLine format with pre-computed breakdown
            priceCb = row.prix_cb_cents > 0 ? round2(row.prix_cb_cents / 100) : null;
            priceEsp = row.prix_esp_cents && row.prix_esp_cents > 0 ? round2(row.prix_esp_cents / 100) : null;
            priceFi = row.prix_fi_cents && row.prix_fi_cents > 0 ? round2(row.prix_fi_cents / 100) : null;
            amountEur = row.amount_cents ? round2(row.amount_cents / 100) : 0;
            
            // Log mixed payment warning
            if (row.is_mixed_payment) {
              mixedPaymentsWarned++;
            }
          } else {
            // Standard format - compute from amount and mode
            const amountCents = row.amount_cents || 0;
            amountEur = round2(amountCents / 100);
            
            const mode = normMode(row.normalized_mode);
            if (mode === 'CB') {
              priceCb = amountEur > 0 ? amountEur : null;
            } else if (mode === 'ESP') {
              priceEsp = amountEur > 0 ? amountEur : null;
            } else if (mode === 'FI') {
              priceFi = amountEur > 0 ? amountEur : null;
            }
          }
          
          // Use pre-computed dedupe_key from parseUnified when available
          let dedupeKey: string;
          if (row.dedupe_key) {
            dedupeKey = row.dedupe_key;
          } else if (isWiLine && row.transaction_no) {
            // Fallback: WiLine dedupe key
            dedupeKey = buildWiLineDedupeKey({
              siteId,
              transactionNo: row.transaction_no,
            });
          } else {
            // Fallback: standard dedupe key
            dedupeKey = buildDedupeKeyHashed({
              siteId,
              operationDate: dateStr,
              operationTime: time,
              paymentMode: row.normalized_mode || null,
              type: row.operation_type || row.type_raw || null,
              priceCb,
              priceEsp,
              amount: amountEur,
            });
          }
          
          // Build operation record
          const operation: Record<string, unknown> = {
            user_id: user.id,
            site_id: siteId,
            operation_date: dateStr,
            operation_time: time,
            amount: amountEur,
            machine: row.machine || null,
            program: row.program || null,
            payment_mode: row.normalized_mode || null,
            raw_data: { original: row.raw_data },
            import_batch_id: batch.id,
            dedupe_key: dedupeKey,
            price_cb: priceCb,
            price_esp: priceEsp,
            type: row.operation_type || row.type_raw || null,
            source: isWiLine ? 'wiline' : (row.detected_type || 'csv'),
          };
          
          // Add extended fields
          if (row.inserted_cents) {
            operation.inserted_eur = round2(row.inserted_cents / 100);
          }
          if (row.price_cents) {
            operation.price_eur = round2(row.price_cents / 100);
          }
          if (row.change_cents) {
            operation.change_eur = round2(row.change_cents / 100);
          }
          if (row.machine_name) {
            operation.machine_name = row.machine_name;
          }
          
          // Store WiLine metadata
          if (isWiLine && row.metadata_raw) {
            operation.raw = {
              wiline: row.metadata_raw,
              external_id: row.external_id,
              revenue_included: row.revenue_included,
            };
          }
          
          return operation;
        });

        // Log mixed payments warning to system_events if any
        if (mixedPaymentsWarned > 0) {
          try {
            await supabase.rpc('rpc_log_system_event', {
              p_source: 'import-wiline',
              p_severity: 'warning',
              p_code: 'mixed_payment_detected',
              p_message: `${mixedPaymentsWarned} lignes avec paiement mixte détectées`,
              p_env: 'production',
              p_meta: { count: mixedPaymentsWarned, filename },
            });
          } catch (e) {
            console.warn('Failed to log mixed payment warning:', e);
          }
        }

        // Insert operations in batches
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
        const actualIgnored = rows.length - insertedCount;
        if (insertedCount !== selectedRows.length || duplicatesIgnored > 0) {
          await supabase
            .from("import_batches")
            .update({ 
              imported_rows: insertedCount,
              ignored_rows: actualIgnored
            })
            .eq("id", batch.id);
        }

        // Build result messages
        const resultMessages: string[] = [];
        const invalidRows = rows.filter(r => !r.selected);
        if (invalidRows.length > 0) {
          resultMessages.push(`${invalidRows.length} lignes ignorées (non sélectionnées)`);
        }
        if (duplicatesIgnored > 0) {
          resultMessages.push(`${duplicatesIgnored} doublons ignorés`);
        }
        if (mixedPaymentsWarned > 0) {
          resultMessages.push(`${mixedPaymentsWarned} paiements mixtes (traités en CB)`);
        }
        if (errors.length > 0) {
          resultMessages.push(...errors);
        }

        // Trigger analytics refresh and DTS scoring
        if (insertedCount > 0) {
          refreshWithNotification(siteId, insertedCount).catch((err) => {
            console.warn("Analytics refresh failed:", err);
          });
          
          // TAEX-301: Trigger DTS scoring in background
          supabase.rpc('compute_dts_for_import', {
            p_company_id: siteId,
            p_import_id: batch.id
          }).then((result) => {
            if (result.error) {
              console.warn("DTS computation failed:", result.error);
            } else {
              console.log("DTS computed for multi-format import:", result.data);
            }
          });
        }

        return {
          success: insertedCount > 0,
          imported: insertedCount,
          ignored: actualIgnored - duplicatesIgnored,
          duplicates: duplicatesIgnored,
          errors: resultMessages.length > 0 ? resultMessages : [],
          mixedPaymentsWarned,
        };
      } catch (err) {
        console.error("Import error:", err);
        return {
          success: false,
          imported: 0,
          ignored: rows.length,
          duplicates: 0,
          errors: [err instanceof Error ? err.message : "Erreur inconnue"],
          mixedPaymentsWarned: 0,
        };
      } finally {
        setIsImporting(false);
      }
    },
    [user, refreshWithNotification]
  );

  return {
    importMultiFormatRows,
    isImporting,
  };
}
