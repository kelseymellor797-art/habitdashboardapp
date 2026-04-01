type PanelProps = {
  children: React.ReactNode;
  className?: string;
};

export default function Panel({ children, className = "" }: PanelProps) {
  return (
    <div
      className={`bg-[#131929] border border-white/10 rounded-2xl p-5 ${className}`}
    >
      {children}
    </div>
  );
}
