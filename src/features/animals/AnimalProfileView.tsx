import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '../../lib/db';
import { Loader2, ArrowLeft, Archive, RefreshCw } from 'lucide-react';
import { IUCNBadge } from './components/IUCNBadge';
import { HusbandryLogsTab } from './components/HusbandryLogsTab';
import { SignGenerator } from './components/SignGenerator';

export function AnimalProfileView({ animalId, onBack }: { animalId: string, onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'profile' | 'medical' | 'husbandry'>('profile');
  const [signGeneratorOpen, setSignGeneratorOpen] = useState(false);

  const { data: animal, isLoading } = useQuery({
    queryKey: ['animal', animalId],
    queryFn: async () => {
      const res = await db.query("SELECT * FROM animals WHERE id = $1", [animalId]);
      return res.rows[0];
    }
  });

  if (isLoading) return <div className="flex justify-center items-center min-h-[400px]"><Loader2 className="animate-spin text-emerald-500" size={48}/></div>;
  if (!animal) return <div className="text-center py-12 text-slate-500">Animal not found in local vault.</div>;

  return (
    <div className="max-w-[1200px] mx-auto pb-20">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold text-xs uppercase tracking-widest mb-6 transition-colors"><ArrowLeft size={16}/> Back to Registry</button>
      
      {/* Header Profile Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 md:items-center justify-between">
          <div className="flex items-center gap-6">
            <IUCNBadge status={animal.red_list_status} />
            <div>
              <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">{animal.name}</h1>
              <p className="text-sm font-bold text-slate-500 italic">{animal.species} ({animal.latin_name})</p>
            </div>
          </div>
          
          {/* Action Bar */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSignGeneratorOpen(true)} className="px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl font-bold text-xs uppercase hover:bg-indigo-100 transition-colors">Sign Generator</button>
            {animal.archived ? (
                <button className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase flex items-center gap-2"><RefreshCw size={14}/> Reactivate</button>
            ) : (
                <button className="px-4 py-2 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl font-bold text-xs uppercase flex items-center gap-2 hover:bg-rose-100"><Archive size={14}/> Archive</button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-t border-slate-100 bg-slate-50">
          {(['profile', 'medical', 'husbandry'] as const).map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)} 
              className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-colors ${activeTab === tab ? 'bg-white text-emerald-600 border-b-2 border-emerald-500' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"><h3 className="font-black text-slate-800 uppercase mb-4">Basic Info</h3><p className="text-sm text-slate-600">Category: {animal.category}</p><p className="text-sm text-slate-600">Location: {animal.location}</p></div>
             <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"><h3 className="font-black text-slate-800 uppercase mb-4">Environmental Targets</h3><p className="text-sm text-slate-600">Day Temp: {animal.target_day_temp_c}°C</p></div>
          </div>
        )}
        {activeTab === 'medical' && <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm text-center text-slate-500">Medical Module Mounting Point</div>}
        {activeTab === 'husbandry' && <HusbandryLogsTab animalId={animal.id} />}
      </div>

      {signGeneratorOpen && <SignGenerator animal={animal} onClose={() => setSignGeneratorOpen(false)} />}
    </div>
  );
}
