import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '../../lib/db';
import { Loader2, CalendarClock, Plus } from 'lucide-react';
import { AddClinicalScheduleModal } from '../animals/components/AddClinicalScheduleModal';

export function GlobalMedicalScheduleView() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['global_clinical_schedule'],
    queryFn: async () => {
      const res = await db.query(`
        SELECT c.*, a.name as animal_name, a.species 
        FROM clinical_schedule c 
        LEFT JOIN animals a ON c.animal_id = a.id 
        WHERE c.is_deleted = false 
        ORDER BY c.start_date DESC LIMIT 100
      `);
      return res.rows;
    }
  });

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-500" size={32}/></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center"><h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3"><CalendarClock className="text-indigo-500" size={28}/> Clinical Schedule</h1><button onClick={() => setIsModalOpen(true)} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs shadow-lg"><Plus size={16} className="inline"/> Schedule Treatment</button></div>
      <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead><tr className="bg-slate-50 border-b"><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Patient</th><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Title / Schedule</th><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Duration</th><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Status</th></tr></thead>
          <tbody className="divide-y">
            {data?.map((s: any) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-bold text-sm text-indigo-600">{s.animal_name}</td>
                <td className="px-4 py-3"><p className="font-bold text-sm text-slate-800">{s.title}</p><span className="text-[9px] font-black uppercase text-slate-500">{s.schedule_type.replace('_', ' ')}</span></td>
                <td className="px-4 py-3 text-xs font-bold text-slate-600">{new Date(s.start_date).toLocaleDateString()} - {new Date(s.end_date).toLocaleDateString()}</td>
                <td className="px-4 py-3"><span className="text-[9px] font-black uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{s.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AddClinicalScheduleModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
