# As imagens do Bento

A capivara do guia ("?" no canto de toda página). Se algum arquivo faltar, o
guia mostra uma patinha no lugar e continua funcionando.

## Arquivos em uso

| Arquivo                     | Pose                          | Onde aparece                          |
| --------------------------- | ----------------------------- | ------------------------------------- |
| `capivaraacenando.png`      | acenando com a mão            | boas-vindas, primeiro passo            |
| `capivaraapontando.png`     | apontando para o lado         | quando aponta um botão ou uma coluna   |
| `capivarajoinha.png`        | polegar para cima             | despedida de todo roteiro              |
| `capivaraprancheta.png`     | segurando a prancheta         | telas de lista e cadastro              |
| `capivaraexplicando.png`    | mão aberta, explicando        | pose padrão de explicação              |
| `capivarabracopracima.png`  | braços para cima              | comemoração (tema, planos)             |
| `capivaracachorro.png`      | segurando o cachorrinho       | telas de pet, consulta e internação    |

A ligação entre a pose e o arquivo está em `ARQUIVO`, no começo de
`src/components/guia/guia-capivara.tsx`. Para trocar uma arte, basta
substituir o PNG mantendo o nome — nenhum código muda.

## Se for gerar novas poses

- **Tamanho:** 1024 × 1024 px (quadrado).
- **Formato:** PNG com fundo **transparente**. Nada de fundo branco: o balão
  é escuro e o quadrado apareceria.
- **Enquadramento:** capivara inteira, centralizada na horizontal, pés numa
  linha fixa perto do rodapé, corpo ocupando ~85% da altura.
- **O mais importante:** mesmo tamanho e mesma posição do corpo em **todas**
  as poses. É isso que faz ele parecer parado, só trocando de gesto, em vez
  de pular de lugar a cada passo do guia.
- **Peso:** até ~300 KB por arquivo.

Na tela ele aparece dentro de um quadrado de 112 px (celular) ou 144 px
(computador), com `object-contain` ancorado embaixo — a imagem inteira sempre
cabe e **nunca é cortada**; sobra vira espaço vazio.
