interface AnimalTableProps {
  animals: any[];
  isLoading: boolean;
}

export function AnimalTable({ animals, isLoading }: AnimalTableProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Active Roster</h3>
      </div>
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Name</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Species</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Category</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Location</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading ? (
              <tr><td colSpan={4} className="p-8 text-center text-slate-400 text-sm">Loading roster...</td></tr>
            ) : animals.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-slate-400 text-sm">No active animals found.</td></tr>
            ) : (
              animals.slice(0, 10).map((animal: any) => (
                <tr key={animal.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-sm font-bold text-slate-900">{animal.name}</td>
                  <td className="p-4 text-sm font-medium text-slate-600">{animal.species}</td>
                  <td className="p-4">
                    <span className="inline-flex px-2 py-1 text-[10px] font-bold rounded-md bg-slate-100 text-slate-600 uppercase tracking-wider">
                      {animal.category}
                    </span>
                  </td>
                  <td className="p-4 text-sm font-medium text-slate-500">{animal.location || 'Unassigned'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
