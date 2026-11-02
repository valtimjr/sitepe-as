import type { Modifier } from '@dnd-kit/core';

/** Mantém o arraste só no eixo vertical. */
export const restrictToVerticalAxisModifier: Modifier = ({ transform }) => ({ ...transform, x: 0 });
