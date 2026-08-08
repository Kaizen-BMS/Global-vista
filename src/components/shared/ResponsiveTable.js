export default function ResponsiveTable({ children }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
      <div className="min-w-[640px]">{children}</div>
    </div>
  );
}