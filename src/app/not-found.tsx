import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70dvh] max-w-lg flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-5 flex size-14 items-center justify-center rounded-2xl border bg-card text-primary shadow-xs">
        <Compass className="size-6" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Página não encontrada
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Este endereço não está disponível no InvestFast ou pode ter sido movido.
      </p>
      <Button asChild className="mt-6">
        <Link href="/dashboard">
          <ArrowLeft className="size-4" />
          Voltar ao início
        </Link>
      </Button>
    </main>
  );
}
