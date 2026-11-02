import * as React from "react";

// Celular e tablet: abaixo do breakpoint `lg` do Tailwind
const COMPACT_BREAKPOINT = 1024;

const query = `(max-width: ${COMPACT_BREAKPOINT - 1}px)`;

export function useIsCompact() {
  const [isCompact, setIsCompact] = React.useState<boolean>(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setIsCompact(mql.matches);
    mql.addEventListener("change", onChange);
    onChange();
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isCompact;
}
