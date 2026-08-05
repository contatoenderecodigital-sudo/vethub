import type { Metadata } from "next";
import Link from "next/link";

// E-mail de contato do VetHub.
// TODO: trocar por um e-mail institucional (ex.: contato@vethub.com.br) quando existir.
const EMAIL_CONTATO = "yungsandro23@gmail.com";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description:
    "Condições de uso do VetHub, sistema de gestão para clínicas veterinárias.",
};

export default function TermosDeUsoPage() {
  return (
    <article>
      <h1 className="text-2xl font-bold text-ink">Termos de Uso</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Última atualização: 4 de agosto de 2026
      </p>

      <p className="mt-6 text-sm leading-relaxed text-ink-muted">
        Estes Termos de Uso regulam o acesso e a utilização do{" "}
        <strong className="text-ink">VetHub</strong>, sistema web de gestão para clínicas
        veterinárias. Leia-os com atenção antes de criar uma conta ou
        utilizar o serviço.
      </p>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-ink">1. Aceitação</h2>
      <p className="text-sm leading-relaxed text-ink-muted">
        Ao criar uma conta, acessar ou utilizar o VetHub, a clínica e seus
        usuários declaram que leram, compreenderam e concordam com estes
        Termos de Uso e com a{" "}
        <Link
          href="/politica-de-privacidade"
          className="link-vidro"
        >
          Política de Privacidade
        </Link>
        . Caso não concorde com qualquer condição, não utilize o serviço.
      </p>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-ink">
        2. Descrição do serviço
      </h2>
      <p className="text-sm leading-relaxed text-ink-muted">
        O VetHub é um software como serviço (SaaS) de gestão para clínicas
        veterinárias, oferecendo funcionalidades como agenda de
        atendimentos, prontuário eletrônico, orçamentos, cadastro de tutores
        e pets e comunicação via WhatsApp. O serviço está em constante
        evolução: funcionalidades podem ser adicionadas, aprimoradas ou
        descontinuadas ao longo do tempo, sem que isso descaracterize o
        objeto principal do serviço contratado.
      </p>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-ink">
        3. Cadastro e conta
      </h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink-muted">
        <li>
          O cadastro deve ser realizado com informações verdadeiras,
          completas e atualizadas.
        </li>
        <li>
          Cada usuário é responsável pela guarda e pelo sigilo de suas
          credenciais de acesso (e-mail e senha). O VetHub exige senha
          forte, e recomenda-se não reutilizar senhas de outros serviços.
        </li>
        <li>
          Toda atividade realizada com as credenciais de um usuário é de
          responsabilidade desse usuário e da clínica à qual pertence. Em
          caso de suspeita de uso não autorizado, a senha deve ser alterada
          imediatamente e o VetHub deve ser comunicado.
        </li>
      </ul>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-ink">
        4. Responsabilidades da clínica
      </h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink-muted">
        <li>
          Garantir a veracidade e a atualidade dos dados inseridos no
          sistema, inclusive os cadastros de tutores e pets.
        </li>
        <li>
          Obter, na condição de controladora, o consentimento dos tutores
          para o tratamento de seus dados pessoais e para o recebimento de
          comunicações, nos termos da LGPD.
        </li>
        <li>
          Utilizar o serviço de forma lícita, ética e compatível com sua
          finalidade, abstendo-se de práticas que violem direitos de
          terceiros ou a legislação vigente.
        </li>
        <li>
          Não utilizar o VetHub para envio de mensagens não solicitadas
          (spam). As mensagens enviadas via WhatsApp devem observar as
          políticas da Meta e contar com o consentimento prévio (opt-in) do
          destinatário.
        </li>
        <li>
          Responder pelos atos de seus usuários e manter o controle sobre
          quem tem acesso à sua conta.
        </li>
      </ul>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-ink">
        5. Responsabilidades do VetHub
      </h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink-muted">
        <li>
          Manter o serviço disponível em regime de melhor esforço,
          ressalvadas manutenções programadas, casos fortuitos, força maior
          e indisponibilidades de provedores de infraestrutura.
        </li>
        <li>
          Realizar rotinas de backup dos dados armazenados na plataforma.
        </li>
        <li>
          Prestar suporte razoável às clínicas clientes pelos canais de
          contato oficiais.
        </li>
        <li>
          Tratar os dados pessoais conforme a{" "}
          <Link
            href="/politica-de-privacidade"
            className="link-vidro"
          >
            Política de Privacidade
          </Link>{" "}
          e a legislação aplicável.
        </li>
      </ul>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-ink">6. WhatsApp</h2>
      <p className="text-sm leading-relaxed text-ink-muted">
        A funcionalidade de comunicação via WhatsApp depende de a clínica
        possuir conta própria na Meta (Meta Business) e conectar seu número
        por meio do fluxo oficial de cadastro incorporado (Embedded
        Signup), estando sujeita à aprovação e às políticas da Meta,
        inclusive as{" "}
        <a
          href="https://business.whatsapp.com/policy"
          target="_blank"
          rel="noopener noreferrer"
          className="link-vidro"
        >
          Políticas do WhatsApp Business
        </a>
        . O VetHub não controla e não se responsabiliza por restrições,
        suspensões ou bloqueios impostos pela Meta em razão de mau uso do
        canal pela clínica, como envio de mensagens sem consentimento do
        destinatário ou violação das políticas da plataforma.
      </p>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-ink">
        7. Planos e pagamento
      </h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink-muted">
        <li>
          O VetHub pode oferecer um período de teste (trial) gratuito, com
          duração e condições informadas no momento da contratação.
        </li>
        <li>
          Os valores, a periodicidade de cobrança e os recursos incluídos
          seguem o plano contratado pela clínica, conforme divulgado nos
          canais oficiais do VetHub no momento da contratação ou renovação.
        </li>
        <li>
          O não pagamento poderá acarretar a suspensão do acesso ao serviço,
          mediante aviso prévio, até a regularização.
        </li>
      </ul>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-ink">
        8. Propriedade intelectual
      </h2>
      <p className="text-sm leading-relaxed text-ink-muted">
        O software, a marca VetHub, o layout, o código-fonte e os demais
        elementos da plataforma são de titularidade do VetHub ou de seus
        licenciantes e são protegidos pela legislação de propriedade
        intelectual. A contratação do serviço confere à clínica apenas uma
        licença de uso limitada, não exclusiva e intransferível, durante a
        vigência do contrato. Os dados inseridos pela clínica na plataforma
        permanecem de titularidade da clínica.
      </p>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-ink">
        9. Limitação de responsabilidade
      </h2>
      <p className="text-sm leading-relaxed text-ink-muted">
        Na máxima extensão permitida pela lei, o VetHub não responde por
        danos indiretos, lucros cessantes ou perda de dados decorrentes de
        uso indevido do serviço, indisponibilidades causadas por terceiros
        (incluindo provedores de infraestrutura e a Meta), caso fortuito ou
        força maior. O VetHub é uma ferramenta de gestão e não substitui o
        julgamento profissional do médico-veterinário, que permanece o
        único responsável pelas decisões clínicas e pelos registros que
        realiza.
      </p>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-ink">
        10. Privacidade e proteção de dados
      </h2>
      <p className="text-sm leading-relaxed text-ink-muted">
        O tratamento de dados pessoais no âmbito do VetHub é regido pela{" "}
        <Link
          href="/politica-de-privacidade"
          className="link-vidro"
        >
          Política de Privacidade
        </Link>
        , que integra estes Termos para todos os fins. Instruções para
        exclusão de dados estão disponíveis na página{" "}
        <Link href="/exclusao-de-dados" className="link-vidro">
          Exclusão de Dados
        </Link>
        .
      </p>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-ink">
        11. Rescisão e exclusão de conta
      </h2>
      <p className="text-sm leading-relaxed text-ink-muted">
        A clínica pode encerrar sua conta a qualquer momento, solicitando a
        exclusão pelo e-mail{" "}
        <a
          href={`mailto:${EMAIL_CONTATO}`}
          className="link-vidro"
        >
          {EMAIL_CONTATO}
        </a>
        , conforme as instruções da página de{" "}
        <Link href="/exclusao-de-dados" className="link-vidro">
          Exclusão de Dados
        </Link>
        . O VetHub pode suspender ou encerrar contas em caso de violação
        destes Termos, uso ilícito do serviço ou inadimplência, mediante
        comunicação prévia sempre que possível. Encerrada a conta, os dados
        serão excluídos ou anonimizados, ressalvadas as hipóteses de guarda
        legal.
      </p>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-ink">
        12. Alterações destes termos
      </h2>
      <p className="text-sm leading-relaxed text-ink-muted">
        Estes Termos podem ser atualizados periodicamente. A versão vigente
        estará sempre disponível nesta página, com a data da última
        atualização indicada no topo. Alterações relevantes serão
        comunicadas às clínicas pelos canais de contato cadastrados. O uso
        continuado do serviço após a atualização representa concordância com
        os novos termos.
      </p>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-ink">
        13. Lei aplicável e foro
      </h2>
      <p className="text-sm leading-relaxed text-ink-muted">
        Estes Termos são regidos pelas leis da República Federativa do
        Brasil. Fica eleito o foro do domicílio da clínica cliente para
        dirimir eventuais controvérsias, salvo disposição legal em
        contrário. Dúvidas sobre estes Termos podem ser enviadas para{" "}
        <a
          href={`mailto:${EMAIL_CONTATO}`}
          className="link-vidro"
        >
          {EMAIL_CONTATO}
        </a>
        .
      </p>
    </article>
  );
}
