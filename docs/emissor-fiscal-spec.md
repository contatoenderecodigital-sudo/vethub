# VetFiscal: especificação para construir o emissor próprio

Documento de construção. Entregue este arquivo a um agente de código junto
com acesso ao servidor. Escrito em 04/08/2026.

**O que é:** um serviço HTTP separado do VetHub que emite NF-e, NFC-e e
NFS-e. O VetHub (e, no futuro, outros clientes) fala com ele por uma API
REST simples e nunca precisa saber o que é XML, SEFAZ ou certificado.

**Onde roda:** servidor próprio com aaPanel. Não roda na Vercel, precisa de
disco persistente para os certificados, conexões SOAP longas e execução sem
limite de tempo.

---

## 1. Decisão de stack, e por que

**PHP 8.3 + Laravel 11 + a biblioteca `nfephp-org/sped-nfe`.**

Motivos, sem romantismo:

- **`sped-nfe` é a única biblioteca brasileira madura e viva** para NF-e/NFC-e.
  Resolve assinatura XMLDSig, comunicação SOAP com as 27 SEFAZ, contingência,
  cancelamento, inutilização, carta de correção e leitura de retorno. Licença
  permissiva. Escrever isso do zero em Node seria refazer anos de trabalho.
- **aaPanel é nativamente PHP**: instala PHP, Nginx, MySQL, SSL e cron pelo
  painel, sem dor.
- Node/TypeScript **não tem equivalente maduro** para NF-e. Insistir em Node
  significaria portar o `sped-nfe` inteiro.

Pacotes:

```
composer require nfephp-org/sped-nfe      # NF-e e NFC-e
composer require nfephp-org/sped-da       # DANFE (PDF) e DANFCE
composer require nfephp-org/sped-common   # utilidades compartilhadas
```

Para **NFS-e**, ver a seção 6, a estratégia é diferente.

---

## 2. Arquitetura

```
VetHub (Next.js na Vercel)
   │  HTTPS + chave de API
   ▼
VetFiscal (Laravel no seu servidor aaPanel)
   ├── API REST          → recebe pedidos de emissão
   ├── Fila (queue)      → processa em segundo plano
   ├── Cofre de certificados (disco criptografado)
   └── sped-nfe          → fala com as SEFAZ
         ▼
    SEFAZ estaduais / prefeituras
```

Regras de ouro:

1. **A emissão é assíncrona.** O VetHub pede, recebe um `id` e um status
   `processando`. Um webhook avisa quando autoriza. A SEFAZ pode demorar ou
   cair. Nunca deixe o usuário esperando numa requisição HTTP.
2. **O VetFiscal nunca conhece o VetHub.** Ele é genérico: recebe emitente,
   destinatário e itens. Isso é o que permite vender para contabilidades depois.
3. **Toda emissão é auditável**: guarde o XML enviado, o XML de retorno e o
   protocolo, por 5 anos (a legislação exige).

---

## 3. Preparação do servidor (aaPanel)

No painel:

1. **Website** → adicionar domínio (ex.: `fiscal.seudominio.com.br`) com PHP 8.3
2. **SSL** → Let's Encrypt, com "Force HTTPS" ligado
3. **App Store** → instalar **Redis** (fila) e **MySQL 8** (ou usar Postgres)
4. **PHP → Extensões**: habilitar `openssl`, `soap`, `curl`, `dom`, `mbstring`,
   `gd`, `zip`, `intl`. **Sem `openssl` e `soap` nada funciona.**
5. **PHP → Configuração**: `max_execution_time = 300`, `memory_limit = 512M`
6. **Cron** → adicionar: `* * * * * cd /www/wwwroot/vetfiscal && php artisan schedule:run`
7. **Supervisor** (App Store) → criar processo para a fila:
   `php /www/wwwroot/vetfiscal/artisan queue:work --tries=3 --timeout=300`

Pasta dos certificados **fora do diretório público**:

```
/www/certificados/          chmod 700, dono do usuário do PHP
```

---

## 4. Banco de dados

```sql
-- Cada cliente do VetFiscal (uma clínica, um petshop, uma empresa qualquer)
CREATE TABLE emitentes (
  id CHAR(36) PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  cnpj VARCHAR(14) NOT NULL,
  inscricao_estadual VARCHAR(20),
  inscricao_municipal VARCHAR(20),
  regime_tributario TINYINT NOT NULL,   -- 1=Simples, 2=Simples excesso, 3=Normal
  cnae VARCHAR(7),
  -- endereço completo (obrigatório na NF-e)
  logradouro VARCHAR(255), numero VARCHAR(20), complemento VARCHAR(100),
  bairro VARCHAR(100), municipio VARCHAR(100), codigo_municipio CHAR(7),
  uf CHAR(2), cep CHAR(8), telefone VARCHAR(20),
  ambiente TINYINT DEFAULT 2,           -- 1=produção, 2=homologação
  certificado_arquivo VARCHAR(255),     -- caminho do .pfx
  certificado_senha TEXT,               -- criptografada (Laravel Crypt)
  certificado_validade DATE,
  serie_nfe SMALLINT DEFAULT 1,
  proximo_numero_nfe INT DEFAULT 1,
  serie_nfce SMALLINT DEFAULT 1,
  proximo_numero_nfce INT DEFAULT 1,
  csc VARCHAR(50),                      -- código de segurança do contribuinte (NFC-e)
  csc_id VARCHAR(10),
  webhook_url VARCHAR(500),
  ativo BOOLEAN DEFAULT 1,
  created_at TIMESTAMP, updated_at TIMESTAMP
);

CREATE TABLE api_tokens (
  id CHAR(36) PRIMARY KEY,
  emitente_id CHAR(36) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,     -- hash, nunca o token puro
  nome VARCHAR(100),
  ultimo_uso TIMESTAMP NULL,
  revogado_em TIMESTAMP NULL,
  INDEX (token_hash)
);

CREATE TABLE notas (
  id CHAR(36) PRIMARY KEY,
  emitente_id CHAR(36) NOT NULL,
  tipo ENUM('nfe','nfce','nfse') NOT NULL,
  referencia_externa VARCHAR(100),      -- id da venda no sistema do cliente
  numero INT, serie SMALLINT,
  chave CHAR(44),
  status ENUM('processando','autorizada','rejeitada','cancelada','denegada','erro')
    DEFAULT 'processando',
  protocolo VARCHAR(20),
  motivo TEXT,                          -- mensagem da SEFAZ
  codigo_status SMALLINT,               -- cStat
  valor_total DECIMAL(15,2),
  xml_envio LONGTEXT,
  xml_retorno LONGTEXT,
  danfe_pdf VARCHAR(255),
  payload_original JSON,                -- o que o cliente mandou
  emitida_em TIMESTAMP NULL,
  cancelada_em TIMESTAMP NULL,
  created_at TIMESTAMP, updated_at TIMESTAMP,
  UNIQUE KEY (emitente_id, referencia_externa),  -- idempotência
  INDEX (emitente_id, status), INDEX (chave)
);

CREATE TABLE eventos_nota (
  id CHAR(36) PRIMARY KEY,
  nota_id CHAR(36) NOT NULL,
  tipo ENUM('cancelamento','carta_correcao','inutilizacao'),
  justificativa TEXT,
  protocolo VARCHAR(20),
  xml LONGTEXT,
  created_at TIMESTAMP
);
```

**Idempotência é obrigatória:** a chave única `(emitente_id, referencia_externa)`
impede emitir a mesma venda duas vezes se o cliente repetir a chamada. Nota
duplicada dá dor de cabeça fiscal séria.

---

## 5. API REST: o contrato

Autenticação: `Authorization: Bearer <token>`. Todas as respostas em JSON.

### `POST /v1/emitentes`
Cadastra um emitente. Retorna `id` e um token de API.

### `POST /v1/emitentes/{id}/certificado`
`multipart/form-data` com `arquivo` (.pfx) e `senha`.
Valida abrindo o certificado com `openssl_pkcs12_read`, extrai CNPJ e validade,
confere se o CNPJ bate com o do emitente, grava a senha criptografada e o
arquivo em `/www/certificados/{emitente_id}.pfx`.
Responde com `{validade, cnpj, titular}`.

### `POST /v1/nfe`
```jsonc
{
  "referencia_externa": "venda-1234",     // idempotência
  "natureza_operacao": "Venda de mercadoria",
  "presenca": 1,                          // 1=presencial, 9=não presencial
  "destinatario": {
    "cpf_cnpj": "12345678901",
    "nome": "Maria Souza",
    "email": "maria@exemplo.com",
    "indicador_ie": 9,                    // 9=não contribuinte
    "endereco": { "logradouro": "...", "numero": "10", "bairro": "...",
                  "codigo_municipio": "3550308", "municipio": "São Paulo",
                  "uf": "SP", "cep": "01001000" }
  },
  "itens": [
    {
      "codigo": "VAC-V10",
      "descricao": "Vacina V10",
      "ncm": "30021500",                  // obrigatório
      "cfop": "5102",
      "unidade": "UN",
      "quantidade": 1,
      "valor_unitario": 90.00,
      "origem": 0,                        // 0=nacional
      "csosn": "102",                     // Simples Nacional
      "cst_pis": "07", "cst_cofins": "07"
    }
  ],
  "pagamentos": [ { "forma": "01", "valor": 90.00 } ],  // 01=dinheiro, 03=cartão crédito, 17=PIX
  "informacoes_complementares": "Atendimento veterinário"
}
```
Resposta imediata: `202 Accepted` com `{ "id": "...", "status": "processando" }`.

### `GET /v1/notas/{id}`
Situação atual, com `chave`, `protocolo`, `motivo`, e links para XML e DANFE.

### `GET /v1/notas/{id}/danfe` e `/xml`
Baixa o PDF e o XML autorizado.

### `POST /v1/notas/{id}/cancelar`
`{ "justificativa": "texto com no mínimo 15 caracteres" }`
Só até 24 h após a autorização (prazo da NF-e).

### `POST /v1/notas/{id}/carta-correcao`
`{ "correcao": "texto" }`. Não corrige valor, destinatário nem data.

### `POST /v1/inutilizacoes`
`{ "serie": 1, "numero_inicial": 10, "numero_final": 12, "justificativa": "..." }`

### `GET /v1/status-sefaz?uf=SP`
Consulta se o serviço da SEFAZ está no ar. Use antes de emitir em lote.

### Webhook
Quando a nota muda de status, o VetFiscal faz `POST` na `webhook_url` do
emitente com `{id, referencia_externa, status, chave, motivo}` e um cabeçalho
`X-VetFiscal-Signature` = HMAC-SHA256 do corpo com o token do emitente.
Reenvie com backoff (1 min, 5 min, 30 min, 2 h, 6 h) até receber 2xx.

---

## 6. NFS-e: a parte difícil, e a boa notícia

NF-e tem 27 destinos. NFS-e tinha milhares, **cada prefeitura com seu padrão**.

**A boa notícia:** existe o **Padrão Nacional da NFS-e** (gov.br), com API REST
única e adesão crescente dos municípios. Onde o município aderiu, você emite
por um endpoint só, com o mesmo XML, muda tudo de figura.

**O plano:**

1. **Comece pelo Padrão Nacional.** Consulte a documentação oficial em
   `https://www.gov.br/nfse` e o ambiente de homologação. Cadastre-se como
   integrador. Verifique **antes** se as cidades dos seus primeiros clientes já
   aderiram (existe lista pública de municípios conveniados).
2. **Para município não aderente**, implemente sob demanda:
   - Primeiro os padrões **ABRASF 2.04 / 2.02 / 1.0**, cobrem boa parte dos
     municípios com um único código parametrizado por URL e pequenas variações.
   - Padrão proprietário (São Paulo capital, Curitiba e outros) só quando um
     cliente daquela cidade aparecer. **Não tente cobrir tudo de antemão**,
     é assim que projetos assim morrem.
3. Estruture como **driver**: uma interface `ProvedorNfse` com implementações
   `PadraoNacional`, `Abrasf204`, `Abrasf202`, `SaoPaulo`... e um mapa
   `codigo_municipio → driver`. Município sem driver retorna erro claro
   ("município ainda não suportado"), nunca falha silenciosa.

Bibliotecas de apoio: `nfephp-org/sped-nfse-*` (há um pacote por padrão).

---

## 7. Segurança: leve a sério, é certificado dos outros

- **Certificados fora do webroot**, `chmod 700`, dono do usuário do PHP.
- **Senha do certificado criptografada** com a `APP_KEY` do Laravel
  (`Crypt::encryptString`), nunca em texto puro nem em log.
- **Nunca logue** o conteúdo do .pfx, a senha ou o XML assinado completo.
- **Token de API guardado como hash** (`hash('sha256', $token)`), mostrado ao
  cliente só uma vez, na criação.
- **Rate limit** por token (ex.: 60 requisições por minuto).
- **Isolamento**: toda consulta filtra por `emitente_id` do token. Escreva um
  teste que tenta ler nota de outro emitente e confirma que falha, igual ao
  teste de isolamento do VetHub.
- **Alerta de validade**: rotina diária que avisa emitentes com certificado
  vencendo em 30, 15 e 7 dias. Certificado vencido = clínica sem faturar.
- **Backup** do banco e da pasta de certificados, criptografado e fora do
  servidor. O aaPanel tem agendamento de backup nativo.

---

## 8. Ordem de construção (não pule etapas)

**Fase 1: fundação (1 a 2 semanas)**
Laravel instalado, banco criado, autenticação por token, cadastro de emitente,
upload e validação de certificado. Sem emitir nada ainda.

**Fase 2: NF-e em homologação (2 a 4 semanas)**
`sped-nfe` configurado, montagem do XML, assinatura, envio ao ambiente de
**homologação** (`ambiente = 2`), tratamento do retorno, consulta de status.
Emita dezenas de notas de teste até entender as rejeições comuns
(NCM inválido, CFOP errado, destinatário sem IE, certificado vencido).

**Fase 3: DANFE e eventos (1 semana)**
PDF com `sped-da`, cancelamento, carta de correção, inutilização.

**Fase 4: NFC-e (1 semana)**
Mesma base, mais CSC/QR Code e contingência offline.

**Fase 5: NFS-e Padrão Nacional (2 a 3 semanas)**
Só depois que NF-e estiver sólida.

**Fase 6: produção (1 semana)**
Trocar para `ambiente = 1`, monitoramento, alertas, fila com retry, webhook.

**Fase 7: integração com o VetHub**
Eu implemento o cliente do lado do VetHub (seção 9).

Realista: **2 a 4 meses** para NF-e + NFC-e + NFS-e nacional funcionando bem,
trabalhando com foco. Some manutenção contínua (notas técnicas da SEFAZ e a
Reforma Tributária mexendo no layout até 2033).

---

## 9. O lado do VetHub: o que eu faço aqui

Quando o VetFiscal estiver de pé, eu crio no VetHub:

- `src/lib/fiscal/emissor.ts`: interface `EmissorFiscal` com
  `emitirNfe`, `emitirNfse`, `consultar`, `cancelar`
- `src/lib/fiscal/vetfiscal.ts`: implementação que chama a sua API
- `src/app/api/fiscal/webhook/route.ts`: recebe o aviso de autorização,
  valida o HMAC e atualiza a nota no banco
- Migração com a tabela `nota_fiscal` (referência, status, chave, links)
- Tela em Configurações para cadastrar certificado e dados fiscais da clínica
- Botão "Emitir nota" no detalhe da venda e do orçamento

**Por causa da interface, trocar de fornecedor ou usar o seu emissor é mudar
uma linha.** Se quiser lançar o VetHub antes do VetFiscal ficar pronto, dá pra
plugar um emissor de mercado provisoriamente e migrar depois sem reescrever nada.

---

## 10. Armadilhas conhecidas

| Erro | O que acontece | Como evitar |
|---|---|---|
| Emitir sem idempotência | Nota duplicada, dor fiscal | Chave única na referência externa |
| Numeração fora de ordem | SEFAZ rejeita | Sequência transacional com lock |
| Emitir sem checar SEFAZ | Timeout em cascata | Consultar status antes de lote |
| Certificado vencendo | Clínica para de faturar | Alerta em 30/15/7 dias |
| Não guardar o XML | Multa na fiscalização | Guardar envio e retorno por 5 anos |
| Testar em produção | Nota real inválida | `ambiente = 2` até a Fase 6 |
| NCM/CFOP chutado | Rejeição constante | Tabela de itens com NCM certo desde o cadastro |
| Fila sem retry | Nota some quando a SEFAZ cai | Fila com backoff e alerta |

---

## 11. Referências

- Portal da NF-e (manuais, notas técnicas, webservices por UF):
  https://www.nfe.fazenda.gov.br/portal/
- `sped-nfe`: https://github.com/nfephp-org/sped-nfe
- `sped-da` (DANFE): https://github.com/nfephp-org/sped-da
- Padrão Nacional da NFS-e: https://www.gov.br/nfse
- Fórum ACBr (a melhor comunidade brasileira do assunto):
  https://www.projetoacbr.com.br/forum/
- Tabela de códigos de município (IBGE) e NCM (Receita Federal)

> Consulte um contador para as regras tributárias do seu estado e do CNAE
> veterinário. Este documento cobre a parte técnica; a parte fiscal (CFOP,
> CST/CSOSN, alíquotas) depende do regime e da atividade de cada cliente.
