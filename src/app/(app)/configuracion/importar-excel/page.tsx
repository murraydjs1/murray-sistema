import { ExcelImporter } from "@/components/import/excel-importer";
import { requireManagement } from "@/server/auth/authorization";

export default async function ImportExcelPage(){await requireManagement();return <><div className="topbar"><div><div className="eyebrow">Configuración</div><h1>Importar agenda</h1><p className="muted">Revisá el archivo antes de crear eventos. Ningún dato se guarda durante la vista previa.</p></div></div><ExcelImporter/></>}
