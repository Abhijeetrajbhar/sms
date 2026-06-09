export default function SparkLine({ data = [], stroke = '#3188ff', height = 52, width = 150 }) {
  if (!data.length) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((value, index) => {
      const x = (index / Math.max(data.length - 1, 1)) * width;
      const y = height - ((value - min) / range) * (height - 10) - 5;
      return `${x},${y}`;
    })
    .join(' ');
  const last = points.split(' ').at(-1).split(',');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full overflow-visible" role="img" aria-label="Trend sparkline">
      <defs>
        <linearGradient id="sparkGradient" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.25" />
          <stop offset="100%" stopColor={stroke} />
        </linearGradient>
      </defs>
      <polyline points={points} fill="none" stroke="url(#sparkGradient)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="4" fill={stroke} />
    </svg>
  );
}
