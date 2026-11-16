import Decimal from "decimal.js";

// Mantém margem de precisão para operações sobre NUMERIC(20,8).
export const FinancialDecimal = Decimal.clone({ precision: 48, rounding: Decimal.ROUND_HALF_UP });
