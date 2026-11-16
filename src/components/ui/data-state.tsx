import { FolderOpen, TriangleAlert, RefreshCw } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-xl bg-muted/70", className)}
      {...props}
    />
  );
}

export function Loading() {
  return (
    <div
      aria-label="Carregando dados do InvestFast"
      role="status"
      className="space-y-6"
    >
      {/* Header Skeleton */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-56 md:w-72" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
      </div>

      {/* Hero Net Worth Skeleton */}
      <div className="hero-metric rounded-2xl p-6 sm:p-7">
        <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <div className="space-y-3">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-11 w-56 sm:w-72" />
            <Skeleton className="h-5 w-48" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Charts / Main Sections Skeleton */}
      <div className="grid gap-5 md:gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="card p-5 sm:p-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3.5 w-52" />
            </div>
            <Skeleton className="h-6 w-12 rounded-md" />
          </div>
          <div className="mt-6 flex h-48 items-end gap-3 px-2 sm:h-56">
            {[40, 65, 45, 80, 55, 90, 70, 85, 95].map((height, idx) => (
              <div
                key={idx}
                className="flex-1 animate-pulse rounded-t-md bg-muted/60"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>
        <div className="card p-5 sm:p-6">
          <div className="space-y-1.5 border-b pb-4">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3.5 w-44" />
          </div>
          <div className="mt-8 flex items-center justify-center">
            <Skeleton className="size-40 rounded-full border-8 border-card" />
          </div>
        </div>
      </div>
      <span className="sr-only">Carregando dados</span>
    </div>
  );
}

export function Failure({
  message,
  retry,
}: {
  message: string;
  retry: () => void;
}) {
  return (
    <div role="alert" className="card mx-auto max-w-lg p-8 text-center sm:p-10">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <TriangleAlert className="size-6" />
      </div>
      <h2 className="text-base font-semibold text-foreground sm:text-lg">
        Não foi possível carregar os dados
      </h2>
      <p className="mx-auto my-3 max-w-sm text-sm text-muted-foreground leading-relaxed">
        {message}
      </p>
      <div className="mt-6 flex justify-center">
        <Button onClick={retry} variant="outline" className="gap-2">
          <RefreshCw className="size-4" />
          Tentar novamente
        </Button>
      </div>
    </div>
  );
}

export function Empty({
  title = "Nada por aqui ainda",
  description = "Adicione seu primeiro registro para começar.",
  children,
  icon: Icon = FolderOpen,
}: {
  title?: string;
  description?: string;
  children?: React.ReactNode;
  icon?: typeof FolderOpen;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-9 text-center sm:px-6 sm:py-11">
      <div className="mb-3.5 flex size-12 items-center justify-center rounded-2xl border border-glass-border bg-glass-light-bg text-muted-foreground">
        <Icon className="size-5 stroke-[1.75]" />
      </div>
      <h3 className="text-sm font-semibold tracking-tight text-foreground sm:text-base">
        {title}
      </h3>
      <p className="mx-auto mb-4 mt-1 max-w-sm text-xs leading-5 text-muted-foreground sm:text-sm">
        {description}
      </p>
      {children && <div className="flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}
