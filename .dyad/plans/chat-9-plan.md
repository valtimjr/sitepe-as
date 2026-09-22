---
title: "Implementação do \"Aguardando Serviço\" na Tela e Relatórios de OS"
summary: "Plano detalhado para implementação do 'Aguardando Serviço' com cálculo automático baseado em turno, escala, dia operacional e cor verde #16a34a nos gráficos e relatórios."
status: "accepted"
chatId: "9"
createdAt: "2026-08-07T22:42:19.134Z"
updatedAt: "2026-08-07T22:48:52.585Z"
---

## Overview

Implementar a funcionalidade **"Aguardando Serviço"** na tela e nos relatórios de Ordem de Serviço (OS). A funcionalidade calcula e identifica automaticamente os períodos dentro do horário oficial de trabalho (turno) do funcionário nos quais **não existe OS nem outro apontamento (como Percurso)** registrado.

### Principais Características
- **Cálculo Derivado Automático:** Não insere registros falsos no banco de dados Supabase; o tempo em "Aguardando Serviço" é derivado dinamicamente das OSs existentes + regras de turno/escala + percurso.
- **Respeito Estreito ao Horário do Turno:** Lacunas de tempo só são classificadas como "Aguardando Serviço" se estiverem estritamente dentro do horário oficial do turno. Horas extras, folgas ou períodos fora do turno jamais geram "Aguardando Serviço".
- **Respeito ao Dia Operacional e Turno Noturno:** Respeita o dia operacional padrão do sistema (07:00 às 06:59 do dia seguinte) e calcula adequadamente turnos que atravessam a meia-noite (ex: 22:00 às 06:00).
- **Identidade Visual Consistente:** Cor oficial **VERDE (`#16a34a` / `text-green-600`)** para representar "Aguardando Serviço" em todas as telas, cards, gráficos, tooltips e relatórios PDF.
- **Normalização de Intervalos:** Trata sobreposições de OS/Percurso e horários adjacentes evitando contagem duplicada ou intervalos negativos.

---

## UI/UX Design

### 1. Resumo Diário (Card/Cabeçalho)
- Exibição em destaque de 4 métricas claras:
  - **Horas em OS** (Azul)
  - **Percurso** (Vermelho)
  - **Aguardando Serviço** (Verde `#16a34a`)
  - **Total Geral**
- Layout adaptativo para desktop e dispositivos móveis (mobile-friendly).

### 2. Gráficos de Desempenho (Diário e Mensal)
- **Desempenho Diário (Gráfico Rosca/Donut):**
  - Fatia correspondente às OSs (Tonalidades de Azul), Percurso (Vermelho `#ef4444`) e Aguardando Serviço (Verde `#16a34a`).
  - Tooltip informativo apresentando o nome da categoria, faixa de horário e tempo formatado (ex: `07:00 - 07:30 (00:30)` ou `Aguardando Serviço: 02:00`).
- **Desempenho Mensal (Gráfico de Barras Empilhadas):**
  - Barras empilhadas com 3 segmentos visuais: OS (Azul), Percurso (Vermelho) e Aguardando Serviço (Verde `#16a34a`).
  - Tooltip personalizado detalhando os minutos/horas de cada uma das 3 categorias para o dia selecionado.

### 3. Histórico do Período e Linha do Tempo
- Para visualizações que exibem o progresso do dia, os intervalos de "Aguardando Serviço" serão representados em verde, indicando visualmente as lacunas dentro da jornada prevista (ex: `07:00 - 08:00 🟢 Aguardando`, `08:00 - 10:00 🔵 OS`, `10:00 - 11:00 🔴 Percurso`, `11:00 - 17:00 🟢 Aguardando`).

### 4. Relatórios do Administrador e Exportação em PDF
- Tabela de resumo e gráficos no Admin Report incorporando "Aguardando Serviço".
- Documento PDF exportado incluirá a linha "Aguardando Serviço" na tabela "Resumo do Período", mantendo a formatação e legibilidade.

---

## Considerations & Edge Cases

1. **Dias de Folga:** Se a escala ou o turno indicar `status === 'Folga'`, o valor de "Aguardando Serviço" será exatamente `00:00`.
2. **Trabalho Fora do Turno / Hora Extra:** Se um funcionário registrar uma OS das 17:00 às 20:00 (sendo o turno das 07:00 às 17:00), o intervalo fora do turno (17:00 às 20:00) permanece como OS normal e nenhum "Aguardando Serviço" é criado nem no intervalo 17:00–17:00 nem após as 17:00.
3. **OS / Percurso Sobrepostos ou Adjacentes:** Se existirem duas OSs (ex: 08:00–10:00 e 09:30–11:00), o algoritmo primeiro mesclará o período ocupado para 08:00–11:00 e então calculará as lacunas restantes do turno.
4. **Turno Noturno (Meia-noite):** Normalização matemática utilizando minutos operacionais desde as 07:00. Por exemplo, num turno 22:00–06:00:
   - 22:00 = 15 horas após 07:00 = 900 min.
   - 06:00 (dia seguinte) = 23 horas após 07:00 = 1380 min.
5. **Compatibilidade Retroativa:** Registros antigos sem novos campos ou com estruturas simplificadas serão tratados com checagens de `null`/`undefined`/`Array.isArray`, garantindo que nenhuma tela quebre ou omita registros legados.

---

## Technical Approach

### Centralização do Cálculo (`Single Source of Truth`)
Criaremos uma função utilitária central reutilizável em `src/services/shiftService.ts` e exportada para o resto da aplicação:

```typescript
export interface DailyTimesBreakdown {
  osMinutes: number;
  percursoMinutes: number;
  waitingMinutes: number;
  totalMinutes: number;
  waitingIntervals: Array<{ start: string; end: string; durationMinutes: number }>;
  shiftInfo: { entry?: string; exit?: string; status?: string; shiftName: string };
}

export function calculateDailyTimesAndGaps(
  osList: ServiceOrderData[],
  date: Date,
  shiftOrTurn?: any
): DailyTimesBreakdown
```

#### Passos do Algoritmo:
1. **Determinar Horário do Turno:**
   - Obter `{ entry, exit, status }` a partir do `getShiftSchedule(date, turnName)` ou dados de turno do usuário.
   - Se `status === 'Folga'` ou sem entrada/saída, retornar `waitingMinutes = 0` e `waitingIntervals = []`.
2. **Converter para Minutos Operacionais (Base 07:00):**
   - Para um horário `HH:MM`, calcular minutos em relação a 07:00:
     `opMinutes = (h - 7 + (h < 7 ? 24 : 0)) * 60 + m`
3. **Limitar e Normalizar Intervalos Ocupados:**
   - Mapear cada OS e Percurso para seu intervalo `[startOp, endOp]`.
   - Limitar o intervalo ao início e fim do turno (`clampedStart = Math.max(start, shiftStart)`, `clampedEnd = Math.min(end, shiftEnd)`).
   - Filtrar apenas intervalos onde `clampedStart < clampedEnd`.
   - Ordenar por `clampedStart` e mesclar sobreposições/adjacências.
4. **Encontrar Lacunas (Aguardando Serviço):**
   - Iterar sobre os intervalos mesclados do turno.
   - Todo espaço entre o ponteiro atual e o início do próximo intervalo ocupado (ou fim do turno) torna-se um intervalo de "Aguardando Serviço".
5. **Calcular Totais Sem Dupla Contagem:**
   - `osMinutes`: Soma das durações das OSs normais.
   - `percursoMinutes`: Soma das durações de Percurso.
   - `waitingMinutes`: Soma das durações das lacunas de Aguardando Serviço.
   - `totalMinutes`: União normalizada de todo tempo ocupado + tempo aguardando.

---

## Implementation Steps

### Passo 1: Motor de Cálculo Central em `shiftService.ts`
- Implementar a função `calculateDailyTimesAndGaps` em `src/services/shiftService.ts`.
- Adicionar suporte a resolução de turno do usuário através do `profile.shift_code` e da tabela `shifts` ou das constantes de turno (`Turno A`, `Turno B`, `Turno C`, etc.).
- Garantir exportação para `src/lib/utils.ts` ou uso direto em todos os componentes.

### Passo 2: Atualização do Resumo e Gráficos (`ServiceOrderCharts.tsx`)
- Atualizar a preparação de dados do **Gráfico Rosca (Desempenho Diário)** para incluir fatias de "Aguardando Serviço" (cor `#16a34a`).
- Atualizar o resumo de cartões diários no Popover para incluir o indicador "Aguardando" (Verde `#16a34a`).
- Atualizar o **Gráfico de Barras Mensal** para consultar o turno e incluir a barra empilhada `waitingMinutes` em verde (`#16a34a`).
- Atualizar os tooltips do Recharts para rotular claramente as 3 categorias.

### Passo 3: Atualização da Tela de OS (`ServiceOrderList.tsx`)
- Utilizar `calculateDailyTimesAndGaps` ao carregar a lista de ordens de serviço.
- Exibir a métrica de "Aguardando Serviço" no painel de Resumo Diário com a estilização verde apropriada.

### Passo 4: Relatórios do Administrador (`AdminReportPage.tsx`)
- Atualizar o cálculo de totalização de horas no Admin Report para incluir "Aguardando Serviço".
- Atualizar os gráficos e tabelas por usuário e por período no relatório administrativo.

### Passo 5: Gerador de PDF (`lib/pdfGenerator.ts`)
- Atualizar `generateServiceOrderPdf` e `generateTimeTrackingPdf` para incluir a linha "Aguardando Serviço" na tabela "Resumo do Período".
- Garantir que a cor verde ou destaque seja preservado e que os tempos no PDF fiquem perfeitamente alinhados e formatados.

### Passo 6: Apontamentos e Histórico (`TimeTrackingPage.tsx`)
- Atualizar visualizações do histórico mensal para calcular e destacar o tempo de Aguardando Serviço quando houver turno associado ao dia.

---

## Code Changes

- **`src/services/shiftService.ts`**:
  - Adicionar a função `calculateDailyTimesAndGaps` e utilitários de minutos operacionais.
- **`src/lib/utils.ts`**:
  - Reexportar ou estender `calculateOsAndPercursoTimes` para utilizar a nova lógica com suporte a `waitingMinutes`.
- **`src/components/ServiceOrderCharts.tsx`**:
  - Adicionar suporte a `waitingMinutes` no gráfico diário e gráfico de desempenho mensal.
  - Ajustar cores (`#16a34a` para Aguardando, `#2563eb` para OS, `#dc2626` para Percurso) e tooltips.
- **`src/pages/ServiceOrderList.tsx`**:
  - Atualizar o card de resumo de horas para exibir a métrica em verde de "Aguardando".
- **`src/pages/AdminReportPage.tsx`**:
  - Atualizar carregamento de turnos dos usuários e os cálculos diários/mensais dos relatórios.
- **`src/lib/pdfGenerator.ts`**:
  - Incluir linha "Aguardando Serviço" nas tabelas de PDF de Ordens de Serviço e Apontamentos.

---

## Testing Strategy

Validar rigorosamente os 10 cenários de teste exigidos:
1. **Turno 07:00–17:00 sem nenhuma OS:** Deve gerar 10:00 de "Aguardando Serviço".
2. **Turno 07:00–17:00 com OS 07:00–17:00:** Deve gerar 00:00 de "Aguardando Serviço".
3. **Turno 07:00–17:00 com OS 09:00–11:00:** Deve gerar 07:00–09:00 (2h) + 11:00–17:00 (6h) = 08:00 de Aguardando.
4. **Hora Extra (Turno 07:00–17:00, OS 17:00–20:00):** Não gerar Aguardando após 17:00 nem entre 17:00 e 17:00.
5. **Percurso (Turno 07:00–17:00, Percurso 10:00–11:00):** Não gerar Aguardando no intervalo de percurso (10:00–11:00).
6. **Folga:** Retornar 00:00 de Aguardando.
7. **Sobreposição (OS 08:00–10:00 e OS 09:00–11:00):** Tratar 08:00–11:00 como ocupado sem duplicar gaps.
8. **Turno Noturno (22:00–06:00):** Validar transição após a meia-noite.
9. **Dia Operacional (00:00–06:59):** Validar que pertence ao dia operacional correto.
10. **Dados Antigos:** Abrir relatórios com registros antigos sem quebras ou exceções de runtime.