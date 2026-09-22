---
title: "Correção da Lógica de Turnos e Aguardando Serviço na AdminReportPage"
summary: "Plano para corrigir o cálculo de turnos e Aguardando Serviço na AdminReportPage reutilizando a fonte de verdade centralizada do shiftService.ts."
status: "accepted"
chatId: "13"
createdAt: "2026-08-08T00:30:49.049Z"
updatedAt: "2026-08-08T00:34:38.946Z"
---

## Overview

O objetivo é corrigir com precisão a lógica de cálculo de horas, identificação de turnos (Turno A, Turno B, Turno C, Turno Dia 07:00 - 17:00, Turno Dia 07:30 - 17:00 e Fixo Dia) e cálculo do tempo em **Aguardando Serviço** na `AdminReportPage`.

A correção **não criará uma nova regra de cálculo de Aguardando Serviço**, mas sim fará com que a `AdminReportPage` reutilize a mesma fonte de verdade centralizada em `src/services/shiftService.ts` (`calculateDailyTimesAndGaps`, `resolveShiftScheduleInfo`, `getShiftSchedule`, `timeToOpMinutes`, `getOperationalDate`), alinhando os relatórios administrativos perfeitamente com os resultados exibidos no restante do sistema.

---

## Causa Raiz do Problema Identificada

1. **Falha na Resolução e Normalização do Turno**:
   - Ao buscar os dados do usuário na `AdminReportPage`, o `shift_code` (ex: `1`, `2`, `3`) ou objeto do turno era repassado para `calculateDailyTimesAndGaps`.
   - O serviço `shiftService.ts` possuia normalização limitada para variações de nomes (ex: `"A"`, `"TURNO A"`, `"Fixo Dia"`). Quando um nome de turno ou `ref_code` não era diretamente reconhecido, a função caía no fallback padrão de `'Turno Dia 07:00 - 17:00'` (duração fixa de 10:00).
   - Isso fazia com que:
     - **Turno Dia**: apresentasse 10:00 fixo independente das OS.
     - **Turno Noite**: ficasse travado em 10:00 por cair no mesmo fallback, em vez de aplicar a janela noturna (23:00 → 07:00 / 19:00 → 07:00) que atravessa a meia-noite.
     - **Turno Intermediário**: perdesse a rotação correta e gerasse resultados desorganizados.
     - **Fixo Dia**: não fosse reconhecido e caísse no fallback genérico.

2. **Iteração Incompleta de Funcionários e Dias**:
   - A `AdminReportPage` acumulava totais apenas iterando sobre as ordens de serviço (`filteredOSList`).
   - Se um funcionário estivesse escalado no dia em um turno de trabalho (ex: Turno A, B, C, Fixo) mas **não registrasse nenhuma OS naquele dia**, ele era simplesmente ignorado no cálculo de **Aguardando Serviço**.
   - Para relatórios de período (intervalos de dias), os turnos não estavam sendo avaliados dia a dia de forma dinâmica conforme a rotação de cada data.

---

## UI/UX Design

- **Transparência e Consistência**: O usuário verá exatamente os mesmos valores na `AdminReportPage` que vê nas páginas individuais (`ServiceOrderList`, `TimeTrackingPage`, gráficos).
- **Sem Alterações Disruptivas de Layout**: A interface existente do relatório (filtros por usuário, profissão, turno, intervalo de datas, ordenação e pré-visualização de gráficos/tabelas) será mantida intacta, corrigindo apenas a exatidão dos números e horas calculadas.
- **Log de Depuração Temporário**: Durante o ajuste, serão exibidos logs detalhados no console (por funcionário e por dia operacional) para validação precisa dos intervalos de OS, percurso e lacunas de Aguardando Serviço. Os logs serão removidos após a validação.

---

## Considerations & Edge Cases

- **Funcionário sem OS no Dia**: Conforme definição do usuário, se o funcionário estiver escalado para trabalhar no dia e não tiver OS, todo o tempo da jornada daquele dia é contado como **Aguardando Serviço** (caso não seja dia de Folga).
- **Tratamento de Folga**: Se a escala do dia indicar `Folga` (seja por domingo em turno fixo ou pela rotação de ciclos do Turno A/B/C), o tempo de Aguardando Serviço é `00:00`.
- **Passagem de Meia-Noite (Turno Noite e Intermediário)**: Horários como 23:00 → 07:00 ou 19:00 → 07:00 são convertidos via minutos operacionais (`timeToOpMinutes` base 07:00) garantindo que não ocorram diferenças negativas.
- **Sobreposição de OS e Percursos**: Ordens de serviço e percursos concorrentes são mesclados para que o mesmo intervalo de tempo não seja descontado duas vezes.
- **Horas Extra**: Apontamentos fora da janela do turno não geram Aguardando Serviço negativo nem criam lacunas fictícias fora da jornada.
- **Compatibilidade com Registros Antigos**: Caso um perfil antigo não tenha `shift_code`, haverá um fallback seguro para o turno configurado ou exibição de `Sem Turno` sem travar a aplicação.

---

## Technical Approach

### 1. Robustecimento da Normalização de Turnos em `shiftService.ts`
- Atualizar `normalizeScheduleName` e `getShiftSchedule` para aceitar e normalizar todas as variantes e códigos de turno do sistema:
  - `"Turno A"`, `"A"`, `"TURNO A"`, `"Turno 1"` → `'Turno A'`
  - `"Turno B"`, `"B"`, `"TURNO B"`, `"Turno 2"` → `'Turno B'`
  - `"Turno C"`, `"C"`, `"TURNO C"`, `"Turno 3"` → `'Turno C'`
  - `"Fixo Dia"`, `"Turno Fixo Dia"`, `"Fixo"`, `"Turno Dia 07:00 - 17:00"` → `'Turno Dia 07:00 - 17:00'`
  - `"Turno Dia 07:30 - 17:00"` → `'Turno Dia 07:30 - 17:00'`
- Atualizar `resolveShiftScheduleInfo` para buscar no mapa de `shifts` do banco por `ref_code` ou `id` quando `shiftOrTurn` for um número ou código.

### 2. Refatoração da Camada de Dados na `AdminReportPage.tsx`
- **Fluxo Dia a Dia por Funcionário**:
  1. Identificar a lista de funcionários ativos que correspondem aos filtros selecionados (Usuário, Profissão, Turno).
  2. Determinar o intervalo de dias analisados no relatório.
  3. Para cada dia do período:
     - Para cada funcionário relevante:
       - Obter a escala / turno aplicável àquele funcionário naquele dia específico.
       - Filtrar as OS do funcionário naquele dia operacional.
       - Invocar `calculateDailyTimesAndGaps(osDoDia, dataDoDia, turnoDoFuncionario)`.
       - Somar minutos de OS, Percurso e Aguardando Serviço.

---

## Implementation Steps

1. **Atualizar `src/services/shiftService.ts`**:
   - Ampliar `normalizeScheduleName` para traduzir sinônimos de turnos (A, B, C, Fixo Dia, etc.).
   - Garantir que `resolveShiftScheduleInfo` interprete corretamente objetos de turno contendo `name`, `ref_code` e horários cadastrados, aplicando a rotação quando for Turno A, B ou C, e aplicando a janela fixa para os turnos de Fixo Dia.

2. **Reestruturar o cálculo de totais na `src/pages/AdminReportPage.tsx`**:
   - Ajustar o `useMemo` de `dailyTimes` e `monthlyChartData` para iterar sobre todos os funcionários filtrados e todos os dias do período selecionado.
   - Associar corretamente: `Funcionário` + `Data Operacional` + `Turno do Dia` + `OS / Percurso` → `calculateDailyTimesAndGaps`.
   - Remover qualquer valor de duração hardcoded (`10*60`, `600`, etc.) ou atribuição genérica de turno único para o período inteiro.

3. **Inclusão de Logs de Depuração Temporários**:
   - Adicionar `console.log` temporário no cálculo para 1 funcionário/dia exibindo: funcionário, data, turno identificado, horário início/fim do turno, OS/Percursos encontrados, lacunas calculadas e totais.

4. **Validação dos Testes**:
   - Testar Turno A, Turno B, Turno C, Turno Dia (07:00-17:00 e 07:30-17:00) e Fixo Dia com:
     - 0 OS no dia.
     - 1 OS no dia.
     - Várias OS + Percurso no dia.
     - OS em turno noturno com travessia de meia-noite (ex: 23:00 → 07:00).
     - Dias de Folga.
   - Remover os logs temporários após a confirmação.

---

## Code Changes

- `src/services/shiftService.ts`:
  - Melhorar `normalizeScheduleName` para mapear aliases de turnos (A, B, C, Fixo Dia).
  - Ajustar `resolveShiftScheduleInfo` para lidar com `ref_code` e resolução flexível de objetos/strings de turno.
- `src/pages/AdminReportPage.tsx`:
  - Atualizar o cálculo de tempo diário e do período para avaliar cada funcionário por cada dia operacional do filtro.
  - Reutilizar integralmente `calculateDailyTimesAndGaps` importada de `@/services/shiftService`.

---

## Testing Strategy

1. **Validação de Turno Noturno**:
   - Selecionar um funcionário em Turno Noite.
   - Verificar que o tempo de Aguardando Serviço não fica travado em 10:00 e que a janela 23:00 → 07:00 (ou 19:00 → 07:00) é respeitada.
2. **Validação de Turno Dia e Fixo Dia**:
   - Verificar que o total do Turno Dia reflete a soma real (OS + Percurso + Aguardando) e não 10:00 fixo.
   - Testar com 0 OS para confirmar que as horas de trabalho do turno aparecem como Aguardando Serviço.
3. **Validação de Turno Intermediário e Rotação**:
   - Selecionar período com mudança de ciclo e verificar se Turnos A, B e C acompanham a rotação da escala ao longo dos dias.
4. **Validação de Folga**:
   - Confirmar que nos dias de folga do funcionário não é gerado tempo de Aguardando Serviço.
5. **Comparação**:
   - Comparar o relatório gerado na `AdminReportPage` com os dados exibidos na `ServiceOrderList` e `TimeTrackingPage` para os mesmos funcionários/dias para garantir paridade de 100%.