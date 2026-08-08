export default function EmptyState({ icon: Icon, title = "Nothing here", description }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3"><Icon className="h-5 w-5 text-muted-foreground" /></div>}
      <p className="text-foreground text-sm font-medium">{title}</p>
      {description && <p className="text-muted-foreground text-xs mt-1">{description}</p>}
    </div>
  );
}