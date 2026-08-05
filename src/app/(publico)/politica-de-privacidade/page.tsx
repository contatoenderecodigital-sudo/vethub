import type { Metadata } from "next";
import Link from "next/link";

// E-mail de contato do controlador/encarregado (DPO).
// TODO: trocar por um e-mail institucional (ex.: privacidade@vethub.com.br) quando existir.
const EMAIL_CONTATO = "yungsandro23@gmail.com";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "Como o VetHub coleta, usa, armazena e protege dados pessoais, em conformidade com a LGPD.",
};

export default function PoliticaDePrivacidadePage() {
  return (
    <article>
      <h1 className="text-2xl font-bold text-ink">Política de Privacidade</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Última atualização: 4 de agosto de 2026
      </p>

      <p className="mt-6 text-sm leading-relaxed text-ink-muted">
        Esta Política de Privacidade explica como o <strong className="text-ink">VetHub</strong>{" "}
        coleta, utiliza, armazena, compartilha e protege dados pessoais no
        contexto da prestação dos seus serviços, em conformidade com a Lei
        Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD). Ao
        utilizar o VetHub, você declara ter lido e compreendido esta política.
      </p>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-ink">1. Quem somos</h2>
      <p className="text-sm leading-relaxed text-ink-muted">
        O VetHub é um sistema web de gestão para clínicas veterinárias
        (software como serviço — SaaS), que reúne em um só lugar agenda de
        atendimentos, prontuário eletrônico, orçamentos e o cadastro de
        tutores (donos) e seus pets. O serviço é oferecido no modelo
        multi-tenant: cada clínica cliente possui um ambiente próprio, com
        dados isolados dos das demais clínicas.
      </p>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-ink">
        2. Papéis na LGPD: controlador e operador
      </h2>
      <p className="text-sm leading-relaxed text-ink-muted">
        A LGPD distingue o <strong className="text-ink">controlador</strong> (quem decide sobre o
        tratamento dos dados) do <strong className="text-ink">operador</strong> (quem trata dados
        em nome do controlador). No VetHub, esses papéis se dividem assim:
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink-muted">
        <li>
          <strong className="text-ink">Dados de tutores e pets:</strong> a clínica veterinária
          cliente é a <strong className="text-ink">controladora</strong> desses dados — é ela quem
          os coleta e decide como usá-los no atendimento. O VetHub atua como{" "}
          <strong className="text-ink">operador</strong>, tratando esses dados exclusivamente
          conforme as instruções da clínica e para viabilizar o funcionamento
          do sistema.
        </li>
        <li>
          <strong className="text-ink">Dados cadastrais da clínica e de seus usuários</strong>{" "}
          (conta, faturamento, acesso): o VetHub é o{" "}
          <strong className="text-ink">controlador</strong> desses dados.
        </li>
      </ul>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">
        Se você é tutor de um pet atendido por uma clínica que usa o VetHub,
        a clínica é a principal responsável pelo tratamento dos seus dados;
        ainda assim, você também pode exercer seus direitos diretamente junto
        ao VetHub, pelo contato indicado na seção 14.
      </p>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-ink">
        3. Quais dados coletamos
      </h2>
      <p className="text-sm leading-relaxed text-ink-muted">
        Tratamos as seguintes categorias de dados, sempre limitadas ao
        necessário para a prestação do serviço:
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink-muted">
        <li>
          <strong className="text-ink">Dados da clínica:</strong> razão social ou nome fantasia,
          CNPJ, endereço e dados de contato.
        </li>
        <li>
          <strong className="text-ink">Dados dos usuários da clínica:</strong> nome, e-mail,
          senha (armazenada de forma criptografada pelo provedor de
          autenticação) e papel/função no sistema (por exemplo, administrador
          ou veterinário).
        </li>
        <li>
          <strong className="text-ink">Dados dos tutores:</strong> nome, CPF, telefone/WhatsApp,
          e-mail e endereço, cadastrados pela clínica para fins de
          atendimento, agendamento e comunicação.
        </li>
        <li>
          <strong className="text-ink">Dados dos pets:</strong> identificação do animal, histórico
          e registros clínicos (prontuário), agendamentos, orçamentos e
          anexos enviados pela clínica, como fotos e PDFs de exames.
        </li>
        <li>
          <strong className="text-ink">Dados técnicos:</strong> registros mínimos necessários à
          segurança e ao funcionamento da aplicação, como cookies essenciais
          de sessão (ver seção 7).
        </li>
      </ul>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-ink">
        4. Finalidades e bases legais
      </h2>
      <p className="text-sm leading-relaxed text-ink-muted">
        Tratamos dados pessoais com as seguintes finalidades e fundamentos
        legais previstos na LGPD:
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink-muted">
        <li>
          <strong className="text-ink">Execução de contrato</strong> (art. 7º, V): prestar o
          serviço contratado pela clínica — manter cadastros, agenda,
          prontuários, orçamentos e anexos; autenticar usuários e operar a
          plataforma.
        </li>
        <li>
          <strong className="text-ink">Legítimo interesse</strong> (art. 7º, IX): garantir a
          segurança da plataforma, prevenir fraudes e abusos, manter
          registros técnicos e aprimorar o serviço, sempre respeitando as
          expectativas legítimas dos titulares.
        </li>
        <li>
          <strong className="text-ink">Consentimento</strong> (art. 7º, I): envio de comunicações
          ao tutor via WhatsApp (confirmações de agendamento, lembretes e
          atendimento), realizado pela clínica mediante consentimento do
          tutor, registrado no momento do cadastro.
        </li>
        <li>
          <strong className="text-ink">Cumprimento de obrigação legal ou regulatória</strong>{" "}
          (art. 7º, II): guarda de registros exigidos por lei, inclusive
          obrigações fiscais e normas aplicáveis à atividade veterinária.
        </li>
      </ul>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-ink">
        5. Com quem compartilhamos dados
      </h2>
      <p className="text-sm leading-relaxed text-ink-muted">
        O VetHub <strong className="text-ink">não vende dados pessoais em nenhuma hipótese</strong>.
        Compartilhamos dados apenas com os prestadores de infraestrutura
        (suboperadores) estritamente necessários à operação do serviço:
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink-muted">
        <li>
          <strong className="text-ink">Supabase:</strong> banco de dados e autenticação, com
          hospedagem na região de São Paulo (AWS sa-east-1).
        </li>
        <li>
          <strong className="text-ink">Vercel:</strong> hospedagem e distribuição da aplicação
          web.
        </li>
        <li>
          <strong className="text-ink">Meta Platforms:</strong> WhatsApp Business Platform
          (Cloud API), utilizada para o envio de mensagens de confirmação de
          agendamento, lembretes e atendimento via WhatsApp, somente quando a
          clínica conecta o próprio número mediante autorização expressa
          (ver seção 6).
        </li>
      </ul>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">
        Além disso, dados podem ser compartilhados quando exigido por lei,
        por ordem judicial ou por requisição de autoridade competente, nos
        limites da legislação aplicável.
      </p>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-ink">
        6. WhatsApp Business Platform
      </h2>
      <p className="text-sm leading-relaxed text-ink-muted">
        O VetHub permite que a clínica conecte seu número de WhatsApp
        Business por meio do fluxo oficial de cadastro incorporado
        (Embedded Signup) da Meta. Ao realizar essa conexão, a clínica
        autoriza que as mensagens trocadas com os tutores (confirmações,
        lembretes e atendimento) trafeguem pela infraestrutura da Meta
        Platforms, na condição de provedora da WhatsApp Business Platform. O
        tratamento de dados realizado pela Meta é regido pelas políticas da
        própria Meta, disponíveis em{" "}
        <a
          href="https://www.facebook.com/privacy/policy"
          target="_blank"
          rel="noopener noreferrer"
          className="link-vidro"
        >
          Política de Privacidade da Meta
        </a>{" "}
        e{" "}
        <a
          href="https://business.whatsapp.com/policy"
          target="_blank"
          rel="noopener noreferrer"
          className="link-vidro"
        >
          Políticas do WhatsApp Business
        </a>
        . O envio de mensagens pela clínica deve respeitar essas políticas e
        o consentimento (opt-in) do destinatário.
      </p>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-ink">7. Cookies</h2>
      <p className="text-sm leading-relaxed text-ink-muted">
        Utilizamos apenas cookies <strong className="text-ink">essenciais de autenticação</strong>{" "}
        (sessão do Supabase), indispensáveis para manter o usuário conectado
        com segurança. Não utilizamos cookies de publicidade, rastreamento
        de terceiros ou perfilamento comercial.
      </p>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-ink">8. Segurança</h2>
      <p className="text-sm leading-relaxed text-ink-muted">
        Adotamos medidas técnicas e organizacionais adequadas para proteger
        os dados pessoais, incluindo:
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink-muted">
        <li>
          Isolamento dos dados por clínica no banco de dados (Row Level
          Security — RLS), impedindo que uma clínica acesse dados de outra;
        </li>
        <li>Criptografia em trânsito (TLS) em todas as comunicações;</li>
        <li>Exigência de senha forte e armazenamento seguro de credenciais;</li>
        <li>
          Controle de acesso por papéis, limitando cada usuário às funções
          compatíveis com sua atribuição na clínica.
        </li>
      </ul>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-ink">
        9. Retenção de dados
      </h2>
      <p className="text-sm leading-relaxed text-ink-muted">
        Mantemos os dados pessoais pelo tempo necessário ao cumprimento das
        finalidades descritas nesta política, enquanto durar a relação
        contratual com a clínica ou conforme exigido por obrigações legais.
        Após o término da finalidade, os dados são excluídos ou
        anonimizados. Cópias de segurança (backups) são eliminadas conforme
        os ciclos das rotinas de backup.
      </p>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-ink">
        10. Direitos do titular (art. 18 da LGPD)
      </h2>
      <p className="text-sm leading-relaxed text-ink-muted">
        O titular de dados pessoais pode exercer, a qualquer momento e
        mediante requisição, os seguintes direitos:
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink-muted">
        <li>Confirmação da existência de tratamento;</li>
        <li>Acesso aos dados;</li>
        <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
        <li>
          Anonimização, bloqueio ou eliminação de dados desnecessários,
          excessivos ou tratados em desconformidade com a LGPD;
        </li>
        <li>
          Portabilidade dos dados a outro fornecedor de serviço, observados
          os segredos comercial e industrial;
        </li>
        <li>
          Eliminação dos dados tratados com base no consentimento, exceto
          nas hipóteses de guarda legal;
        </li>
        <li>
          Informação sobre as entidades públicas e privadas com as quais os
          dados foram compartilhados;
        </li>
        <li>
          Informação sobre a possibilidade de não fornecer consentimento e
          sobre as consequências da negativa;
        </li>
        <li>Revogação do consentimento, nos termos da lei.</li>
      </ul>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">
        Para exercer esses direitos, utilize o contato indicado na seção 14.
        Quando o VetHub atuar como operador, encaminharemos a solicitação à
        clínica controladora e colaboraremos com o atendimento.
      </p>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-ink">
        11. Exclusão de dados
      </h2>
      <p className="text-sm leading-relaxed text-ink-muted">
        A clínica pode excluir cadastros de tutores, pets e registros
        diretamente no sistema. Para excluir a conta completa da clínica ou
        solicitar a exclusão como titular, basta enviar um pedido por
        e-mail; o prazo de atendimento é de até 30 dias. As instruções
        detalhadas estão na página{" "}
        <Link href="/exclusao-de-dados" className="link-vidro">
          Exclusão de Dados
        </Link>
        .
      </p>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-ink">
        12. Transferência internacional de dados
      </h2>
      <p className="text-sm leading-relaxed text-ink-muted">
        O banco de dados principal é hospedado no Brasil (região São
        Paulo). Contudo, alguns prestadores de infraestrutura — como a
        Vercel (hospedagem da aplicação) e a Meta Platforms (WhatsApp
        Business Platform) — podem processar dados fora do Brasil. Nesses
        casos, a transferência ocorre com salvaguardas adequadas, com base
        nos mecanismos previstos nos arts. 33 e seguintes da LGPD e nos
        compromissos contratuais de proteção de dados assumidos por esses
        prestadores.
      </p>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-ink">
        13. Alterações desta política
      </h2>
      <p className="text-sm leading-relaxed text-ink-muted">
        Esta política pode ser atualizada periodicamente para refletir
        mudanças no serviço ou na legislação. A versão vigente estará sempre
        disponível nesta página, com a data da última atualização indicada
        no topo. Em caso de alterações relevantes, comunicaremos as clínicas
        clientes pelos canais de contato cadastrados.
      </p>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-ink">
        14. Contato e encarregado (DPO)
      </h2>
      <p className="text-sm leading-relaxed text-ink-muted">
        Para dúvidas sobre esta política, solicitações relacionadas a dados
        pessoais ou contato com o encarregado pelo tratamento de dados
        pessoais (DPO), escreva para{" "}
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
