import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import Decimal from "decimal.js";

export function formatCurrency(value: Decimal.Value, currency = "BRL") {
  const rounded = new Decimal(value).toDecimalPlaces(2).toNumber();
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(rounded);
}

export function formatDate(value: string | Date) {
  return format(typeof value === "string" ? parseISO(value) : value, "dd/MM/yyyy", { locale: ptBR });
}
