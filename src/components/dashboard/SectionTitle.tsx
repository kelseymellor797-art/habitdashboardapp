type SectionTitleProps = {
  title: string;
  subtitle?: string;
};

export default function SectionTitle({ title, subtitle }: SectionTitleProps) {
  return (
    <div className="mb-3">
      <h3 className="text-sm font-semibold text-white/80 uppercase tracking-widest">
        {title}
      </h3>
      {subtitle && (
        <p className="text-xs text-white/30 mt-0.5">{subtitle}</p>
      )}
    </div>
  );
}
