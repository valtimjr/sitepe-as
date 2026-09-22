---
title: "Aguardando Serviço na exportação (Copiar Lista / WhatsApp) da página de OS"
summary: "Incluir os períodos de \"Aguardando Serviço\" em ordem cronológica no texto de Copiar Lista e WhatsApp da página de Ordens de Serviço, reaproveitando o cálculo de lacunas que já existe e bloqueando a exportação quando alguma OS/Percurso do dia tiver horário faltando ou inválido. O layout atual continua igual."
status: "completed"
chatId: "16"
createdAt: "2026-08-08T23:34:37.852Z"
updatedAt: "2026-09-22T22:02:26.408Z"
---

## Visão geral

Hoje, na página **Lista de Ordens de Serviço** (`src/pages/ServiceOrderList.tsx`), os botões **Copiar Lista** e **WhatsApp** usam o mesmo formatador de texto, o `formatListText`. A mudança:

1. Calcula os intervalos de **Aguardando Serviço** a partir dos dados estruturados das OS, usando a mesma função que já alimenta os cards e gráficos do "Resumo Diário": `calculateDailyTimesAndGaps` em `shiftService.ts`.
2. Insere esses blocos **em ordem cronológica** entre os blocos de OS/Percurso que já existem, sem mexer no formato deles.
3. **Bloqueia** a exportação e avisa o usuário quando alguma OS ou Percurso do dia tiver horário faltando ou inválido.

Nada é salvo no Supabase e nenhuma consulta nova é feita no clique.

---

## UI/UX

### Formato da exportação (sem mudanças)
O único bloco novo segue o mesmo padrão dos outros:

```
Aguardando Serviço
HH:MM-HH:MM
```

Fica separado por uma linha em branco, como os outros blocos. Não entram emojis, cabeçalhos novos nem mudanças na forma de mostrar AF/OS/Percurso/horário/descrição/peças.

### Quando o Aguardando aparece
| Situação | Comportamento |
|---|---|
| Exportação completa do dia (nenhuma OS marcada) | Valida todas as OS do dia e depois insere os blocos de Aguardando |
| Uma ou mais OS marcadas | **Não inclui Aguardando** e mantém o comportamento atual, sem validação que bloqueie (sua escolha) |
| Dia de Folga ou sem turno resolvido | Nenhum Aguardando, exporta como hoje |
| Nenhuma OS | Continua como hoje (botões desativados) |

### Ordem de exibição
- A lista segue a ordenação atual da tela (`sortedOsList`, ↑ ou ↓).
- Com ordem crescente, cada Aguardando entra logo antes da primeira atividade que começa no fim da lacuna (ou no fim da lista, se for a lacuna final do turno).
- Com ordem decrescente, a sequência completa (atividades + aguardandos) é invertida, então continua cronologicamente coerente.

### Aviso de horário inválido
Uso o **AlertDialog do shadcn**, que a página já importa (hoje sem uso). Assim o texto de várias linhas fica legível, o que num toast ficaria apertado. O fechamento é com um botão "Entendi".

Uma OS com problema:
```
Não é possível calcular corretamente o Aguardando Serviço.

A seguinte ordem de serviço está sem horário:
AF: 33095
OS: 37050

Informe a hora inicial e a hora final antes de exportar.
```
Várias OS:
```
Não é possível calcular corretamente o Aguardando Serviço.

Existem ordens de serviço com horários incompletos:
AF: 33095 — OS: 37050
AF: 42027 — OS: 38794

Corrija os horários antes de exportar.
```
- Percurso aparece como `Percurso (AF: X)` ou `Percurso`.
- Horário invertido ou inválido aparece junto do horário, por exemplo `AF: 33095 — OS: 37050 (15:00-14:00 inválido)`.
- Com o aviso aberto, **nada é copiado e o WhatsApp não é aberto**.

---

## Pontos de atenção

- **Nenhuma lógica de turno nova.** O turno, a janela e as lacunas vêm de `calculateDailyTimesAndGaps(osList, selectedDate, userShift || profile.shift_code)`, exatamente a mesma chamada que já gera o `dailyTimes` da página. Com isso, os totais dos cards e os blocos exportados sempre batem.
- **Dia operacional 07:00 → 06:59:** vem de `timeToOpMinutes`, que já existe. Turno Noite (ex.: 22:00 → 06:00) funciona porque tudo é convertido para minutos operacionais.
- **Hora extra:** a função existente já limita as OS à janela do turno, então não surge Aguardando fora do turno.
- **Sobreposição e lacunas de duração zero:** a função existente já junta intervalos sobrepostos e só cria lacuna quando `início < fim`.
- **Regra de horário válido** (sem regra nova para noite): uma atividade é válida quando `hora_inicio` e `hora_final` existem, estão no formato `HH:MM` e `timeToOpMinutes(início) < timeToOpMinutes(fim)` dentro do dia operacional. Então `23:00-01:00` é válido e `15:00-14:00` é inválido. Um intervalo que atravessa as 07:00 (ex.: `06:00-08:00`) é considerado inválido, porque passa para outro dia operacional.
  - Isso é necessário porque a função atual, ao ver `15:00-14:00`, soma 24h e contaria 23h. A validação bloqueia esse caso antes do cálculo. **A função compartilhada não será alterada**, para não afetar as outras páginas.
- **Dados antigos:** campos `is_percurso`, `agregado` e `numero_agregado` ausentes continuam sendo tratados como hoje. Só horário faltando bloqueia, e só na exportação completa.
- **Nunca invento horários:** nada é preenchido automaticamente.
- **Erro inesperado:** tudo fica dentro de `try/catch`. Se der erro, não sai exportação parcial, aparece o `showError('Não foi possível gerar a exportação.')`, o erro vai para `console.error` e a página continua intacta.

---

## Abordagem técnica

Fluxo único, usado pelos dois botões:

```
osList (dados estruturados)
   ↓ validateExportTimes()        → se houver problema: AlertDialog, para aqui
   ↓ calculateExportIntervals()   → usa calculateDailyTimesAndGaps (existente)
   ↓ lista cronológica [OS | Percurso | Aguardando]
   ↓ formatListText()             → formatador existente + 1 caso novo
   ↓
 Copiar  /  WhatsApp
```

### Novo arquivo `src/lib/serviceOrderExport.ts` (funções puras, sem React e sem Supabase)
- `validateExportTimes(osList): InvalidTimeEntry[]`
  - Aponta como problema: `hora_inicio` ou `hora_final` nulo/vazio, formato diferente de `HH:MM`, ou `opStart >= opEnd`.
  - Retorna `{ af, os, isPercurso, reason: 'missing' | 'invalid', hora_inicio, hora_final }`.
- `calculateExportIntervals(allDayOs, displayOrder, date, shiftRef): ExportEntry[]`
  - `ExportEntry = { kind: 'activity', os } | { kind: 'waiting', start, end }`
  - Chama `calculateDailyTimesAndGaps(allDayOs, date, shiftRef)` e pega `waitingIntervals`.
  - Constrói a sequência crescente: para cada lacuna (em minutos operacionais), coloca antes da primeira atividade cujo `opStart >= opEnd da lacuna`; o que sobrar vai para o fim. Se `displayOrder === 'desc'`, inverte o resultado.
  - Não inclui lacunas com duração ≤ 0 (segurança extra).
- `buildInvalidTimesMessage(entries): { title, lines[] }`, que monta o texto do aviso no formato pedido.

### Mudanças em `src/pages/ServiceOrderList.tsx` (a menor alteração possível)
- `formatListText(items)` passa a receber `ExportEntry[]`. Blocos `activity` usam **exatamente o código atual**. Blocos `waiting` geram `Aguardando Serviço\n${start}-${end}\n`. O separador `\n` entre blocos continua igual.
- Novo helper interno `buildExportText(): string | null`:
  - Se houver seleção: `entries = targetItems.map(activity)` (sem Aguardando, como hoje).
  - Se não houver: `validateExportTimes(osList)`. Com problemas, abre o AlertDialog e retorna `null`. Sem problemas, `calculateExportIntervals(osList, sortDirection, selectedDate, userShift || profile?.shift_code)`.
  - Chama `formatListText(entries)`, tudo dentro de `try/catch`.
- `handleCopyList` e `handleShareOnWhatsApp` passam a chamar `buildExportText()`. Se o retorno for `null`, param. O resto (clipboard, `wa.me`, toasts) continua igual.
- Novo estado `invalidTimesDialog` + um `<AlertDialog>` para o aviso.
- **O PDF não muda** (fora do escopo).

---

## Passos de implementação
1. Criar `src/lib/serviceOrderExport.ts` com `validateExportTimes`, `calculateExportIntervals` e `buildInvalidTimesMessage`, reaproveitando `calculateDailyTimesAndGaps` e `timeToOpMinutes` de `shiftService.ts`.
2. Em `ServiceOrderList.tsx`, adaptar `formatListText` para `ExportEntry[]`, mantendo intacto o texto das atividades.
3. Adicionar `buildExportText` e ligar os dois botões a ele.
4. Adicionar o estado e o `AlertDialog` do aviso de horários.
5. Rodar a checagem de tipos.

## Arquivos
- **Novo:** `src/lib/serviceOrderExport.ts`
- **Alterado:** `src/pages/ServiceOrderList.tsx`
- **Não alterados:** `shiftService.ts`, `utils.ts`, PDF, AdminReportPage e banco

---

## Estratégia de testes (verificação matemática)
Conferir os cenários abaixo comparando os valores esperados com a saída de Copiar e de WhatsApp (que usam o mesmo `buildExportText`, então o texto é idêntico):

1. **Exemplo do enunciado**, turno 07:00–15:00 → `10:20-11:00` antes do Percurso 11:00, e `14:10-15:00` no fim.
   - Atenção: com esses dados, a função atual também gera `09:40-10:00` e `11:25-12:00`, porque são lacunas reais. O seu exemplo não mostrava essas duas, mas elas vão aparecer, já que a regra é a mesma do Resumo Diário.
2. Primeira OS às 08:30 → `07:00-08:30` no topo.
3. Atividades encostadas (07–09, 09–11, 11–15) → nenhum Aguardando.
4. OS 10:00–10:30 + Percurso 10:30–11:00 + OS 11:30–12:00 → só `11:00-11:30`.
5. Sobreposição OS 10:00–11:00 + Percurso 10:30–11:30 → nenhuma lacuna negativa, período ocupado 10:00–11:30.
6. Hora extra: OS 14:00–16:00 com turno até 15:00 → nenhum Aguardando depois de 15:00.
7. Turno Noite 22:00–06:00 com OS 22–23 e 01–02 → `23:00-01:00` e `02:00-06:00`.
8. OS sem `hora_final` / Percurso sem `hora_inicio` / `15:00-14:00` → aviso e **nada** copiado nem aberto.
9. Com OS selecionadas → texto igual ao de hoje, sem Aguardando.
10. Ordem decrescente → sequência invertida e coerente.
11. Folga → exportação sem Aguardando.
12. Soma dos Aguardando exportados = card "Aguardando Serviço" da página.
