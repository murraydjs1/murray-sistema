const labels: Record<string, string> = {
  ADMIN: "Administrador",
  ADMIN_FINANCIERO: "Administración financiera",
  STAFF: "Personal",
  CONFIRMADO: "Confirmado",
  EN_PREPARACION: "En preparación",
  LISTO: "Listo",
  EN_CURSO: "En curso",
  REALIZADO: "Realizado",
  CERRADO: "Cerrado",
  CANCELADO: "Cancelado",
  PENDIENTE: "Pendiente",
  READY_TO_CLOSE: "Listo para cerrar",
  CLOSED: "Cerrado",
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
  VOID: "Anulado",
  OPERATING: "Operativo",
  INVESTMENT: "Inversión",
  PARTICULAR: "Particular",
  EMPRESA: "Empresa",
  DJ_TECNICO: "DJ técnico",
  TECNICO: "Técnico",
  DJ: "DJ",
};

export function humanLabel(value: string) {
  if (labels[value]) return labels[value];
  const normalized = value.replaceAll("_", " ").toLocaleLowerCase("es-AR");
  return normalized.charAt(0).toLocaleUpperCase("es-AR") + normalized.slice(1);
}
