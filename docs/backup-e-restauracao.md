# Backup e restauração

Backup que nunca foi restaurado não é backup, é esperança. Este documento
existe para você testar a restauração **uma vez, antes de ter cliente**, e
saber que funciona.

## O que já existe sem você fazer nada

O Supabase faz backup automático do banco. No plano gratuito são **7 dias**
de retenção, com um ponto por dia; nos planos pagos há também
*Point-in-Time Recovery*, que permite voltar a um minuto específico.

O que o backup do Supabase **não** cobre:

| Coberto | Não coberto |
| --- | --- |
| Todas as tabelas e dados | Arquivos do Storage (fotos de pets, anexos) |
| Estrutura, índices, RLS | Variáveis de ambiente da Vercel |
| Funções e gatilhos | O código (mas esse está no GitHub) |

As **fotos e anexos** ficam no Storage e têm backup próprio, separado. Vale
saber disso antes de precisar.

## Restaurar: o procedimento

> Faça este teste uma vez, com calma, **antes de existir cliente**. Depois
> você sabe que funciona e quanto tempo leva.

1. Painel do Supabase → projeto → **Database → Backups**
2. Escolha o ponto e clique em **Restore**
3. O Supabase **cria um projeto novo** com os dados daquele momento — o
   projeto atual não é sobrescrito. É por isso que dá para testar sem medo.
4. Pegue a URL e as chaves do projeto restaurado
5. Rode o VetHub local apontando para ele:

   ```bash
   # .env.local temporário, apontando para o projeto restaurado
   npm run dev
   ```

6. Confira o que interessa: tutores estão lá? vendas do último dia? saldo do
   estoque bate? Se bater, o backup presta.
7. Apague o projeto de teste para não pagar por ele.

## O que conferir depois de restaurar

Não basta o banco abrir. Estas quatro perguntas dizem se o backup é útil:

- [ ] Os tutores e pets estão lá, com telefone e histórico?
- [ ] As **contas a receber** batem com o que você lembra?
- [ ] O saldo de estoque de um item conhecido está certo?
- [ ] O login funciona (o Auth também foi restaurado)?

## Backup manual, quando for mexer em algo grande

Antes de uma migração pesada ou de importar dados em massa, vale um dump seu:

```bash
# precisa da string do pooler em Session mode (a mesma do SUPABASE_DB_URL)
npx supabase db dump --db-url "$SUPABASE_DB_URL" -f backup-antes-da-mudanca.sql
```

Guarde fora do repositório — o arquivo tem dados de cliente e não pode ir
para o GitHub.

## Frequência sugerida

| Quando | O quê |
| --- | --- |
| Agora, uma vez | Teste de restauração completo (o procedimento acima) |
| Antes de migração grande | `db dump` manual |
| A cada 6 meses | Repetir o teste de restauração |
| Ao passar de 10 clínicas | Avaliar o plano pago pelo Point-in-Time Recovery |

O último item é o que mais importa comercialmente: com 7 dias de retenção,
um problema descoberto numa segunda-feira sobre algo que quebrou há dez dias
não tem volta.
