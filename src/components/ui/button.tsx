import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-md hover:bg-primary/90 border border-primary/40 hover:shadow-lg hover:shadow-primary/20",
        secondary:
          "bg-muted/80 backdrop-blur-md text-foreground hover:bg-muted border border-white/20 dark:border-white/10 shadow-xs",
        outline:
          "border border-glass-border bg-glass-light-bg backdrop-blur-md text-foreground hover:border-border-strong hover:bg-glass-medium-bg shadow-2xs hover:shadow-xs",
        glass:
          "bg-glass-light-bg backdrop-blur-xl border border-glass-border text-foreground hover:bg-glass-medium-bg shadow-xs hover:shadow-md",
        ghost:
          "text-muted-foreground hover:bg-muted/60 hover:text-foreground backdrop-blur-xs",
        destructive:
          "bg-destructive text-white shadow-md hover:bg-destructive/90 border border-destructive/40 hover:shadow-destructive/20",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3 text-xs rounded-lg",
        lg: "h-11 px-5 text-[15px]",
        icon: "size-9 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
