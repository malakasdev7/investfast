import { InvestmentCalculator } from "@/components/calculator/investment-calculator";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  return <InvestmentCalculator initialTab={params.tab} />;
}
