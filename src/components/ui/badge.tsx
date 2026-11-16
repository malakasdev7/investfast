import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-colors duration-150",
  {
    variants: {
      variant: {
        neutral: "bg-muted text-muted-foreground border border-border",
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
