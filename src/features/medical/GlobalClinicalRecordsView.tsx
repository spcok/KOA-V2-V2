import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '../../lib/db';
import { Loader2, Stethoscope, Plus } from 'lucide-react';
import { AddClinicalRecordModal } from '../animals/components/AddClinicalRecordModal';

export function GlobalClinicalRecordsView() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['global_clinical_records'],
    queryFn: async () => {
      const res = await db.query(`SELECT c.*, a.name as animal_name, u.name as staff_name FROM clinical_records c LEFT JOIN animals a ON c.animal_id = a.id LEFT JOIN users u ON c.conducted_by = u.id WHERE c.is_deleted = false ORDER BY c.record_date DESC LIMIT 100`);
      return res.rows;
    }
  });

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-500" size={32}/></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center"><h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3"><Stethoscope className="text-indigo-500" size={28}/> Clinical Records</h1><button onClick={() => setIsModalOpen(true)} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs shadow-lg"><Plus size={16} className="inline"/> Log Record</button></div>
      <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead><tr className="bg-slate-50 border-b"><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Date</th><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Patient</th><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Type / Role</th><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Assessment</th></tr></thead>
          <tbody className="divide-y">
            {data?.map((r: any) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-xs font-bold text-slate-600">{new Date(r.record_date).toLocaleString()}</td>
                <td className="px-4 py-3 font-bold text-sm text-indigo-600">{r.animal_name}</td>
                <td className="px-4 py-3"><span className="text-[9px] font-black uppercase bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded mr-2">{r.record_type.replace('_', ' ')}</span><span className="text-[9px] font-black uppercase text-slate-500">{r.conductor_role}</span></td>
                <td className="px-4 py-3 text-xs text-slate-700 max-w-md truncate">{r.soap_assessment}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AddClinicalRecordModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
