export default function EmptyState({ icon: Icon, title = "Nothing here", description }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && <div className="h-12 w-12 rounded-full bg-neutral-800 flex items-center justify-center mb-3"><Icon className="h-5 w-5 text-neutral-400" /></div>}
      <p className="text-white text-sm font-medium">{title}</p>
      {description && <p className="text-neutral-500 text-xs mt-1">{description}</p>}
    </div>
  );
}