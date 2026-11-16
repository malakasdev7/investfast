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
          <Skeleton className="h-4 w-44" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="size-8 rounded-lg" />
            </div>
            <Skeleton className="mt-3 h-7 w-32 sm:h-8 sm:w-40" />
            <Skeleton className="mt-2 h-3 w-28" />
          </div>
        ))}
      </div>

      {/* Charts / Main Sections Skeleton */}
      <div className="grid gap-5 md:gap-6 xl:grid-cols-[1.65fr_1fr]">
        <div className="card p-5">
          <div className="flex items-center justify-between border-b pb-4">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-52" />
            </div>
            <Skeleton className="h-6 w-12 rounded-md" />
          </div>
          <div className="mt-6 flex h-56 items-end gap-3 px-2 sm:h-64">
            {[40, 65, 45, 80, 55, 90, 70, 85, 95].map((height, idx) => (
              <div
                key={idx}
                className="flex-1 animate-pulse rounded-t-md bg-muted/60"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>
        <div className="card p-5">
          <div className="space-y-1.5 border-b pb-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
          <div className="mt-8 flex items-center justify-center">
            <Skeleton className="size-44 rounded-full border-8 border-card" />
          </div>
        </div>
      </div>

      {/* Recent items / Table Skeleton */}
      <div className="card divide-y">
        <div className="flex items-center justify-between p-4 sm:p-5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-20" />
        </div>
        {[1, 2, 3, 4].map((row) => (
          <div key={row} className="flex items-center justify-between p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-xl" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-36 sm:w-48" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="space-y-1.5 text-right">
              <Skeleton className="ml-auto h-4 w-20" />
              <Skeleton className="ml-auto h-3 w-12" />
            </div>
          </div>
        ))}
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
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center sm:px-6 sm:py-16">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-border bg-muted/40 text-muted-foreground shadow-2xs">
        <Icon className="size-6 stroke-[1.75]" />
      </div>
      <h3 className="text-sm font-semibold tracking-tight text-foreground sm:text-base">
        {title}
      </h3>
      <p className="mx-auto mb-5 mt-1.5 max-w-sm text-xs leading-5 text-muted-foreground sm:text-sm">
        {description}
      </p>
      {children && <div className="flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}
