type PanelProps = {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
};

export default function Panel({ children, className = "", hoverable = false }: PanelProps) {
  return (
    <div
      className={`bg-[#0C0F1A] border border-white/[0.07] rounded-xl p-5 ${hoverable ? "hover:border-white/[0.12] transition-colors" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
