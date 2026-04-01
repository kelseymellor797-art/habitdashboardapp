type PanelProps = {
  children: React.ReactNode;
  className?: string;
};

export default function Panel({ children, className = "" }: PanelProps) {
  return (
    <div
      className={`bg-[#0C0F1A] border border-white/[0.07] rounded-xl p-5 ${className}`}
    >
      {children}
    </div>
  );
}
