export default function MiniBars({ data = [], labels = [], tone = 'blue' }) {
  const gradients = {
    blue: 'from-oryx-500 to-cyan-400',
    violet: 'from-violet-500 to-fuchsia-500',
    emerald: 'from-emerald-500 to-teal-400',
    amber: 'from-amber-500 to-orange-500',
  };
  const max = Math.max(...data, 1);

  return (
    <div className="flex h-40 items-end gap-3">
      {data.map((value, index) => (
        <div key={`${value}-${index}`} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex h-32 w-full items-end rounded-full bg-slate-100 p-1">
            <div
              className={`w-full rounded-full bg-gradient-to-t ${gradients[tone] || gradients.blue}`}
              style={{ height: `${Math.max(8, (value / max) * 100)}%` }}
            />
          </div>
          <span className="text-xs font-bold text-slate-400">{labels[index] || index + 1}</span>
        </div>
      ))}
    </div>
  );
}
