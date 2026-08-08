import { ShieldAlert } from "lucide-react";
export default function ForbiddenState({ message = "You don't have permission to view this." }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="h-14 w-14 rounded-full bg-yellow-500/10 flex items-center justify-center mb-4"><ShieldAlert className="h-6 w-6 text-yellow-400" /></div>
      <h2 className="text-foreground text-lg font-medium mb-1">Access Restricted</h2>
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );
}