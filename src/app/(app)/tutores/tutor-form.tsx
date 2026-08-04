import { Campo, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { ButtonLink } from "@/components/ui/button";
import type { Tutor } from "@/lib/types";

/** Formulário compartilhado entre criar e editar tutor. */
export function TutorForm({
  action,
  tutor,
  cancelarHref,
  erro,
}: {
  action: (formData: FormData) => Promise<void>;
  tutor?: Tutor;
  cancelarHref: string;
  erro?: string;
}) {
  return (
    <form action={action} className="space-y-4">
      {erro && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>
      )}

      <Campo rotulo="Nome completo" htmlFor="nome" obrigatorio>
        <Input id="nome" name="nome" defaultValue={tutor?.nome} required />
      </Campo>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Telefone (WhatsApp)" htmlFor="telefone" obrigatorio>
          <Input
            id="telefone"
            name="telefone"
            type="tel"
            placeholder="(11) 99999-9999"
            defaultValue={tutor?.telefone}
            required
          />
        </Campo>
        <Campo rotulo="CPF" htmlFor="cpf">
          <Input id="cpf" name="cpf" defaultValue={tutor?.cpf ?? ""} />
        </Campo>
      </div>

      <Campo rotulo="E-mail" htmlFor="email">
        <Input id="email" name="email" type="email" defaultValue={tutor?.email ?? ""} />
      </Campo>

      <Campo rotulo="Endereço" htmlFor="endereco">
        <Input id="endereco" name="endereco" defaultValue={tutor?.endereco ?? ""} />
      </Campo>

      <label className="flex items-start gap-2 rounded-lg border border-edge bg-zinc-50 p-3 text-sm text-ink-muted">
        <input
          type="checkbox"
          name="consentimento_lgpd"
          defaultChecked={tutor?.consentimento_lgpd}
          className="mt-0.5 size-4 accent-[#059669]"
        />
        <span>
          O tutor consentiu com o uso dos seus dados para cadastro e comunicação
          da clínica (LGPD).
        </span>
      </label>

      <div className="flex gap-2 pt-2">
        <SubmitButton>Salvar</SubmitButton>
        <ButtonLink href={cancelarHref} variante="secondary">
          Cancelar
        </ButtonLink>
      </div>
    </form>
  );
}
