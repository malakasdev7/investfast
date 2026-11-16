"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ArrowRight, LoaderCircle, MailCheck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { api } from "@/hooks/use-finances";
import { authSchema, loginSchema } from "@/lib/validations/entities";

type Mode = "login" | "register" | "recover" | "password";

const copy: Record<Mode, { title: string; subtitle: string; button: string }> = {
  login: {
    title: "Bom ter você de volta.",
    subtitle: "Entre para acompanhar seu dinheiro e seus próximos passos.",
    button: "Entrar na minha conta",
  },
  register: {
    title: "Seu futuro começa aqui.",
    subtitle: "Crie sua conta e dê o primeiro passo para uma vida financeira organizada.",
    button: "Criar minha conta",
  },
  recover: {
    title: "Vamos recuperar seu acesso.",
    subtitle: "Enviaremos as instruções de redefinição para seu e-mail.",
    button: "Enviar link de recuperação",
  },
  password: {
    title: "Escolha uma nova senha.",
    subtitle: "Use uma senha exclusiva com pelo menos 8 caracteres.",
    button: "Salvar nova senha",
  },
};

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const search = useSearchParams();
  const client = useQueryClient();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    setError: fieldError,
    formState: { errors, isSubmitting },
  } = useForm<{ name: string; email: string; password: string; confirm: string }>();

  async function submit(values: {
    name: string;
    email: string;
    password: string;
    confirm: string;
  }) {
    setError("");
    const schema =
      mode === "recover"
        ? z.object({ email: z.email("Informe um e-mail válido.") })
        : mode === "password"
          ? authSchema.pick({ password: true })
          : mode === "register"
            ? authSchema.required({ name: true })
            : loginSchema;

    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      parsed.error.issues.forEach((i) =>
        fieldError(i.path[0] as "email", { message: i.message }),
      );
      return;
    }

    if ((mode === "register" || mode === "password") && values.confirm !== values.password) {
      fieldError("confirm", { message: "As senhas devem ser iguais." });
      return;
    }

    try {
      await api(`/api/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      if (mode === "login" || mode === "password") {
        client.clear();
        router.replace("/dashboard");
        router.refresh();
      } else {
        setSuccess(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível continuar.");
    }
  }

  if (success) {
    return (
      <div className="card space-y-5 p-8">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <MailCheck className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Confira seu e-mail</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Se o endereço puder receber esta solicitação, você encontrará as instruções na
            caixa de entrada. Confira também o spam.
          </p>
        </div>
        <Button asChild className="w-full">
          <Link href="/login">Voltar para o login</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        {copy[mode].title}
      </h1>
      <p className="mt-2.5 text-sm leading-6 text-muted-foreground">
        {copy[mode].subtitle}
      </p>

      <form onSubmit={handleSubmit(submit)} className="mt-7 space-y-4" noValidate>
        {mode === "register" && (
          <label className="field-label">
            Nome
            <input className="input" autoComplete="name" {...register("name")} />
            <span className="field-error">{errors.name?.message}</span>
          </label>
        )}

        {mode !== "password" && (
          <label className="field-label">
            {mode === "login" ? "E-mail ou usuário" : "E-mail"}
            <input
              className="input"
              type={mode === "login" ? "text" : "email"}
              autoComplete={mode === "login" ? "username" : "email"}
              placeholder={mode === "login" ? "Seu usuário ou e-mail" : "voce@exemplo.com"}
              {...register("email")}
            />
            <span className="field-error">{errors.email?.message}</span>
          </label>
        )}

        {mode !== "recover" && (
          <label className="field-label">
            Senha
            <input
              className="input"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              {...register("password")}
            />
            <span className="field-error">{errors.password?.message}</span>
          </label>
        )}

        {(mode === "register" || mode === "password") && (
          <label className="field-label">
            Confirmar senha
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              {...register("confirm")}
            />
            <span className="field-error">{errors.confirm?.message}</span>
          </label>
        )}

        {(error || search.has("error")) && (
          <p
            role="alert"
            className="rounded-xl border border-loss/25 bg-loss/10 px-3.5 py-2.5 text-xs font-medium text-loss"
          >
            {error || "Este link expirou ou já foi utilizado. Solicite um novo."}
          </p>
        )}

        <Button size="lg" className="mt-2 w-full" disabled={isSubmitting}>
          {isSubmitting ? <LoaderCircle className="animate-spin" /> : <ArrowRight />}
          {copy[mode].button}
        </Button>
      </form>

      <div className="mt-6 space-y-2.5 text-center text-sm text-muted-foreground">
        {mode === "login" ? (
          <>
            <p>
              <Link href="/recuperar-senha" className="transition-colors hover:text-primary">
                Esqueci minha senha
              </Link>
            </p>
            <p>
              Ainda não tem conta?{" "}
              <Link className="font-semibold text-primary hover:underline" href="/cadastro">
                Comece gratuitamente
              </Link>
            </p>
          </>
        ) : (
          <Link href="/login" className="font-medium text-primary hover:underline">
            Já tem uma conta? Entre
          </Link>
        )}
      </div>
    </div>
  );
}
