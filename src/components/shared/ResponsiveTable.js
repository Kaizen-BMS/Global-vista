export default function ResponsiveTable({ children }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
      <div className="min-w-[640px]">{children}</div>
    </div>
  );
}