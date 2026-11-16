import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap transition-all duration-150 backdrop-blur-md shadow-2xs",
  {
    variants: {
      variant: {
        neutral: "bg-muted/70 text-muted-foreground border border-white/20 dark:border-white/10",
        primary: "badge-primary",
        gain: "badge-gain",
        loss: "badge-loss",
        warning: "badge-warning",
        outline: "border border-glass-border bg-glass-light-bg text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}
