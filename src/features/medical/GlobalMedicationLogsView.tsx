import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '../../lib/db';
import { Loader2, Pill } from 'lucide-react';

export function GlobalMedicationLogsView() {
  const { data, isLoading } = useQuery({
    queryKey: ['global_medication_logs'],
    queryFn: async () => {
      const res = await db.query(`
        SELECT l.*, s.title as schedule_title, a.name as animal_name, u.name as staff_name
        FROM medication_logs l
        LEFT JOIN clinical_schedule s ON l.schedule_id = s.id
        LEFT JOIN animals a ON l.animal_id = a.id
        LEFT JOIN users u ON l.administered_by = u.id
        WHERE l.is_deleted = false
        ORDER BY l.administered_at DESC LIMIT 100
      `);
      return res.rows;
    }
  });

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-500" size={32}/></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3"><Pill className="text-indigo-500" size={28}/> Medication History (MAR Log)</h1>
      <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead><tr className="bg-slate-50 border-b"><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Timestamp</th><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Patient</th><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Treatment</th><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Status</th><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Staff</th></tr></thead>
          <tbody className="divide-y">
            {data?.map((l: any) => (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-xs font-bold text-slate-600">{new Date(l.administered_at).toLocaleString()}</td>
                <td className="px-4 py-3 font-bold text-sm text-indigo-600">{l.animal_name}</td>
                <td className="px-4 py-3 text-sm text-slate-800">{l.schedule_title}</td>
                <td className="px-4 py-3"><span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${l.status === 'GIVEN' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{l.status.replace('_', ' ')}</span></td>
                <td className="px-4 py-3 text-xs text-slate-600">{l.staff_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
