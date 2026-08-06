function formatValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (value instanceof Date) return value.toLocaleString();
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) return new Date(value).toLocaleString();
  if (typeof value === "number" && value === 0) return "0";
  if (value === 1 && typeof value === "number") return "Yes";
  return String(value);
}

export default function ReportTable({ columns, rows, emptyLabel = "No records found." }) {
  if (!rows.length) {
    return <div className="bg-neutral-900 border border-neutral-800 rounded-xl py-12 text-center text-neutral-600 text-sm print:border-none">{emptyLabel}</div>;
  }
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-x-auto print:border-none print:bg-white">
      <table className="w-full text-sm print:text-black">
        <thead>
          <tr className="text-left text-neutral-500 border-b border-neutral-800 print:text-black print:border-black">
            {columns.map(([, label]) => <th key={label} className="px-4 py-3 whitespace-nowrap">{label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id ?? i} className="border-b border-neutral-800/60 print:border-neutral-300">
              {columns.map(([key, label]) => (
                <td key={label} className="px-4 py-3 text-neutral-300 whitespace-nowrap print:text-black">{formatValue(row[key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
