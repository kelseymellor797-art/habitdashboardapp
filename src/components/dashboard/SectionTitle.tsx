type SectionTitleProps = {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
};

export default function SectionTitle({ title, subtitle, action }: SectionTitleProps) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-semibold text-white/40 uppercase tracking-widest">{title}</h3>
        {action && <div>{action}</div>}
      </div>
      {subtitle && <p className="text-[11px] text-white/20 mt-0.5">{subtitle}</p>}
    </div>
  );
}
