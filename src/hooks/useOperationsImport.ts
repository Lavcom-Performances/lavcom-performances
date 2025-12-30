import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ParsedRow, ImportResult } from "@/components/operations/csv-import/types";
import { EventsParsedRow } from "@/components/operations/csv-import/eventsParser";
import { format } from "date-fns";
import { buildDedupeKeyHashed } from "@/lib/csv/buildDedupeKey";
import { 
  processOperationForImport, 
  normMode, 
  round2,
  centsToEurosValue 
} from "@/lib/csv/businessRules";

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
          rechEspFixed: 0,
          centimesConverted: false,
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
            rechEspFixed: 0,
            centimesConverted: false,
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
        // TAEX-145: Convert centimes to euros BEFORE dedupe and insertion
        let rechEspFixedCount = 0;
        
        const operations = validRows.map((row) => {
          const dateStr = row.date ? format(row.date, "yyyy-MM-dd") : "";
          const mode = normMode(row.paymentMode);
          const machine = row.machine || null;
          const time = row.time || null;
          const rowSource = (row as any).source || 'manual';
          
          // Get raw amounts (in centimes from CSV)
          // The parsedRow.amount is already parsed but may be in centimes
          const rawAmount = row.amount ?? 0;
          const rawInserted = isEventsParsedRow(row) ? (row.insertedEur ?? 0) : 0;
          const rawPrice = isEventsParsedRow(row) ? (row.priceEur ?? 0) : rawAmount;
          const rawChange = isEventsParsedRow(row) ? (row.changeEur ?? 0) : 0;
          
          // Determine if values are in centimes (> 100 typically means centimes)
          // A typical laundry transaction is 0.60€ - 20€, so if > 100, likely centimes
          const isCentimes = rawAmount > 100 || rawInserted > 100 || rawPrice > 100;
          
          // Build raw operation for business rules pipeline
          const rawOp = {
            mode: mode,
            type: null as string | null,
            // If values look like centimes, pass them directly; otherwise convert to centimes first
            insere: isCentimes ? rawInserted : rawInserted * 100,
            prix: isCentimes ? rawPrice : rawPrice * 100,
            rendu: isCentimes ? rawChange : rawChange * 100,
            prix_cb: 0,
            prix_esp: 0,
          };
          
          // Set initial prix_cb or prix_esp based on payment mode (in centimes)
          const amountCentimes = isCentimes ? rawAmount : rawAmount * 100;
          if (mode === 'CB') {
            rawOp.prix_cb = amountCentimes;
          } else if (mode === 'ESP') {
            rawOp.prix_esp = amountCentimes;
          }
          
          // Process: convert centimes to euros AND apply business rules
          const result = processOperationForImport(rawOp);
          
          if (result.rechEspFixed) {
            rechEspFixedCount++;
          }
          
          const op = result.operation;
          
          // Final euro values
          const amountEur = round2(op.prix_eur > 0 ? op.prix_eur : (op.prix_cb_eur + op.prix_esp_eur));
          const insertedEur = op.insere_eur;
          const priceEur = op.prix_eur;
          const changeEur = op.rendu_eur;
          const priceCb = op.prix_cb_eur > 0 ? op.prix_cb_eur : null;
          const priceEsp = op.prix_esp_eur > 0 ? op.prix_esp_eur : null;
          const operationType = op.type || null;
          
          // Generate dedupe_key using EURO values (after conversion)
          const dedupeKey = buildDedupeKeyHashed({
            siteId,
            operationDate: dateStr,
            operationTime: time,
            paymentMode: mode || null,
            type: operationType,
            priceCb,
            priceEsp,
            amount: amountEur,
          });

          // Base operation data (all amounts in EUROS)
          const baseOperation = {
            user_id: user.id,
            site_id: siteId,
            operation_date: dateStr,
            operation_time: time,
            amount: amountEur,
            machine: machine,
            program: row.program || null,
            payment_mode: mode || null,
            raw_data: { original: row.rawData },
            import_batch_id: batch.id,
            dedupe_key: dedupeKey,
            price_cb: priceCb,
            price_esp: priceEsp,
            type: operationType,
          };
          
          // Extended fields for Events format
          if (isEventsParsedRow(row)) {
            return {
              ...baseOperation,
              inserted_eur: insertedEur,
              price_eur: priceEur,
              change_eur: changeEur,
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
          rechEspFixed: rechEspFixedCount,
          centimesConverted: true,
        };
      } catch (err) {
        console.error("Import error:", err);
        return {
          success: false,
          imported: 0,
          ignored: parsedRows.length,
          duplicates: 0,
          errors: [err instanceof Error ? err.message : "Erreur inconnue"],
          rechEspFixed: 0,
          centimesConverted: false,
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
