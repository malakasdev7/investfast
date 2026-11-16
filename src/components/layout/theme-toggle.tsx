"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/hooks/use-finances";
import { toast } from "sonner";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const pathname = usePathname();
  const cache = useQueryClient();

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
    <Button
      variant="outline"
      size="icon"
      aria-label="Alternar tema claro e escuro"
      onClick={toggle}
    >
      <Sun className="hidden size-4 dark:block" />
      <Moon className="size-4 dark:hidden" />
    </Button>
  );
}
