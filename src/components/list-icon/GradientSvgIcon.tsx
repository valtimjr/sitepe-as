import React, { useId } from 'react';
import { cssGradientToSvgStops } from '@/lib/gradient';
import type { AnyIconComponent } from '@/lib/listIconRegistry';

interface GradientSvgIconProps {
  Icon: AnyIconComponent;
  gradient: string;
  /** "stroke" para Lucide / Heroicons outline, "fill" para Heroicons solid */
  paint: 'stroke' | 'fill';
  className?: string;
  style?: React.CSSProperties;
}

const VIEWBOX = 24;

/** Renderiza um ícone SVG pintado com um degradê CSS convertido para <linearGradient>/<radialGradient>. */
const GradientSvgIcon: React.FC<GradientSvgIconProps> = ({ Icon, gradient, paint, className, style }) => {
  const id = `lg-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const svg = cssGradientToSvgStops(gradient);

  if (!svg) return <Icon className={className} style={style} />;

  const stops = svg.stops.map((s, i) => <stop key={i} offset={s.offset} stopColor={s.color} />);
  const paintProps = { [paint]: `url(#${id})` } as React.SVGProps<SVGSVGElement>;

  return (
    <>
      <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
        <defs>
          {svg.type === 'radial' ? (
            <radialGradient id={id} gradientUnits="userSpaceOnUse" cx={VIEWBOX / 2} cy={VIEWBOX / 2} r={VIEWBOX / 2}>
              {stops}
            </radialGradient>
          ) : (
            <linearGradient
              id={id}
              gradientUnits="userSpaceOnUse"
              x1={svg.coords.x1 * VIEWBOX}
              y1={svg.coords.y1 * VIEWBOX}
              x2={svg.coords.x2 * VIEWBOX}
              y2={svg.coords.y2 * VIEWBOX}
            >
              {stops}
            </linearGradient>
          )}
        </defs>
      </svg>
      <Icon className={className} style={style} {...paintProps} />
    </>
  );
};

export default GradientSvgIcon;
