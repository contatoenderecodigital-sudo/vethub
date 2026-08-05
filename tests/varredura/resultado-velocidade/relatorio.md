# Velocidade do VetHub

- Endereço: https://vethub-tau.vercel.app
- 2 medidas por item; a tabela mostra a mediana
- Entrar no sistema: 903 ms

Régua: até 500 ms excelente · até 1 s bom · até 2 s aceitável · até 4 s lento

## Abrir a página direto (recarregar)

| Tela | Servidor | Tela pronta | |
| --- | --- | --- | --- |
| `/dashboard` | 30 ms | 363 ms | excelente |
| `/agenda` | 32 ms | 250 ms | excelente |
| `/agenda/kanban` | 31 ms | 292 ms | excelente |
| `/agenda/semana` | 32 ms | 291 ms | excelente |
| `/agenda/mes` | 31 ms | 261 ms | excelente |
| `/consultas` | 35 ms | 269 ms | excelente |
| `/tutores` | 32 ms | 240 ms | excelente |
| `/pets` | 36 ms | 228 ms | excelente |
| `/banho-tosa` | 31 ms | 227 ms | excelente |
| `/internacao` | 32 ms | 250 ms | excelente |
| `/itens` | 31 ms | 249 ms | excelente |
| `/estoque` | 31 ms | 273 ms | excelente |
| `/financeiro` | 37 ms | 255 ms | excelente |
| `/pdv` | 31 ms | 320 ms | excelente |
| `/relatorios` | 31 ms | 261 ms | excelente |
| `/relatorios/faturamento` | 31 ms | 975 ms | bom |

## Trocar de aba pelo menu (o dia a dia)

| Tela | Típico | Pior | |
| --- | --- | --- | --- |
| `/dashboard` | 155 ms | 185 ms | excelente |
| `/agenda` | 490 ms | 496 ms | excelente |
| `/consultas` | 500 ms | 513 ms | bom |
| `/tutores` | 493 ms | 505 ms | excelente |
| `/pets` | 472 ms | 474 ms | excelente |
| `/banho-tosa` | 482 ms | 485 ms | excelente |
| `/internacao` | 487 ms | 490 ms | excelente |
| `/itens` | 494 ms | 498 ms | excelente |
| `/estoque` | 527 ms | 556 ms | bom |
| `/financeiro` | 499 ms | 501 ms | excelente |
| `/pdv` | 549 ms | 559 ms | bom |
| `/relatorios` | 532 ms | 537 ms | bom |
| `/relatorios/faturamento` | 585 ms | 591 ms | bom |

## Criar, editar e apagar

| Ação | Tempo | |
| --- | --- | --- |
| criar fornecedor | 799 ms | bom |
| editar fornecedor | 637 ms | bom |
| apagar fornecedor | 223 ms | excelente |