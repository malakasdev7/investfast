import { CanIBuyPage } from "@/components/investments/can-i-buy";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ ticker?: string; name?: string; class?: string }>;
}) {
  const params = await searchParams;
  return (
    <CanIBuyPage
      initialTicker={params.ticker || ""}
      initialName={params.name || ""}
      initialClass={params.class || ""}
    />
  );
}

