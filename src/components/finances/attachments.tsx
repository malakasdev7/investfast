"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Trash2 } from "lucide-react";
import { type Snapshot, text } from "@/lib/domain";
import { api } from "@/hooks/use-finances";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function Attachments({ transactionId, data }: { transactionId: string; data: Snapshot }) {
  const cache = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState("");
  const files = (data.attachments ?? []).filter((a) => a.transaction_id === transactionId);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Arquivos privados, até 5 MB: PDF, JPEG, PNG ou WebP.
      </p>
      <input
        aria-label="Enviar anexo"
        type="file"
        accept="application/pdf,image/png,image/jpeg,image/webp"
        disabled={busy}
        className="input cursor-pointer file:mr-3 file:rounded-lg file:border-0 file:bg-primary/12 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          try {
            const body = new FormData();
            body.set("transaction_id", transactionId);
            body.set("file", file);
            const response = await fetch("/api/attachments", { method: "POST", body });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            await cache.invalidateQueries({ queryKey: ["finances"] });
            toast.success("Anexo enviado.");
          } catch (error) {
            toast.error((error as Error).message);
          } finally {
            setBusy(false);
            e.target.value = "";
          }
        }}
      />

      {files.map((f) => (
        <div key={f.id} className="rounded-2xl border border-glass-border bg-glass-light-bg p-4">
          <div className="flex items-center gap-2.5">
            <FileText className="size-4 shrink-0 text-primary" />
            <p className="truncate text-sm font-medium text-foreground">{text(f.name)}</p>
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  const result = await api<{ url: string }>(`/api/attachments?id=${f.id}`);
                  window.location.assign(result.url);
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            >
              <Download className="size-3.5" />
              Baixar
            </Button>
            <Button size="sm" variant="ghost" className="text-loss" onClick={() => setConfirm(f.id)}>
              <Trash2 className="size-3.5" />
              Excluir
            </Button>
          </div>
          {confirm === f.id && (
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
              <p className="text-xs text-muted-foreground">Excluir este anexo permanentemente?</p>
              <Button
                size="sm"
                variant="destructive"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await api("/api/attachments", {
                      method: "DELETE",
                      body: JSON.stringify({ id: f.id }),
                    });
                    await cache.invalidateQueries({ queryKey: ["finances"] });
                    setConfirm("");
                    toast.success("Anexo excluído.");
                  } catch (e) {
                    toast.error((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Confirmar exclusão
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
