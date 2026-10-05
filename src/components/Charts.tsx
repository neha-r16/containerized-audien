interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  valueFormatter?: (v: number) => string;
}

export function BarChart({ data, height = 200, valueFormatter }: BarChartProps) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="w-full" style={{ height }}>
      <div className="flex items-end justify-between gap-2 h-full pb-6">
        {data.map((d, i) => {
          const pct = (d.value / maxVal) * 100;
          return (
            <div key={i} className="flex flex-col items-center flex-1 h-full justify-end gap-1 group">
              <div className="text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                {valueFormatter ? valueFormatter(d.value) : d.value}
              </div>
              <div
                className="w-full max-w-[48px] rounded-t-md transition-all duration-500 hover:opacity-80"
                style={{
                  height: `${pct}%`,
                  background: d.color || 'linear-gradient(180deg, #22d3ee 0%, #0891b2 100%)',
                  minHeight: '4px',
                }}
              />
              <div className="text-[10px] text-slate-500 text-center truncate w-full" title={d.label}>
                {d.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
}

export function DonutChart({ data, size = 180 }: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let cumulative = 0;
  const radius = size / 2;
  const innerRadius = radius * 0.6;

  const segments = data.map((d, i) => {
    const fraction = d.value / total;
    const startAngle = cumulative * 2 * Math.PI - Math.PI / 2;
    cumulative += fraction;
    const endAngle = cumulative * 2 * Math.PI - Math.PI / 2;
    const x1 = radius + radius * Math.cos(startAngle);
    const y1 = radius + radius * Math.sin(startAngle);
    const x2 = radius + radius * Math.cos(endAngle);
    const y2 = radius + radius * Math.sin(endAngle);
    const x1i = radius + innerRadius * Math.cos(startAngle);
    const y1i = radius + innerRadius * Math.sin(startAngle);
    const x2i = radius + innerRadius * Math.cos(endAngle);
    const y2i = radius + innerRadius * Math.sin(endAngle);
    const largeArc = fraction > 0.5 ? 1 : 0;
    const path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${x2i} ${y2i} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x1i} ${y1i} Z`;
    return { path, color: d.color, label: d.label, value: d.value, pct: fraction * 100, key: i };
  });

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((s) => (
          <path key={s.key} d={s.path} fill={s.color} className="hover:opacity-80 transition-opacity cursor-pointer">
            <title>{`${s.label}: ${s.value} (${s.pct.toFixed(1)}%)`}</title>
          </path>
        ))}
        <text x={radius} y={radius - 5} textAnchor="middle" className="fill-slate-300 text-lg font-bold">
          {total}
        </text>
        <text x={radius} y={radius + 15} textAnchor="middle" className="fill-slate-500 text-xs">
          total
        </text>
      </svg>
      <div className="flex flex-wrap gap-2 justify-center max-w-xs">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: d.color }} />
            <span className="text-slate-400 truncate max-w-[100px]">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface LineChartProps {
  data: { x: number; y: number }[];
  width?: number;
  height?: number;
  color?: string;
}

export function LineChart({ data, width = 360, height = 160, color = '#22d3ee' }: LineChartProps) {
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const w = width - padding.left - padding.right;
  const h = height - padding.top - padding.bottom;
  const xs = data.map((d) => d.x);
  const ys = data.map((d) => d.y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys) * 0.9;
  const yMax = Math.max(...ys) * 1.05;

  const points = data.map((d) => {
    const px = padding.left + ((d.x - xMin) / (xMax - xMin || 1)) * w;
    const py = padding.top + (1 - (d.y - yMin) / (yMax - yMin || 1)) * h;
    return { px, py, ...d };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.px} ${p.py}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].px} ${padding.top + h} L ${points[0].px} ${padding.top + h} Z`;

  return (
    <svg width={width} height={height} className="w-full">
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
        const y = padding.top + t * h;
        return <line key={i} x1={padding.left} y1={y} x2={padding.left + w} y2={y} stroke="#1e293b" strokeWidth="1" />;
      })}
      <path d={areaD} fill="url(#lineGrad)" />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.px} cy={p.py} r="4" fill={color} />
          <text x={p.px} y={p.py - 10} textAnchor="middle" className="fill-slate-400 text-[10px]">
            {p.y.toFixed(3)}
          </text>
          <text x={p.px} y={padding.top + h + 18} textAnchor="middle" className="fill-slate-500 text-[10px]">
            K={p.x}
          </text>
        </g>
      ))}
    </svg>
  );
}
