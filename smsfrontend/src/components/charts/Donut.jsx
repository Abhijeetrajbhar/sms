export default function Donut({ value = 0, label = 'Score', size = 96, stroke = '#3188ff' }) {
  const safeValue = Math.max(0, Math.min(100, value));
  const radius = size / 2 - 8;
  const circumference = 2 * Math.PI * radius;
  const dash = (safeValue / 100) * circumference;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label}: ${safeValue}%`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E2E8F0" strokeWidth="8" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={stroke}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" className="fill-on-surface text-lg font-bold">
        {safeValue}%
      </text>
      <text x="50%" y="65%" textAnchor="middle" dominantBaseline="middle" className="fill-on-surface-variant text-[10px] font-bold uppercase">
        {label}
      </text>
    </svg>
  );
}
