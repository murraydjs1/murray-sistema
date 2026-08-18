import Decimal from "decimal.js";

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export type DiscountInput = { type: "NONE" | "PERCENTAGE" | "FIXED"; value: string | number };
export type QuoteItemInput = {
  description: string;
  quantity: string | number;
  listUnitPrice: string | number;
  discount: DiscountInput;
};

const money = (value: Decimal.Value) => new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

export function discountAmount(base: Decimal, discount: DiscountInput) {
  const value = new Decimal(discount.value || 0);
  if (base.isNegative() || value.isNegative()) throw new Error("Los importes de descuento no pueden ser negativos");
  if (discount.type === "NONE") return money(0);
  if (discount.type === "PERCENTAGE") {
    if (value.greaterThan(100)) throw new Error("El descuento porcentual no puede superar 100%");
    return money(base.mul(value).div(100));
  }
  if (value.greaterThan(base)) throw new Error("El descuento no puede superar el importe disponible");
  return money(value);
}

export function calculateQuote(input: {
  items: QuoteItemInput[];
  generalDiscount: DiscountInput;
  taxRate: string | number;
  depositPercentage: string | number;
}) {
  if (!input.items.length) throw new Error("El presupuesto necesita al menos un ítem");
  const items = input.items.map((item) => {
    const quantity = new Decimal(item.quantity);
    const listUnitPrice = money(item.listUnitPrice);
    if (quantity.lte(0)) throw new Error("La cantidad debe ser mayor a cero");
    if (listUnitPrice.isNegative()) throw new Error("El precio no puede ser negativo");
    const grossAmount = money(quantity.mul(listUnitPrice));
    const itemDiscountAmount = discountAmount(grossAmount, item.discount);
    return { ...item, quantity, listUnitPrice, grossAmount, discountAmount: itemDiscountAmount, finalAmount: money(grossAmount.minus(itemDiscountAmount)) };
  });
  const grossSubtotal = money(items.reduce((sum, item) => sum.plus(item.grossAmount), new Decimal(0)));
  const itemDiscountTotal = money(items.reduce((sum, item) => sum.plus(item.discountAmount), new Decimal(0)));
  const subtotalAfterItemDiscounts = money(grossSubtotal.minus(itemDiscountTotal));
  const generalDiscountAmount = discountAmount(subtotalAfterItemDiscounts, input.generalDiscount);
  const taxableBase = money(subtotalAfterItemDiscounts.minus(generalDiscountAmount));
  const taxRate = new Decimal(input.taxRate || 0);
  const depositPercentage = new Decimal(input.depositPercentage || 0);
  if (taxRate.lt(0) || depositPercentage.lt(0) || depositPercentage.gt(100)) throw new Error("Porcentaje inválido");
  const taxAmount = money(taxableBase.mul(taxRate).div(100));
  const totalFinal = money(taxableBase.plus(taxAmount));
  const depositAmount = money(totalFinal.mul(depositPercentage).div(100));
  const balance = money(totalFinal.minus(depositAmount));
  return { items, grossSubtotal, itemDiscountTotal, subtotalAfterItemDiscounts, generalDiscountAmount, taxableBase, taxRate, taxAmount, totalFinal, depositPercentage, depositAmount, balance };
}

export function moneyString(value: { toFixed: (places: number) => string }) { return value.toFixed(2); }
