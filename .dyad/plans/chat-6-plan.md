---
title: "Implementação da Funcionalidade Agregado na Ordem de Serviço"
summary: "Implementar suporte completo à funcionalidade Agregado nas Ordens de Serviço, com validações, regra de incompatibilidade com Percurso, persistência no Supabase/Dexie e exibição em tela, Copiar, WhatsApp, PDF e Relatórios."
status: "accepted"
chatId: "6"
createdAt: "2026-08-07T21:56:34.452Z"
updatedAt: "2026-08-07T21:59:46.177Z"
---

## Overview

Implementar o suporte completo à opção **Agregado** nas Ordens de Serviço (OS), garantindo integração de ponta a ponta: do formulário de criação/edição e validação, persistência no Supabase e banco local (Dexie), exibição em tela, até a exportação em **Copiar Lista**, **WhatsApp**, **PDF** e **Relatórios Administrativos**.

### Princípios Chave
1. **Incompatibilidade Estrita:** OS de Percurso **NUNCA** pode possuir Agregado.
2. **Armazenamento como String:** `numero_agregado` é tratado como `string` para preservar zeros à esquerda e formatações.
3. **Retrocompatibilidade:** Registros legados sem os campos `agregado` e `numero_agregado` são tratados como `agregado: false` e `numero_agregado: null` sem falhas nem migrações destrutivas.
4. **Sem Alteração de Duração/Totais:** O Agregado é apenas uma informação complementar identificadora e não altera nenhum cálculo de horas ou relatórios de desempenho.

---

## UI/UX Design

### 1. Formulário de Nova/Edição de OS (`ServiceOrderForm.tsx`)
- Posição: O bloco do checkbox **Agregado** ficará posicionado logo abaixo do checkbox **Percurso**.
- **Comportamento Dinâmico:**
  - **Percurso Desmarcado (OS Normal):**
    - Checkbox **Agregado** habilitado para seleção.
    - Quando **Agregado** é marcado (☑): expande suavemente um campo compacto `Nº Agregado`.
    - Quando **Agregado** é desmarcado (☐): esconde o input e não reserva espaço extra no layout.
  - **Percurso Marcado (OS Percurso):**
    - Checkbox **Agregado** fica **desabilitado/indisponível**, acompanhado da mensagem explicativa: *"Indisponível em OS de percurso"*.
    - Se o usuário marcar Percurso com Agregado ativo, o Agregado é automaticamente desmarcado e o número limpo.

```
┌──────────────────────────────────────────────────┐
│ ☑ Percurso (Deslocamento)                        │
├──────────────────────────────────────────────────┤
│ ☐ Agregado                                       │
│   Indisponível em OS de percurso                 │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ ☐ Percurso (Deslocamento)                        │
├──────────────────────────────────────────────────┤
│ ☑ Agregado                                       │
│   Nº Agregado *                                  │
│   [ 123456                             ]         │
└──────────────────────────────────────────────────┘
```

### 2. Validação Visual
- Se "Agregado" estiver marcado e o usuário tentar salvar com o campo `Nº Agregado` em branco:
  - O campo recebe destaque com borda em vermelho (`border-destructive`).
  - É exibida a mensagem de erro abaixo do campo e via toast de notificação: *"Informe o Nº Agregado para continuar."*

### 3. Exibição na Lista (`ServiceOrderListDisplay.tsx`)
- Quando a OS possuir agregado, o número é exibido no cabeçalho do card junto aos números do AF e OS:
  `AF: 42032 (OS: 23012) • Agregado: 123456`
- Para OS sem agregado ou OS de percurso: o rótulo do Agregado **não é exibido**.

---

## Technical Approach & Architecture

### Data Model (`src/types/supabase.ts` & `src/services/localDbService.ts`)
```typescript
export interface ServiceOrderData {
  id: string;
  cracha?: string | null;
  af: string;
  os: string;
  hora_inicio: string;
  hora_final: string;
  servico_executado: string;
  parts: ServiceOrderPart[];
  is_percurso?: boolean;
  agregado?: boolean;
  numero_agregado?: string | null;
}
```

### Camada de Persistência
- **Supabase (`daily_service_orders`):** Os campos `agregado` e `numero_agregado` serão gravados diretamente nos objetos contidos dentro do array JSONB `os_list`.
- **Modo Visitante / Offline (`Dexie`):** Atualização das funções em `partListService.ts` e `localDbService.ts` para mapear e persistir os novos campos.

### Validação de Código no Formulário
```typescript
// Impede combinação incompatível antes de persistir
if (isPercurso && isAgregado) {
  showError("OS de percurso não pode possuir agregado.");
  return;
}

// Campo obrigatório quando agregado está marcado
if (!isPercurso && isAgregado && !numeroAgregado.trim()) {
  setAgregadoError(true);
  showError("Informe o Nº Agregado para continuar.");
  return;
}
```

---

## Granular Implementation Steps

### Step 1: Modelos e Interfaces TypeScript
- Update `ServiceOrderData` in `src/types/supabase.ts`.
- Update `ServiceOrderItem` in `src/services/localDbService.ts`.
- Update mapping functions in `src/services/partListService.ts` (`getVisitorServiceOrders` and `saveVisitorServiceOrder`).

### Step 2: Componente do Formulário (`ServiceOrderForm.tsx`)
- Criar estados `isAgregado`, `numeroAgregado` e `agregadoError`.
- Inicializar estados com `initialData` (se existir).
- Implementar efeito para desabilitar/resetar Agregado quando `isPercurso` for verdadeiro.
- Adicionar elementos de UI para checkbox "Agregado" e input `Nº Agregado` com animação `animate-in fade-in duration-200`.
- Adicionar validação de presença do `Nº Agregado` no envio (`handleSubmit`).
- Adicionar regra de salvamento no objeto retornado por `buildServiceOrderObject`.

### Step 3: Exibição da Lista de OS (`ServiceOrderListDisplay.tsx`)
- Adicionar renderização condicional do campo `Agregado: {numero_agregado}` no cabeçalho do card de cada OS (apenas se `!is_percurso && agregado && numero_agregado`).

### Step 4: Formatação de Texto para Copiar e WhatsApp (`ServiceOrderList.tsx`)
- Atualizar a função `formatListText` para incluir a linha `Agregado: {numero_agregado}` após os dados de AF/OS nas ordens normais que possuam essa informação.

### Step 5: Gerador de PDF (`src/lib/pdfGenerator.ts`)
- Atualizar a função `generateServiceOrderPdf`:
  - Na coluna de detalhes da OS, adicionar a linha `Agregado: {numero_agregado}` para OSs que possuam o campo preenchido.
  - Manter percursos e OS sem agregado sem esse rótulo.

### Step 6: Relatórios Administrativos (`src/pages/AdminReportPage.tsx`)
- Garantir que a geração de PDF e a exportação CSV no Relatório Geral incluam a informação do Agregado quando presente.

---

## Code Changes & File Map

1. `src/types/supabase.ts`:
   - Adicionar `agregado?: boolean;` e `numero_agregado?: string | null;` na interface `ServiceOrderData`.
2. `src/services/localDbService.ts`:
   - Adicionar `agregado?: boolean;` e `numero_agregado?: string | null;` em `ServiceOrderItem`.
3. `src/services/partListService.ts`:
   - Garantir repasse dos campos `agregado` e `numero_agregado` nas funções de visitante.
4. `src/components/ServiceOrderForm.tsx`:
   - Adicionar bloco visual do Checkbox "Agregado" e Input "Nº Agregado".
   - Adicionar lógica de incompatibilidade com "Percurso".
   - Adicionar validações e tratamento do salvamento.
5. `src/components/ServiceOrderListDisplay.tsx`:
   - Exibir badge/texto com o Nº do Agregado.
6. `src/pages/ServiceOrderList.tsx`:
   - Atualizar `formatListText` para Copiar e WhatsApp.
7. `src/lib/pdfGenerator.ts`:
   - Atualizar a formatação da tabela do PDF de OS.
8. `src/pages/AdminReportPage.tsx`:
   - Atualizar exportação de CSV/PDF para expor Agregado quando existir.

---

## Testing Strategy & Test Cases

1. **Cenário 1 — OS Normal Sem Agregado:**
   - Criar OS sem marcar Agregado. Deve salvar normalmente sem incluir campos vazios em excesso.
2. **Cenário 2 — OS Normal Com Agregado:**
   - Marcar Agregado, preencher `123456`. Deve salvar e exibir `Agregado: 123456` na tela, na cópia de texto, no WhatsApp e no PDF.
3. **Cenário 3 — Validação de Agregado Sem Número:**
   - Marcar Agregado, deixar `Nº Agregado` em branco e tentar salvar.
   - Deve destacar o campo em vermelho e impedir salvamento com a mensagem *"Informe o Nº Agregado para continuar."*
4. **Cenário 4 — Incompatibilidade com Percurso:**
   - Marcar Percurso. A opção Agregado deve ficar desabilitada com aviso *"Indisponível em OS de percurso"*.
   - Se Agregado estava marcado previamente, ao marcar Percurso ele deve ser desativado automaticamente.
5. **Cenário 5 — Retrocompatibilidade:**
   - Abrir OS antigas (sem `agregado`/`numero_agregado`).
   - Devem ser exibidas normalmente sem erros, tratadas como `agregado: false`.
6. **Cenário 6 — Edição de OS com Agregado:**
   - Editar uma OS existente com Agregado. O número deve ser recarregado no input. Alterar ou desmarcar deve atualizar o estado e a persistência corretamente.
7. **Cenário 7 — Manutenção de Cálculos:**
   - Confirmar que totais de horas de OS, horas de Percurso e resumo do dia permanecem inalterados.