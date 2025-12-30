import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ParsedRow, ImportResult } from "@/components/operations/csv-import/types";
import { EventsParsedRow } from "@/components/operations/csv-import/eventsParser";
import { format } from "date-fns";
import { buildDedupeKeyHashed } from "@/lib/csv/buildDedupeKey";

// Type guard to check if row is EventsParsedRow
function isEventsParsedRow(row: ParsedRow): row is EventsParsedRow {
  return 'source' in row && (row as EventsParsedRow).source === 'events_csv';
}

/**
 * Chunk an array into smaller arrays of specified size
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
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
          duplicates: 0,
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
            duplicates: 0,
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

        // Prepare operations for insert with dedupe_key
        const operations = validRows.map((row) => {
          const dateStr = row.date ? format(row.date, "yyyy-MM-dd") : "";
          const mode = row.paymentMode?.toUpperCase() || null;
          const machine = row.machine || null;
          const time = row.time || null;
          
          // Determine source/type based on row source field
          const rowSource = (row as any).source || 'manual';
          
          // Get amount - check if it's already in euros or in centimes
          // If amount > 20, it's likely in centimes and needs to be divided by 100
          // (typical laundry prices range from 0.60€ to 20€)
          let amountEur = row.amount || 0;
          if (amountEur > 20) {
            // Amount is in centimes, convert to euros
            amountEur = amountEur / 100;
          }
          
          // Determine price_cb and price_esp based on payment mode
          let priceCb: number | null = null;
          let priceEsp: number | null = null;
          
          if (mode === 'CB' || mode === 'CARTE') {
            priceCb = amountEur;
          } else if (mode === 'ESP' || mode === 'ESPECES' || mode === 'CASH') {
            priceEsp = amountEur;
          }
          
          // Generate dedupe_key using MD5 hash
          const dedupeKey = buildDedupeKeyHashed({
            siteId,
            operationDate: dateStr,
            operationTime: time,
            paymentMode: mode,
            type: null,
            priceCb,
            priceEsp,
            amount: amountEur,
          });

          // Base operation data
          const baseOperation = {
            user_id: user.id,
            site_id: siteId,
            operation_date: dateStr,
            operation_time: time,
            amount: amountEur,
            machine: machine,
            program: row.program || null,
            payment_mode: mode,
            raw_data: { original: row.rawData },
            import_batch_id: batch.id,
            dedupe_key: dedupeKey,
            price_cb: priceCb,
            price_esp: priceEsp,
            type: null, // Don't set 'vend' type anymore
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
            source: rowSource,
          };
        });

        // Insert operations in batches using upsert with ignoreDuplicates
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
            .upsert(chunk, {
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

        // Update batch with actual inserted count if different
        const actualIgnored = parsedRows.length - insertedCount;
        if (insertedCount !== validRows.length || duplicatesIgnored > 0) {
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
        if (invalidRows.length > 0) {
          resultMessages.push(`${invalidRows.length} lignes ignorées (données incomplètes)`);
        }
        if (duplicatesIgnored > 0) {
          resultMessages.push(`${duplicatesIgnored} doublons ignorés`);
        }
        if (errors.length > 0) {
          resultMessages.push(...errors);
        }

        return {
          success: insertedCount > 0,
          imported: insertedCount,
          ignored: actualIgnored - duplicatesIgnored,
          duplicates: duplicatesIgnored,
          errors: resultMessages.length > 0 ? resultMessages : [],
        };
      } catch (err) {
        console.error("Import error:", err);
        return {
          success: false,
          imported: 0,
          ignored: parsedRows.length,
          duplicates: 0,
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
