export function formatMoney(value: string | number, currency: "ARS" | "USD") {
  const amount = Number(value);
  const showDecimals = currency === "USD" || !Number.isInteger(amount);
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency, minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
