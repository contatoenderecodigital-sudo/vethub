# A clínica de demonstração

Para gravar vídeo, mostrar para cliente e ver o sistema como ele vai ser
visto. Sistema vazio não se vende e não se filma: toda tela mostra "nenhum
registro", o painel fica em R$ 0,00 e o kanban da agenda aparece sem um
cartão sequer.

## Como encher

```
node --env-file=.env.local scripts/semear-demo.mjs
node --env-file=.env.local scripts/semear-demo.mjs --limpar   # só apaga
```

É **idempotente**: apaga o que semeou antes e semeia de novo. Rodar duas
vezes não duplica nada.

O alvo é escolhido pelo **e-mail do admin**, e não pelo nome da clínica, para
nunca cair na errada — existe mais de uma "Clinica Vida Animal" no banco.
Trocar com `DEMO_EMAIL=outro@exemplo.com`.

## Como entrar

| Login | Papel |
| --- | --- |
| `demo@vidaanimal.demo` | administrador |
| `ana.vet@vidaanimal.demo` | veterinária |
| `bianca.recepcao@vidaanimal.demo` | recepção — **não vê o dinheiro** |

Senha: `VidaAnimal2026!` (troque com `DEMO_SENHA`).

Existe um login de demonstração separado de propósito: ninguém quer o
próprio e-mail pessoal aparecendo no canto da tela num vídeo que vai para o
site. E a conta da recepção serve para mostrar, na prática, que o sistema
esconde o financeiro de quem não deve ver.

## O que ele semeia

| | |
| --- | --- |
| Equipe | 4 pessoas: admin, 2 veterinários, recepção |
| Cadastros | 12 tutores com endereço, 18 pets com raça, porte, microchip e alergia |
| Catálogo | 30 itens entre serviços e produtos, mais 2 planos de saúde |
| Estoque | 3 compras, 14 lotes, entradas e saídas — inclusive 3 lotes vencendo em 45 dias |
| Agenda | ~700 agendamentos: 13 hoje em todos os status, 12 dias à frente e 90 atrás |
| Prontuário | 50 consultas com queixa, anamnese, exame físico, diagnóstico e conduta |
| Saúde | 60 vacinas e vermífugos, alguns **vencidos** de propósito |
| Receituário | 14 receitas com medicamento, posologia e via |
| Internação | 1 em andamento com evoluções e prescrições, 2 com alta |
| Banho e tosa | 6 fichas com tipo de tosa e temperamento, 18 execuções |
| Vendas | 89 vendas, sendo 18 fiadas |
| Financeiro | 18 contas a receber, 9 a pagar, uma paga pela metade |
| Comissões | 91 lançamentos, parte já paga |
| Planos | 7 assinaturas ativas, uma suspensa |

## Duas decisões que fazem o dado parecer verdade

**As datas são relativas a HOJE.** A agenda de hoje sempre tem movimento, o
caixa sempre está aberto, sempre há vacina vencendo. A demonstração não
envelhece — não existe "rodar de novo porque o dado ficou velho".

**Domingo fecha e sábado é meio expediente.** Movimento igual nos sete dias
da semana é o tipo de detalhe que denuncia dado inventado no primeiro olhar
de quem é do ramo.

E há defeito de propósito: contas vencidas, uma venda fiada em atraso, um
agendamento cancelado, lote perto do vencimento. Clínica sem nenhum problema
não existe, e uma demonstração onde está tudo perfeito não convence ninguém
que trabalha no setor.

## Ela é uma clínica de verdade no banco

Está no mesmo Supabase de produção, então funciona igual em
`vethub-tau.vercel.app`. Não é ambiente separado: se apagar, apagou.
