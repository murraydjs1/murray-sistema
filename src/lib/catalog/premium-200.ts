export const premium200Service = {
  code: "premium-carpa-200",
  name: "Producción premium para carpa · hasta 200 personas",
  category: "Producción premium",
  description: "Servicio básico con DJ del equipo Murray DJs, estructura truss de 6 m colgada de la estructura de la carpa, 4 cabezales beam 9R, 8 protones de iluminación de pista, 4 bolas espejadas de 50 cm y sonido biamplificado para hasta 200 personas.",
  listPrice: "3250000",
  currency: "ARS" as const,
};

export const premium200AddOns = [
  { code: "papelitos-co2", name: "Combo Papelitos + CO2", category: "Producción", description: "Combo Papelitos + CO2.", listPrice: "1600000", currency: "ARS" as const },
  { code: "dj-micky-2h", name: "DJ Set Micky Murray · 2 horas", category: "DJ", description: "DJ Set de Micky Murray durante 2 horas.", listPrice: "2000000", currency: "ARS" as const },
  { code: "dj-micky-4h", name: "DJ Set Micky Murray · 4 horas", category: "DJ", description: "DJ Set de Micky Murray durante 4 horas.", listPrice: "3000000", currency: "ARS" as const },
] as const;

export const retiredPremiumAddOnCodes = [
  "iluminacion-perimetral-ambar-16",
  "iluminacion-puntual-pines-18",
  "cabina-mesa-truss",
  "cabina-tarima-4x2",
  "cabina-back-totems-stormers-beams",
  "cabina-dj-2-pantallas-led",
] as const;
