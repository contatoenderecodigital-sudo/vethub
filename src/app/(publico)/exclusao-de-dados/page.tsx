import type { Metadata } from "next";
import Link from "next/link";

// E-mail para pedidos de exclusão de dados e de conta.
// TODO: trocar por um e-mail institucional (ex.: privacidade@vethub.com.br) quando existir.
const EMAIL_CONTATO = "yungsandro23@gmail.com";

export const metadata: Metadata = {
  title: "Exclusão de Dados",
  description:
    "Instruções para excluir dados pessoais e contas do VetHub (Data Deletion Instructions).",
};

export default function ExclusaoDeDadosPage() {
  return (
    <article>
      <h1 className="text-2xl font-bold text-ink">
        Instruções de Exclusão de Dados
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        Última atualização: 4 de agosto de 2026
      </p>

      <p className="mt-6 text-sm leading-relaxed text-ink-muted">
        Esta página explica como excluir dados pessoais armazenados no{" "}
        <strong className="text-ink">VetHub</strong>, seja você uma clínica cliente ou um
        tutor cujos dados foram cadastrados por uma clínica. Ela também
        atende ao requisito de instruções de exclusão de dados da Meta
        Platforms (WhatsApp Business Platform).
      </p>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-ink">
        Como excluir registros individuais (tutor, pet, histórico)
      </h2>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-ink-muted">
        <li>Acesse o VetHub com um usuário da clínica.</li>
        <li>Abra o cadastro do tutor ou do pet que deseja excluir.</li>
        <li>
          Use o botão <strong className="text-ink">Excluir</strong> no cadastro. A exclusão
          apaga o cadastro e todo o histórico vinculado (agendamentos,
          prontuários, orçamentos e anexos).
        </li>
      </ol>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-ink">
        Como excluir a conta completa da clínica
      </h2>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-ink-muted">
        <li>
          Envie um e-mail para{" "}
          <a
            href={`mailto:${EMAIL_CONTATO}`}
            className="link-vidro"
          >
            {EMAIL_CONTATO}
          </a>{" "}
          com o assunto <strong className="text-ink">&quot;Exclusão de conta&quot;</strong>, a
          partir de um e-mail de usuário administrador da clínica.
        </li>
        <li>
          Informe o nome da clínica e confirme que deseja a exclusão
          definitiva da conta e de todos os dados associados.
        </li>
        <li>
          Confirmaremos o recebimento e concluiremos a exclusão em até 30
          dias.
        </li>
      </ol>
      {/* Quem está indo embora precisa saber que pode levar a base junto.
          Descobrir isso depois da exclusão não adianta nada. */}
      <p className="mt-3 text-sm leading-relaxed text-ink-muted">
        <strong className="text-ink">Antes de pedir a exclusão</strong>, baixe o
        que é seu: dentro do sistema, em{" "}
        <em className="text-ink">Configurações → Exportar dados</em>, o
        administrador baixa tutores, pets, prontuários, agenda, vacinas, exames,
        estoque, vendas e financeiro em planilha. Depois da exclusão não há como
        recuperar.
      </p>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-ink">
        Sou tutor: como peço a exclusão dos meus dados?
      </h2>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-ink-muted">
        <li>
          Você pode solicitar a exclusão diretamente à clínica veterinária
          que realizou seu cadastro (ela é a controladora dos seus dados e
          pode excluí-los no próprio sistema); ou
        </li>
        <li>
          Enviar o pedido diretamente ao VetHub pelo e-mail{" "}
          <a
            href={`mailto:${EMAIL_CONTATO}`}
            className="link-vidro"
          >
            {EMAIL_CONTATO}
          </a>
          , informando seu nome e a clínica onde foi atendido. Encaminharemos
          e acompanharemos a solicitação junto à clínica.
        </li>
      </ol>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-ink">
        Prazo de atendimento
      </h2>
      <p className="text-sm leading-relaxed text-ink-muted">
        Pedidos de exclusão são atendidos em{" "}
        <strong className="text-ink">até 30 dias</strong> a contar do recebimento. Dados
        presentes em cópias de segurança (backups) são eliminados conforme os
        ciclos de expiração das rotinas de backup.
      </p>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-ink">
        O que é excluído
      </h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink-muted">
        <li>Dados cadastrais (clínica, usuários, tutores e pets);</li>
        <li>Prontuários, agendamentos e orçamentos;</li>
        <li>Anexos armazenados (fotos e PDFs de exames);</li>
        <li>
          Dados de conexão com o WhatsApp. As mensagens que trafegaram pela
          WhatsApp Business Platform seguem também as políticas de retenção e
          exclusão da Meta.
        </li>
      </ul>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-ink">
        O que pode ser retido
      </h2>
      <p className="text-sm leading-relaxed text-ink-muted">
        Alguns dados podem ser mantidos pelo período exigido por obrigações
        legais ou regulatórias (por exemplo, registros fiscais) ou para o
        exercício regular de direitos em processos, nos termos da LGPD.
        Nesses casos, os dados ficam bloqueados para qualquer outro uso e são
        eliminados ao fim do prazo legal.
      </p>

      <p className="mt-8 text-sm leading-relaxed text-ink-muted">
        Para mais detalhes sobre como tratamos dados pessoais, consulte a{" "}
        <Link
          href="/politica-de-privacidade"
          className="link-vidro"
        >
          Política de Privacidade
        </Link>
        .
      </p>
    </article>
  );
}
