type SummaryCardProps = {
  label: string;
  value: string;
  accent?: string;
  subtext?: string;
};

export default function SummaryCard({
  label,
  value,
  accent = "text-emerald-400",
  subtext,
}: SummaryCardProps) {
  return (
    <div className="bg-[#131929] border border-white/10 rounded-2xl p-5 flex flex-col gap-2">
      <span className="text-xs font-medium text-white/40 uppercase tracking-widest">
        {label}
      </span>
      <span className={`text-4xl font-bold ${accent}`}>{value}</span>
      {subtext && (
        <span className="text-xs text-white/30">{subtext}</span>
      )}
    </div>
  );
}
