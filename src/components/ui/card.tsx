import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  variant = "content",
  ...props
}: React.ComponentProps<"section"> & {
  variant?: "navigation" | "content" | "overlay" | "light" | "medium" | "frosted";
}) {
  const variantClass =
    variant === "navigation" || variant === "light"
      ? "glass-navigation"
      : variant === "overlay" || variant === "frosted"
        ? "glass-overlay"
        : "glass-content";

  return <section className={cn("card", variantClass, className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 border-b border-border px-5 py-4 sm:px-6",
        className
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      className={cn(
        "text-base font-semibold tracking-tight text-foreground",
        className
      )}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("text-xs leading-5 text-muted-foreground sm:text-sm", className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-5 sm:p-6", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex items-center border-t border-border px-5 py-3.5 sm:px-6",
        className
      )}
      {...props}
    />
  );
}
