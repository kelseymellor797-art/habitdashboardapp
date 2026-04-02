type SummaryCardProps = {
  label: string;
  value: string;
  hex: string; // e.g. "#8b5cf6"
  subtext?: string;
  trend?: string;
};

export default function SummaryCard({ label, value, hex, subtext, trend }: SummaryCardProps) {
  return (
    <div className="relative bg-[#0C0F1A] border border-white/[0.07] rounded-xl p-5 flex flex-col gap-3 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ backgroundColor: hex }} />
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-medium text-white/35 uppercase tracking-widest">{label}</span>
        {trend && (
          <span className="text-[10px] text-white/25 bg-white/[0.05] rounded-full px-2 py-0.5">{trend}</span>
        )}
      </div>
      <span className="text-[2.6rem] font-bold leading-none tabular-nums" style={{ color: hex }}>
        {value}
      </span>
      {subtext && (
        <span className="text-[11px] text-white/25 leading-snug">{subtext}</span>
      )}
    </div>
  );
}
