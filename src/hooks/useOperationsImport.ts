import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ParsedRow, ImportResult } from "@/components/operations/csv-import/types";
import { EventsParsedRow } from "@/components/operations/csv-import/eventsParser";
import { format } from "date-fns";

// Type guard to check if row is EventsParsedRow
function isEventsParsedRow(row: ParsedRow): row is EventsParsedRow {
  return 'source' in row && (row as EventsParsedRow).source === 'events_csv';
}

/**
 * Generate a fingerprint hash for deduplication
 * Uses: site_id + date + mode + amount + machine
 */
async function generateImportHash(
  siteId: string,
  date: string,
  mode: string | null,
  amountCents: number,
  machine: string | null
): Promise<string> {
  const data = `${siteId}|${date}|${mode || ''}|${amountCents}|${machine || ''}`;
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function useOperationsImport() {
  const { user } = useAuth();
  const [isImporting, setIsImporting] = useState(false);

  const importOperations = useCallback(
    async (
      siteId: string,
      filename: string,
      parsedRows: ParsedRow[]
    ): Promise<ImportResult> => {
      if (!user) {
        return {
          success: false,
          imported: 0,
          ignored: 0,
          errors: ["Utilisateur non connecté"],
        };
      }

      setIsImporting(true);

      try {
        const validRows = parsedRows.filter((r) => r.isValid);
        const invalidRows = parsedRows.filter((r) => !r.isValid);

        if (validRows.length === 0) {
          return {
            success: false,
            imported: 0,
            ignored: invalidRows.length,
            errors: ["Aucune ligne valide à importer"],
          };
        }

        // Create import batch record
        const { data: batch, error: batchError } = await supabase
          .from("import_batches")
          .insert({
            user_id: user.id,
            site_id: siteId,
            filename,
            total_rows: parsedRows.length,
            imported_rows: validRows.length,
            ignored_rows: invalidRows.length,
          })
          .select()
          .single();

        if (batchError) {
          console.error("Error creating import batch:", batchError);
          throw new Error("Erreur lors de la création du batch d'import");
        }

        // Prepare operations for insert with import_hash
        const operations = await Promise.all(validRows.map(async (row) => {
          const dateStr = row.date ? format(row.date, "yyyy-MM-dd") : null;
          const amountCents = Math.round((row.amount || 0) * 100);
          const mode = row.paymentMode?.toUpperCase() || null;
          const machine = row.machine || null;
          
          // Generate deduplication hash
          const importHash = dateStr 
            ? await generateImportHash(siteId, dateStr, mode, amountCents, machine)
            : null;

          // Base operation data
          const baseOperation = {
            user_id: user.id,
            site_id: siteId,
            operation_date: dateStr,
            operation_time: row.time || null,
            amount: row.amount,
            machine: machine,
            program: row.program || null,
            payment_mode: mode,
            raw_data: { original: row.rawData },
            import_batch_id: batch.id,
            import_hash: importHash,
          };
          
          // Extended fields for Events format
          if (isEventsParsedRow(row)) {
            return {
              ...baseOperation,
              inserted_eur: row.insertedEur || null,
              price_eur: row.priceEur || null,
              change_eur: row.changeEur || null,
              machine_name: row.machineName || null,
              source: 'events_csv',
              raw: row.rawData ? { original: row.rawData } : null,
            };
          }
          
          return {
            ...baseOperation,
            source: 'manual',
          };
        }));

        // Insert operations in batches of 500
        const BATCH_SIZE = 500;
        let insertedCount = 0;
        const errors: string[] = [];

        for (let i = 0; i < operations.length; i += BATCH_SIZE) {
          const chunk = operations.slice(i, i + BATCH_SIZE);
          const { error: insertError, count } = await supabase
            .from("operations")
            .insert(chunk);

          if (insertError) {
            console.error("Error inserting operations chunk:", insertError);
            errors.push(`Erreur à la ligne ${i + 1}: ${insertError.message}`);
          } else {
            insertedCount += chunk.length;
          }
        }

        // Update batch with actual inserted count if different
        if (insertedCount !== validRows.length) {
          await supabase
            .from("import_batches")
            .update({ imported_rows: insertedCount })
            .eq("id", batch.id);
        }

        return {
          success: insertedCount > 0,
          imported: insertedCount,
          ignored: parsedRows.length - insertedCount,
          errors:
            errors.length > 0
              ? errors
              : invalidRows.length > 0
              ? [`${invalidRows.length} lignes ignorées (données incomplètes)`]
              : [],
        };
      } catch (err) {
        console.error("Import error:", err);
        return {
          success: false,
          imported: 0,
          ignored: parsedRows.length,
          errors: [err instanceof Error ? err.message : "Erreur inconnue"],
        };
      } finally {
        setIsImporting(false);
      }
    },
    [user]
  );

  return {
    importOperations,
    isImporting,
  };
}
