type SectionTitleProps = {
  title: string;
  subtitle?: string;
};

export default function SectionTitle({ title, subtitle }: SectionTitleProps) {
  return (
    <div className="mb-4">
      <h3 className="text-[11px] font-semibold text-white/40 uppercase tracking-widest">
        {title}
      </h3>
      {subtitle && (
        <p className="text-[11px] text-white/20 mt-0.5">{subtitle}</p>
      )}
    </div>
  );
}
