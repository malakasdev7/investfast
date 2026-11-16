"use client";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Settings, ShieldCheck, UserRound, Trash2 } from "lucide-react";
import { useFinances, api } from "@/hooks/use-finances";
import { Loading, Failure } from "@/components/ui/data-state";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { RecordForm } from "@/components/forms/record-form";
import { text } from "@/lib/domain";
import { formatDate } from "@/lib/utils/format";

export function SettingsPage() {
  const { data, isPending, error, refetch } = useFinances();
  const router = useRouter();
  const cache = useQueryClient();
  const { setTheme } = useTheme();
  const [edit, setEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");

  const theme = text(data?.profiles?.[0]?.theme);
  useEffect(() => {
    if (theme) setTheme(theme);
  }, [theme, setTheme]);

  if (isPending) return <Loading />;
  if (error || !data)
    return <Failure message={error?.message || "Dados indisponíveis"} retry={() => refetch()} />;

  const profile = data.profiles[0];
  const entityNames: Record<string, string> = {
    accounts: "Conta",
    categories: "Categoria",
    budgets: "Orçamento",
    transactions: "Transação",
    recurring_transactions: "Recorrência",
    portfolios: "Carteira",
    assets: "Ativo",
    investment_transactions: "Operação",
    asset_prices: "Cotação",
    goals: "Meta",
    goal_contributions: "Aporte",
    attachments: "Anexo",
    profiles: "Perfil",
    investment_simulations: "Simulação de investimento",
    purchase_evaluations: "Avaliação Posso comprar?",
    ai_conversations: "Conversa com Assistente IA",
    ai_assistant: "Segurança do Assistente IA",
  };

  const actionNames: Record<string, string> = {
    INSERT: "Criado",
    UPDATE: "Atualizado",
    DELETE: "Excluído",
    EVALUATE: "Avaliado",
    SAVE_SIMULATION: "Simulação salva",
    AI_CONFIRMED_INSERT: "Confirmado via IA",
    PROMPT_INJECTION_BLOCKED: "Bloqueio de segurança",
  };

  async function action(name: string, body: Record<string, unknown>) {
    setBusy(true);
    try {
      await api(`/api/auth/${name}`, { method: "POST", body: JSON.stringify(body) });
      if (name === "delete") {
        cache.clear();
        router.replace("/login");
        router.refresh();
      } else {
        toast.success("Confira os e-mails de confirmação enviados pelo Supabase.");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <p className="section-kicker">Do seu jeito</p>
        <h1 className="page-heading">Configurações</h1>
        <p className="subheading">Gerencie seu perfil, acesso e preferências.</p>
      </div>

      <section className="card p-6 sm:p-7">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <UserRound className="size-4 text-primary" />
            Seu perfil
          </h2>
          <Button variant="outline" size="sm" onClick={() => setEdit(true)}>
            Editar perfil
          </Button>
        </div>
        <div className="mt-6 flex items-center gap-5">
          <div
            className="flex size-16 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/12 bg-cover bg-center text-xl font-semibold text-primary"
            style={
              profile?.avatar_url ? { backgroundImage: `url(${text(profile.avatar_url)})` } : undefined
            }
            aria-label="Avatar"
          >
            {!profile?.avatar_url && text(profile?.name).slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-base font-semibold">{text(profile?.name)}</p>
            <p className="mt-1 text-sm text-muted-foreground">{text(profile?.email)}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Moeda: BRL · Desde {profile ? formatDate(profile.created_at) : "—"}
            </p>
          </div>
        </div>
      </section>

      <section className="card p-6 sm:p-7">
        <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
          <Settings className="size-4 text-primary" />
          E-mail de acesso
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A alteração requer confirmação nos endereços solicitados pelo Supabase.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void action("email", { email });
          }}
          className="mt-4 flex flex-wrap gap-3"
        >
          <input
            required
            type="email"
            aria-label="Novo e-mail"
            className="input m-0 max-w-sm"
            placeholder="Novo e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button disabled={busy}>Solicitar alteração</Button>
        </form>
      </section>

      <section className="card p-6 sm:p-7">
        <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
          <ShieldCheck className="size-4 text-primary" />
          Segurança
        </h2>
        <p className="my-3 text-sm text-muted-foreground">
          Solicite um link por e-mail para redefinir sua senha com segurança.
        </p>
        <Button
          disabled={busy}
          variant="outline"
          onClick={() => action("recover", { email: profile.email })}
        >
          Enviar recuperação de senha
        </Button>
      </section>

      <section className="card p-6 sm:p-7">
        <h2 className="text-base font-semibold tracking-tight">Atividade recente e auditoria</h2>
        <div className="mt-4 divide-y divide-border">
          {data.audit_logs?.slice(0, 12).map((a) => (
            <div key={a.id} className="flex items-center justify-between py-3 text-xs sm:text-sm">
              <span className="font-medium text-foreground">
                {entityNames[text(a.entity)] || text(a.entity)} ·{" "}
                <span className="text-muted-foreground">
                  {actionNames[text(a.action)] || text(a.action)}
                </span>
              </span>
              <span className="text-muted-foreground tabular">{formatDate(a.created_at)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card border-loss/30 bg-loss/5 p-6 sm:p-7">
        <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-loss">
          <Trash2 className="size-4" />
          Excluir minha conta
        </h2>
        <p className="my-3 text-sm leading-6 text-muted-foreground">
          Remove permanentemente todos os seus registros e anexos. Exporte os relatórios que deseja
          guardar antes de continuar.
        </p>
        <Button
          variant="destructive"
          onClick={() => {
            setDeleting(true);
            setStep(1);
            setPassword("");
            setConfirmation("");
          }}
        >
          Excluir conta
        </Button>
      </section>

      {edit && profile && (
        <Dialog title="Editar perfil" onClose={() => setEdit(false)}>
          <RecordForm entity="profiles" row={profile} data={data} onDone={() => setEdit(false)} />
        </Dialog>
      )}

      {deleting && (
        <Dialog
          title={`Excluir conta · confirmação ${step} de 2`}
          onClose={() => !busy && setDeleting(false)}
        >
          {step === 1 ? (
            <>
              <p className="text-sm leading-6">
                Todos os seus dados financeiros, carteiras, histórico, metas e anexos serão
                removidos. Esta ação é irreversível.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setDeleting(false)}>
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={() => setStep(2)}>
                  Entendi, continuar
                </Button>
              </div>
            </>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void action("delete", { password, confirmation, confirmed: true });
              }}
              className="space-y-4"
            >
              <label className="field-label">
                Senha atual
                <input
                  className="input"
                  required
                  autoComplete="current-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <label className="field-label">
                Digite EXCLUIR MINHA CONTA
                <input
                  className="input"
                  required
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                />
              </label>
              <Button
                disabled={busy || confirmation !== "EXCLUIR MINHA CONTA"}
                variant="destructive"
                className="w-full"
              >
                {busy ? "Excluindo…" : "Excluir permanentemente"}
              </Button>
            </form>
          )}
        </Dialog>
      )}
    </div>
  );
}
