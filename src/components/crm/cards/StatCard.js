export default function StatCard({ label, value, icon: Icon, accent = "indigo" }) {
  const accents = {
    indigo: "text-indigo-400 bg-indigo-500/10",
    green: "text-green-400 bg-green-500/10",
    blue: "text-blue-400 bg-blue-500/10",
    yellow: "text-yellow-400 bg-yellow-500/10",
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
      <div>
        <p className="text-muted-foreground text-xs mb-1">{label}</p>
        <p className="text-foreground text-2xl font-semibold">{value}</p>
      </div>
      {Icon && (
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${accents[accent]}`}>
          <Icon className="h-5 w-5" />
        </div>
      )}
    </div>
  );
}