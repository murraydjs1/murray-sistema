import { createHash } from "node:crypto";
import ExcelJS from "exceljs";

export type ImportStatus = "READY" | "REVIEW" | "IGNORED" | "ALREADY_IMPORTED";
export type ExcelEventRow = {
  rowNumber: number; clientName: string | null; venue: string | null; rawDate: string | null;
  eventDate: string | null; saleArs: string | null; saleUsd: string | null; depositArs: string | null;
  depositUsd: string | null; costArs: string | null; costUsd: string | null; resultArs: string | null;
  resultUsd: string | null; managerAlias: string | null; mappedStaffName: string | null;
  priceFormula: string | null; notes: string | null; status: ImportStatus; reason: string | null;
};
export type ExcelPreview = { fileName: string; fileHash: string; sheetName: "Hoja1"; firstRow: 313; lastRow: number; totalRows: number; emptyRows: number; ignoredRows: number; detectedEvents: number; ready: number; review: number; withArs: number; withUsd: number; mappedManagers: number; ambiguousDates: Array<{row:number;value:string}>; unmappedAliases: string[]; rows: ExcelEventRow[] };

const aliases: Record<string,string> = { TINCHO:"Tincho", LUIS:"Luis", PADDY:"Paddy", MIKEY:"Miguel", MICKY:"Miguel", MIGUEL:"Miguel" };
const summaryPattern = /^(TOTAL|TOTALES|SUMA|SUMATORIA|TRIMESTRE|SUBTOTAL)\b/i;
const clean = (value: unknown) => value == null ? null : String(value).trim() || null;
const money = (value: unknown) => { const raw = value && typeof value === "object" && "result" in value ? (value as {result?:unknown}).result : value; return typeof raw === "number" && Number.isFinite(raw) ? raw.toFixed(2) : null; };
const formula = (value: unknown) => value && typeof value === "object" && "formula" in value ? String((value as {formula:string}).formula) : null;
function civilDate(value: unknown) { if (value instanceof Date && !Number.isNaN(value.valueOf())) return `${value.getUTCFullYear()}-${String(value.getUTCMonth()+1).padStart(2,"0")}-${String(value.getUTCDate()).padStart(2,"0")}`; return null; }

export async function parseExcelImport(buffer: Buffer, fileName: string, importedKeys = new Set<string>()): Promise<ExcelPreview> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as never);
  const sheet = workbook.getWorksheet("Hoja1");
  if (!sheet) throw new Error("El archivo no contiene la hoja obligatoria Hoja1");
  const fileHash = createHash("sha256").update(buffer).digest("hex");
  const lastRow = Math.max(sheet.rowCount, 313);
  const rows: ExcelEventRow[] = [];
  let emptyRows = 0;
  for (let rowNumber = 313; rowNumber <= lastRow; rowNumber++) {
    const row = sheet.getRow(rowNumber), clientName = clean(row.getCell(2).value), venue = clean(row.getCell(3).value), dateValue = row.getCell(4).value;
    const rawDate = dateValue instanceof Date ? dateValue.toISOString().slice(0,10) : clean(dateValue);
    const eventDate = civilDate(dateValue);
    const hasAny = [2,3,4,6,7,9,10,11,12,14].some((column) => row.getCell(column).value != null);
    if (!hasAny) { emptyRows++; continue; }
    const isSummary = Boolean(clientName && summaryPattern.test(clientName)) || (!clientName && !rawDate);
    const alias = clean(row.getCell(10).value), normalizedAlias = alias?.toUpperCase() ?? null;
    const saleArs = money(row.getCell(6).value), saleUsd = money(row.getCell(7).value), deposit = money(row.getCell(9).value), cost = money(row.getCell(11).value), result = money(row.getCell(12).value);
    let status: ImportStatus = "READY", reason: string | null = null;
    if (isSummary || !clientName) { status="IGNORED"; reason="Fila vacía o de resumen"; }
    else if (!eventDate && rawDate && /\d/.test(rawDate)) { status="REVIEW"; reason=`Fecha no estándar: ${rawDate}`; }
    else if (!eventDate) { status="IGNORED"; reason="No contiene una fecha reconocible"; }
    else if (eventDate < "2026-08-01") { status="REVIEW"; reason=`Fecha anterior al corte: ${eventDate}`; }
    if (importedKeys.has(`${fileHash}:Hoja1:${rowNumber}`)) { status="ALREADY_IMPORTED"; reason="Ya importado"; }
    rows.push({ rowNumber, clientName, venue, rawDate, eventDate, saleArs, saleUsd, depositArs:saleArs?deposit:null, depositUsd:!saleArs&&saleUsd?deposit:null, costArs:saleArs?cost:null, costUsd:!saleArs&&saleUsd?cost:null, resultArs:saleArs?result:null, resultUsd:!saleArs&&saleUsd?result:null, managerAlias:alias, mappedStaffName:normalizedAlias?aliases[normalizedAlias]??null:null, priceFormula:formula(row.getCell(6).value), notes:clean(row.getCell(14).value), status, reason });
  }
  const events = rows.filter((row) => row.status !== "IGNORED");
  return { fileName, fileHash, sheetName:"Hoja1", firstRow:313, lastRow, totalRows:lastRow-312, emptyRows, ignoredRows:rows.filter((row)=>row.status==="IGNORED").length, detectedEvents:events.length, ready:rows.filter((row)=>row.status==="READY").length, review:rows.filter((row)=>row.status==="REVIEW").length, withArs:events.filter((row)=>row.saleArs).length, withUsd:events.filter((row)=>row.saleUsd).length, mappedManagers:events.filter((row)=>row.mappedStaffName).length, ambiguousDates:rows.filter((row)=>row.status==="REVIEW"&&row.rawDate).map((row)=>({row:row.rowNumber,value:row.rawDate!})), unmappedAliases:[...new Set(events.filter((row)=>row.managerAlias&&!row.mappedStaffName).map((row)=>row.managerAlias!))].sort(), rows };
}
