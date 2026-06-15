export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="block font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
      {children}
    </span>
  );
}
