"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "./button";

export function Dialog({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = old;
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby="dialog-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="record-dialog fixed m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto rounded-3xl border border-white/40 dark:border-white/15 bg-white/85 dark:bg-slate-900/85 p-0 text-foreground shadow-2xl backdrop-blur-2xl backdrop:bg-slate-950/60 backdrop:backdrop-blur-md"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-white/20 dark:border-white/10 bg-white/70 dark:bg-slate-900/70 px-6 py-4.5 backdrop-blur-xl">
        <div className="min-w-0">
          <h2 id="dialog-title" className="truncate text-base font-semibold tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Fechar janela"
          className="shrink-0 rounded-full hover:bg-muted/80"
        >
          <X className="size-4" />
        </Button>
      </div>
      <div className="p-6">{children}</div>
    </dialog>
  );
}
