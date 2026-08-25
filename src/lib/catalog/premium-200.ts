export const premium200Service = {
  code: "premium-carpa-200",
  name: "Producción premium para carpa · hasta 200 personas",
  category: "Producción premium",
  description: "Servicio básico con DJ del equipo Murray DJs, estructura truss de 6 m colgada de la estructura de la carpa, 4 cabezales beam 9R, 8 protones de iluminación de pista, 4 bolas espejadas de 50 cm y sonido biamplificado para hasta 200 personas.",
  listPrice: "3250000",
  currency: "ARS" as const,
};

export const premium200AddOns = [
  { code: "iluminacion-perimetral-ambar-16", name: "16 protones · iluminación perimetral y barra en ámbar", category: "Iluminación", description: "16 protones de iluminación perimetral decorativa y de barra de tragos en ámbar.", listPrice: "400000", currency: "ARS" as const },
  { code: "iluminacion-puntual-pines-18", name: "18 pines · iluminación puntual para livings o mesas", category: "Iluminación", description: "18 pines de iluminación puntual para livings o mesas.", listPrice: "250000", currency: "ARS" as const },
  { code: "papelitos-co2", name: "Combo Papelitos + CO2", category: "Producción", description: "Combo Papelitos + CO2.", listPrice: "1600000", currency: "ARS" as const },
  { code: "cabina-mesa-truss", name: "Mesa truss para DJ", category: "Cabina DJ", description: "Mesa truss para DJ.", listPrice: "400000", currency: "ARS" as const },
  { code: "cabina-tarima-4x2", name: "Tarima 4 × 2 m para DJ", category: "Cabina DJ", description: "Tarima de 4 × 2 m para DJ.", listPrice: "800000", currency: "ARS" as const },
  { code: "cabina-back-totems-stormers-beams", name: "Back de cabina DJ · tótems, stormers y beams", category: "Cabina DJ", description: "Back de cabina de DJ con 4 tótems, 8 stormers y 4 cabezales móviles beam.", listPrice: "800000", currency: "ARS" as const },
  { code: "cabina-dj-2-pantallas-led", name: "Cabina DJ · 2 pantallas LED", category: "Cabina DJ", description: "Cabina de DJ con 2 pantallas LED.", listPrice: "3000000", currency: "ARS" as const },
  { code: "dj-micky-2h", name: "DJ Set Micky Murray · 2 horas", category: "DJ", description: "DJ Set de Micky Murray durante 2 horas.", listPrice: "2000000", currency: "ARS" as const },
  { code: "dj-micky-4h", name: "DJ Set Micky Murray · 4 horas", category: "DJ", description: "DJ Set de Micky Murray durante 4 horas.", listPrice: "3000000", currency: "ARS" as const },
] as const;
