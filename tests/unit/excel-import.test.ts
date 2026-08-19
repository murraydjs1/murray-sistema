import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import { parseExcelImport } from "@/lib/excel-import/parser";

describe("Excel import preview", () => {
  it("reads only Hoja1 from row 313 and classifies events safely", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Hoja1");
    const ignoredSheet = workbook.addWorksheet("Hoja2");
    sheet.getCell("B312").value = "Evento anterior";
    sheet.getCell("D312").value = new Date("2026-07-31T00:00:00Z");
    sheet.getCell("B313").value = "Mary Maidana";
    sheet.getCell("C313").value = "Nordelta";
    sheet.getCell("D313").value = new Date("2026-08-08T00:00:00Z");
    sheet.getCell("F313").value = { formula: "100+50", result: 150 };
    sheet.getCell("J313").value = "TINCHO";
    sheet.getCell("B314").value = "ACDE";
    sheet.getCell("D314").value = "21/23-8";
    sheet.getCell("B315").value = "TOTAL";
    sheet.getCell("F315").value = { formula: "SUM(F313:F314)", result: 150 };
    ignoredSheet.getCell("B313").value = "No importar";
    ignoredSheet.getCell("D313").value = new Date("2026-08-09T00:00:00Z");

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const preview = await parseExcelImport(buffer, "party.xlsx");

    expect(preview.detectedEvents).toBe(2);
    expect(preview.ready).toBe(1);
    expect(preview.review).toBe(1);
    expect(preview.ignoredRows).toBe(1);
    expect(preview.rows.some((row) => row.clientName === "Evento anterior")).toBe(false);
    expect(preview.rows.some((row) => row.clientName === "No importar")).toBe(false);
    expect(preview.rows[0]).toMatchObject({
      rowNumber: 313,
      saleArs: "150.00",
      priceFormula: "100+50",
      mappedStaffName: "Tincho",
      status: "READY",
    });
    expect(preview.ambiguousDates).toEqual([{ row: 314, value: "21/23-8" }]);
  });

  it("marks an already imported file row idempotently", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Hoja1");
    sheet.getCell("B313").value = "Cliente";
    sheet.getCell("D313").value = new Date("2026-08-08T00:00:00Z");
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const first = await parseExcelImport(buffer, "party.xlsx");
    const key = `${first.fileHash}:Hoja1:313`;
    const second = await parseExcelImport(buffer, "party.xlsx", new Set([key]));

    expect(second.rows[0]).toMatchObject({ status: "ALREADY_IMPORTED", reason: "Ya importado" });
  });
});
