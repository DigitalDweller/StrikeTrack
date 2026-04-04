import { useId, useMemo } from 'react';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Line,
  Polyline,
  Rect,
  Text as SvgText,
} from 'react-native-svg';
import type { TimeValuePoint } from '@/lib/batteryChartData';

const PAD = { top: 10, right: 12, bottom: 22, left: 38 };

type Props = {
  series: TimeValuePoint[];
  width: number;
  height: number;
  stroke: string;
  formatTick: (v: number) => string;
  /** When every value lies in [min, max], use that Y range (no extra padding). */
  softYDomain?: { min: number; max: number };
  /**
   * Fixed Y baseline + ceiling shared across batteries (e.g. global max reading).
   * Top tick is at least `max` and expands if this series exceeds it.
   */
  compareYDomain?: { min: number; max: number };
};

function yExtent(values: number[]): { min: number; max: number } {
  if (values.length === 0) return { min: 0, max: 1 };
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    const d = Math.abs(min) < 1e-6 ? 0.001 : Math.abs(min) * 0.05;
    return { min: min - d, max: max + d };
  }
  const pad = (max - min) * 0.1;
  return { min: min - pad, max: max + pad };
}

export function MiniLineChart({
  series,
  width,
  height,
  stroke,
  formatTick,
  softYDomain,
  compareYDomain,
}: Props) {
  const clipId = `mc-${useId().replace(/:/g, '')}`;

  const geometry = useMemo(() => {
    const cw = width - PAD.left - PAD.right;
    const ch = height - PAD.top - PAD.bottom;
    if (cw <= 0 || ch <= 0 || series.length === 0) return null;

    const plotLeft = PAD.left;
    const plotRight = PAD.left + cw;
    const plotTop = PAD.top;
    const plotBottom = PAD.top + ch;

    const ts = series.map((p) => p.t);
    const vs = series.map((p) => p.v);
    const tMin = Math.min(...ts);
    const tMax = Math.max(...ts);
    const dLo = Math.min(...vs);
    const dHi = Math.max(...vs);
    let vMin: number;
    let vMax: number;
    const cmp = compareYDomain;
    if (
      cmp != null &&
      Number.isFinite(cmp.min) &&
      Number.isFinite(cmp.max) &&
      cmp.max > cmp.min
    ) {
      vMin = cmp.min;
      vMax = Math.max(cmp.max, dHi, vMin + 1e-9);
    } else if (softYDomain != null && dLo >= softYDomain.min && dHi <= softYDomain.max) {
      vMin = softYDomain.min;
      vMax = softYDomain.max;
    } else {
      const e = yExtent(vs);
      vMin = e.min;
      vMax = e.max;
      if (dLo >= 0 && vMin < 0) vMin = 0;
    }
    const tSpan = tMax - tMin || 1;
    const vSpan = vMax - vMin || 1;

    const toXY = (t: number, v: number) => {
      const xRaw = PAD.left + ((t - tMin) / tSpan) * cw;
      const yRaw = PAD.top + (1 - (v - vMin) / vSpan) * ch;
      const x = Math.min(plotRight, Math.max(plotLeft, xRaw));
      const y = Math.min(plotBottom, Math.max(plotTop, yRaw));
      return { x, y };
    };

    const pts = series.map((p) => toXY(p.t, p.v));
    const poly = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

    const yBottom = plotBottom;
    return { pts, poly, cw, ch, vMin, vMax, yBottom, plotLeft, plotTop };
  }, [series, width, height, softYDomain, compareYDomain]);

  if (!geometry) return null;

  const { pts, poly, cw, ch, vMin, vMax, yBottom, plotLeft, plotTop } = geometry;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <ClipPath id={clipId}>
          <Rect x={plotLeft} y={plotTop} width={cw} height={ch} />
        </ClipPath>
      </Defs>
      <Line
        x1={PAD.left}
        y1={yBottom}
        x2={PAD.left + cw}
        y2={yBottom}
        stroke="#3f3f46"
        strokeWidth={1}
      />
      <Line
        x1={PAD.left}
        y1={PAD.top}
        x2={PAD.left + cw}
        y2={PAD.top}
        stroke="#27272a"
        strokeWidth={1}
      />
      <SvgText x={4} y={PAD.top + 11} fill="#a1a1aa" fontSize={10} fontWeight="600">
        {formatTick(vMax)}
      </SvgText>
      <SvgText x={4} y={yBottom} fill="#a1a1aa" fontSize={10} fontWeight="600">
        {formatTick(vMin)}
      </SvgText>
      <G clipPath={`url(#${clipId})`}>
        {series.length >= 2 ? (
          <Polyline
            points={poly}
            fill="none"
            stroke={stroke}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : (
          <Circle cx={pts[0].x} cy={pts[0].y} r={4} fill={stroke} />
        )}
      </G>
    </Svg>
  );
}
