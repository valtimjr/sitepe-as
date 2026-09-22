---
title: "Correção e Centralização do Cálculo de Aguardando Serviço (Rotativos vs Fixos)"
summary: "Plano atualizado esclarecendo a diferenciação entre o 'Dia' rotativo (07:00-15:00 / 07:00-19:00 / Folga) e os 'Turnos Dia Fixos' (07:00-17:00 / 07:30-17:00)."
status: "accepted"
chatId: "11"
createdAt: "2026-08-07T23:57:49.318Z"
updatedAt: "2026-08-08T00:02:29.558Z"
---

## Overview

Correction and finalization of the **"Aguardando Serviço"** (Waiting for Service) calculation across the entire Service Order system. 

Instead of setting a fixed or hardcoded value (like 10:00), the system will dynamically identify each employee's **exact shift working hours** for each operational day (07:00 to 06:59), properly distinguishing between **Rotating Shifts** (Turno A, Turno B, Turno C, or direct schedules 'Dia', 'Intermediario', 'Noite') and **Fixed Shifts** ('Turno Dia 07:00 - 17:00', 'Turno Dia 07:30 - 17:00', or custom database entries).

It will then normalize and merge all occupied intervals (OS and Percurso), calculate **only the actual gaps inside the active shift window**, and propagate this unified result consistently across the UI, Copy button, WhatsApp sharing, PDF generation, Daily Summary, Daily Performance, Monthly Performance, Period History, and Admin Reports.

---

## Technical Clarification: Rotating "Dia" vs. Fixed "Turno Dia"

### 1. Rotating "Dia" Schedule
For rotating shift workers (Turno A / B / C in their "Dia" week, or directly assigned schedule "Dia"):
- **Sunday**: Folga (0h window, 0h Aguardando)
- **Mon - Thu**: `07:00 - 15:00` (8h window)
- **Fri - Sat**: `07:00 - 19:00` (12h window)

### 2. Fixed "Turno Dia" Schedules
For fixed turn workers:
- `'Turno Dia 07:00 - 17:00'`: `07:00 - 17:00` (10h window every active day)
- `'Turno Dia 07:30 - 17:00'`: `07:30 - 17:00` (9.5h window every active day)
- Custom shifts from DB with explicit `entry_time` / `exit_time` (e.g. `07:00` to `17:00`)

### 3. Resolution Logic
`getShiftSchedule(date, turn)` and `resolveShiftScheduleInfo(date, shift)` will:
- Check if the turn is a **Rotating Turn** (`Turno A`, `Turno B`, `Turno C`), calculating the 3-week cycle index to find whether the current schedule is `Dia`, `Intermediario`, or `Noite`.
- Check if the turn is a direct **Schedule Name** (`Dia`, `Intermediario`, `Noite`), directly returning that schedule's entry/exit for the target day of week.
- Check if the turn is a **Fixed Turn** (`Turno Dia 07:00 - 17:00`, `Turno Dia 07:30 - 17:00`), returning its fixed entry/exit for that day of week.
- Check if the shift object from Supabase has explicit `entry_time` and `exit_time` (for custom shifts).

---

## UI/UX Design

### 1. Daily Service Order Screen (`ServiceOrderList`)
- **Daily Summary Cards**: Displays **Horas em OS** (Blue), **Percurso** (Red), **Aguardando Serviço** (Green `#16a34a`), and **Total Geral** (Sum of net occupied + waiting minutes).
- **Gaps / Waiting Badge**: When gaps exist within the employee's shift, the UI highlights the calculated intervals (e.g., `07:00 - 08:00 (1h 00m)` and `10:00 - 13:00 (3h 00m)`).
- **Copy Button (`handleCopyList`)**: Generates chronological output interleaving OS, Percurso, and "Aguardando Serviço" gaps.
- **WhatsApp Share Button (`handleShareOnWhatsApp`)**: Shares the timeline including Aguardando Serviço gaps formatted cleanly for messaging.
- **PDF Export Button (`handleExportPdf`)**: Generates PDF containing summary and detailed table with OS (blue), Percurso (red), and Aguardando Serviço (green).

### 2. Charts & Performance Popovers (`ServiceOrderCharts`)
- **Desempenho Diário (Daily Performance)**: Donut chart displaying OS slices, Percurso slices, and Aguardando gaps slices with distinct tooltips and labels (`#16a34a` green for Aguardando).
- **Desempenho Mensal (Monthly Performance)**: Stacked Bar chart aggregating OS, Percurso, and Aguardando minutes for each day of the month.
- **Tooltips**: Correctly display OS, Percurso, and Aguardando Serviço without name/category swapping.

### 3. Admin Reports (`AdminReportPage`)
- **Resumo do Período**: Displays total OS, Percurso, Aguardando, and Total Geral.
- **Histórico do Período**: Stacked Bar chart displaying daily breakdown with Aguardando in green.
- **Desempenho no Período**: Donut chart with Aguardando gaps.
- **Admin PDF Export**: Shows period totals with Aguardando in green text and accurate interval calculations.

---

## Considerations & Edge Cases

1. **Shift Resolution & Turn Types**:
   - **Rotating "Dia"**: Mon–Thu (07:00–15:00, 8h), Fri–Sat (07:00–19:00, 12h), Sun (Folga).
   - **Fixed "Turno Dia 07:00 - 17:00"**: 07:00–17:00 (10h).
   - **Turno Intermediário**: Mon–Thu (15:00–23:00, 8h), Fri (Folga), Sat (19:00–07:00, 12h), Sun (19:00–07:00, 12h).
   - **Turno Noite**: Mon–Thu (23:00–07:00, 8h), Fri (19:00–07:00, 12h), Sat (Folga), Sun (07:00–19:00, 12h).
2. **Operational Day Boundary (07:00 to 06:59)**:
   - Base timeline is normalized relative to 07:00 AM (07:00 = minute 0, 23:00 = 960 min, 00:00 = 1020 min, 06:59 = 1439 min). Continuous timeline eliminates negative durations for overnight shifts.
3. **Overlapping OS / Percurso (Deduplication)**:
   - Overlapping OS/Percurso intervals are merged into continuous occupied blocks before calculating gaps so that time is never double-counted.
4. **Overtime & Outside Shift Work**:
   - OS worked outside the shift window (e.g. shift 07:00–15:00, OS 16:00–18:00) counts towards OS total, but does **not** create Aguardando gaps outside the shift window.
5. **Day Off (Folga)**:
   - If the shift for a day is 'Folga' or has no entry/exit, `waitingMinutes = 0` and no Aguardando intervals are generated.
6. **Database Integrity**:
   - No artificial "Aguardando Serviço" rows inserted into Supabase `daily_service_orders`. All gaps are derived in-memory on demand.
7. **Backward Compatibility**:
   - Gracefully handles missing `parts`, missing `percurso`, `null` or `undefined` fields in old records.

---

## Technical Approach

### Centralized Calculation Engine (`shiftService.ts`)
Refactor and enhance `calculateDailyTimesAndGaps` in `src/services/shiftService.ts`:
1. **Shift Schedule Normalization**:
   - Update `getShiftSchedule` so that direct schedule names (`'Dia'`, `'Intermediario'`, `'Noite'`), rotating turns (`'Turno A'`, `'Turno B'`, `'Turno C'`), and fixed turns (`'Turno Dia 07:00 - 17:00'`, `'Turno Dia 07:30 - 17:00'`) are all correctly evaluated per day of week.
2. **Continuous Minutes Timeline**: Map HH:MM to operational minutes relative to 07:00:
   - `timeToOpMinutes("07:00") = 0`
   - `timeToOpMinutes("15:00") = 480`
   - `timeToOpMinutes("17:00") = 600`
   - `timeToOpMinutes("23:00") = 960`
   - `timeToOpMinutes("00:00") = 1020`
   - `timeToOpMinutes("06:00") = 1380`
3. **Interval Clamping & Gap Extraction**:
   - Clamp occupied intervals to `[shiftStartOp, shiftEndOp]`.
   - Sort and merge occupied intervals.
   - Extract remaining gaps between `shiftStartOp` and `shiftEndOp` as `{ start, end, durationMinutes }`.
4. **Net Duration Aggregation**:
   - Sum net merged OS minutes, net merged Percurso minutes, and Aguardando minutes so `totalMinutes = osMinutes + percursoMinutes + waitingMinutes`.

---

## Implementation Steps

### Task 1: Refactor Central Shift & Gap Calculation (`src/services/shiftService.ts`)
- Update `getShiftSchedule` to handle:
  1. Fixed turns (`Turno Dia 07:00 - 17:00`, `Turno Dia 07:30 - 17:00`)
  2. Direct schedule names (`Dia`, `Intermediario`, `Noite`, handling accents like `Intermediário`)
  3. Rotating turns (`Turno A`, `Turno B`, `Turno C`) via 3-week cycle calculation
- Update `resolveShiftScheduleInfo` to properly handle string shift names, shift objects from Supabase (`shifts` table rows with `ref_code`, `entry_time`, `exit_time`), and custom shifts.
- Enhance `calculateDailyTimesAndGaps` to:
  - Normalize and merge overlapping OS & Percurso intervals.
  - Compute net OS minutes and net Percurso minutes.
  - Clamp occupied intervals to shift bounds `[shiftStartOp, shiftEndOp]`.
  - Extract exact gap intervals (`waitingIntervals`).
  - Return `{ osMinutes, percursoMinutes, waitingMinutes, totalMinutes, waitingIntervals, shiftInfo }`.

### Task 2: Standardize Utility Helpers (`src/lib/utils.ts`)
- Update `calculateOsAndPercursoTimes` in `src/lib/utils.ts` to call `calculateDailyTimesAndGaps` whenever `date` and `shiftOrTurn` are provided, ensuring identical calculations everywhere.

### Task 3: Update Copy and WhatsApp Text Formatting (`src/pages/ServiceOrderList.tsx`)
- Update `formatListText` in `ServiceOrderList.tsx` to interleave "Aguardando Serviço" gap intervals in chronological sequence alongside OS and Percurso items.
- Ensure both `handleCopyList` and `handleShareOnWhatsApp` output the full timeline with Aguardando gaps.

### Task 4: Update Charts & Performance Views (`src/components/ServiceOrderCharts.tsx`)
- Ensure Daily Donut chart, Desempenho Diário, Desempenho Mensal, and Monthly Bar chart use the centralized `calculateDailyTimesAndGaps` breakdown.
- Verify color scheme: OS = Blue (`#2563eb`), Percurso = Red (`#dc2626`), Aguardando Serviço = Green (`#16a34a`).
- Verify chart tooltips show correct category labels.

### Task 5: Update Admin Reports & PDF Generation (`src/pages/AdminReportPage.tsx` & `src/lib/pdfGenerator.ts`)
- Update `AdminReportPage.tsx` Resumo do Período, Histórico do Período, and Desempenho no Período to use `calculateDailyTimesAndGaps`.
- Update `generateServiceOrderPdf` in `src/lib/pdfGenerator.ts` and `handleGeneratePDF` in `AdminReportPage.tsx` to display Aguardando Serviço in green (`[22, 163, 74]`), with correct duration totals.

---

## Code Changes

### `src/services/shiftService.ts`
- Enhance `getShiftSchedule`, `resolveShiftScheduleInfo`, and `calculateDailyTimesAndGaps`.
- Handle rotating "Dia" vs fixed "Turno Dia 07:00 - 17:00" / "Turno Dia 07:30 - 17:00" accurately.

### `src/lib/utils.ts`
- Align `calculateOsAndPercursoTimes` with central shift service logic.

### `src/pages/ServiceOrderList.tsx`
- Interleave Aguardando gaps into `formatListText` for Copy and WhatsApp.
- Pass `userShift || profile?.shift_code` to central calculation for UI cards and badges.

### `src/components/ServiceOrderCharts.tsx`
- Ensure Desempenho Diário and Monthly Bar chart consume centralized breakdown with correct green color (`#16a34a`).

### `src/pages/AdminReportPage.tsx`
- Ensure period totals, bar charts, donut charts, and PDF generation calculate gaps dynamically from employee shift definitions.

### `src/lib/pdfGenerator.ts`
- Include Aguardando Serviço in period summaries with green text (`[22, 163, 74]`).

---

## Testing Strategy

1. **Rotating Turno Dia (Seg-Qui: 07:00-15:00)**:
   - Without OS: Verify Aguardando = 8:00 (480 min), NOT 10:00.
2. **Fixed Turno Dia (07:00 - 17:00)**:
   - Without OS: Verify Aguardando = 10:00 (600 min).
3. **Turno Intermediário (15:00 - 23:00 / 19:00 - 07:00)**:
   - Verify gaps generated inside shift window; zero Aguardando outside window.
4. **Turno Noite (23:00 - 07:00 / 22:00 - 06:00)**:
   - Without OS: Verify Aguardando = 8:00 (480 min), NOT 10:00.
5. **Overtime (Hora Extra)**:
   - Shift 07:00–15:00, OS 07:00–15:00 and OS 16:00–18:00: Verify no Aguardando generated between 15:00 and 16:00.
6. **Day Off (Folga)**:
   - Verify Aguardando = 0:00.
7. **Operational Day Crossing Midnight (07:00 - 06:59)**:
   - OS at 02:00 belongs to previous day's operational shift; verify correct assignment and timeline sorting.
8. **Copy & WhatsApp**:
   - Click Copy and WhatsApp buttons; verify output includes "Aguardando Serviço" intervals.
9. **PDF Export**:
   - Generate PDF and verify Aguardando Serviço is present in green text.
10. **Type Checking**:
   - Run type checks to confirm project compiles without errors.