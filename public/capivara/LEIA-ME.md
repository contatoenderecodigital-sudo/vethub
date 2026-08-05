# As imagens do Bento

A capivara do guia ("?" no canto de toda página). Enquanto um arquivo não
existir aqui, o guia mostra uma patinha no lugar e continua funcionando.

## Arquivos esperados

| Arquivo           | Pose na sua folha de personagem      |
| ----------------- | ------------------------------------ |
| `acenando.png`    | acenando com a mão (boas-vindas)     |
| `apontando.png`   | apontando para o lado                |
| `joinha.png`      | polegar para cima                    |
| `prancheta.png`   | segurando a prancheta                |
| `explicando.png`  | mão aberta, explicando               |
| `comemorando.png` | braços para cima, comemorando        |
| `pet.png`         | segurando o cachorrinho              |

Nome tudo minúsculo, sem acento, terminando em `.png`.

## Como exportar

- **Tamanho:** 1024 × 1024 px (quadrado).
- **Formato:** PNG com fundo **transparente** (canal alfa). Nada de fundo
  branco: o balão é escuro e o quadrado branco apareceria.
- **Enquadramento:** capivara inteira, centralizada na horizontal, os pés
  encostando numa linha fixa a ~6% do rodapé, altura do corpo ocupando ~85%
  da altura da folha.
- **Margem:** deixe pelo menos 5% de espaço vazio nas quatro bordas.
- **O mais importante:** a capivara precisa ter **o mesmo tamanho e a mesma
  posição em todas as poses**. É isso que faz ela parecer parada, só trocando
  de gesto, em vez de pular de lugar a cada passo do guia.
- **Peso:** até ~300 KB por arquivo (passe no tinypng.com depois de exportar).

Na tela ela aparece dentro de um quadrado de 96 px (celular) ou 128 px
(computador), com `object-contain` ancorado embaixo — ou seja, a imagem
inteira sempre cabe e **nunca é cortada**; sobra de altura vira espaço vazio.
