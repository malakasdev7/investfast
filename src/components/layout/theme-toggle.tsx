"use client";

import { useEffect, useState } from "react";
import { Contrast, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/hooks/use-finances";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const pathname = usePathname();
  const cache = useQueryClient();
  const [reduceTransparency, setReduceTransparency] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem("if_reduce_transparency") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (reduceTransparency) {
      document.documentElement.dataset.reduceTransparency = "true";
    } else {
      delete document.documentElement.dataset.reduceTransparency;
    }
  }, [reduceTransparency]);

  function toggleTransparency() {
    const next = !reduceTransparency;
    setReduceTransparency(next);
    try {
      window.localStorage.setItem("if_reduce_transparency", String(next));
    } catch {
      // Ignore storage access errors
    }
  }

  async function toggle() {
    const theme = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(theme);
    if (!["/login", "/cadastro", "/recuperar-senha", "/atualizar-senha"].includes(pathname)) {
      try {
        await api("/api/preferences", {
          method: "PATCH",
          body: JSON.stringify({ theme }),
        });
        await cache.invalidateQueries({ queryKey: ["finances"] });
      } catch (e) {
        toast.error((e as Error).message);
      }
    }
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <Button
        variant="outline"
        size="icon"
        type="button"
        aria-label="Reduzir transparência"
        aria-pressed={reduceTransparency}
        title={
          reduceTransparency
            ? "Ativar efeito translúcido (Liquid Glass)"
            : "Reduzir transparência (alto contraste)"
        }
        onClick={toggleTransparency}
        className={cn(
          "relative",
          reduceTransparency && "ring-2 ring-warning/70 text-warning"
        )}
      >
        <Contrast className="size-4" />
        {reduceTransparency && (
          <span aria-hidden="true" className="absolute -right-1 -top-1 size-2 rounded-full bg-warning" />
        )}
      </Button>
      <Button
        variant="outline"
        size="icon"
        type="button"
        aria-label="Alternar tema claro e escuro"
        title="Alternar tema claro e escuro"
        onClick={toggle}
      >
        <Sun className="hidden size-4 dark:block" />
        <Moon className="size-4 dark:hidden" />
      </Button>
    </div>
  );
}
