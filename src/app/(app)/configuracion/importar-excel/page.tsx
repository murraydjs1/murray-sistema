import { ExcelImporter } from "@/components/import/excel-importer";
import { requireManagement } from "@/server/auth/authorization";

export default async function ImportExcelPage(){await requireManagement();return <><div className="topbar"><div><div className="eyebrow">Configuración</div><h1>Importar agenda desde Excel</h1><p className="muted">Migración simple desde agosto de 2026, con preview obligatorio y trazabilidad por archivo/fila.</p></div></div><ExcelImporter/></>}
