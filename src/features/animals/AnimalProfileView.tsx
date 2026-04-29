import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { db } from '../../lib/db';
import { queryClient } from '../../lib/queryClient';
import { useSyncStore } from '../../store/syncStore';
import { useAuthStore } from '../../store/authStore';
import { Loader2, ArrowLeft, Archive, RefreshCw, FileText, Stethoscope, ClipboardList, ShieldAlert, Thermometer, Scale, AlertTriangle, GitMerge, Edit2 } from 'lucide-react';
import { IUCNBadge } from './components/IUCNBadge';
import { HusbandryLogsTab } from './components/HusbandryLogsTab';
import { SignGenerator } from './components/SignGenerator';
import { AddAnimalModal } from './components/AddAnimalModal';

export function AnimalProfileView({ animalId, onBack }: { animalId: string, onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'profile' | 'medical' | 'husbandry'>('profile');
  const [signGeneratorOpen, setSignGeneratorOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const currentUserId = useAuthStore(s => s.session?.user?.id);

  const { data: animal, isLoading } = useQuery({
    queryKey: ['animal', animalId],
    queryFn: async () => {
      const res = await db.query("SELECT * FROM animals WHERE id = $1", [animalId]);
      return res.rows[0];
    }
  });

  const archiveMutation = useMutation({
    mutationFn: async (isArchiving: boolean) => {
      await db.query(
        `UPDATE animals SET archived = $1, archived_at = $2, updated_at = now(), modified_by = $3 WHERE id = $4`,
        [isArchiving, isArchiving ? new Date().toISOString() : null, currentUserId, animalId]
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['animal', animalId] });
      useSyncStore.getState().pushToCloud().catch(console.error);
    }
  });

  const formatId = (id: string | null) => {
    if (!id || id === '00000000-0000-0000-0000-000000000000' || id === 'unknown') return 'Unknown';
    return id;
  };

  // TYPE-DEFENSIVE ARRAY RENDERER
  const renderArrayNotes = (notes: any, emptyText: string, textStyle: string) => {
    if (!notes) return <p className={`text-sm opacity-70 ${textStyle}`}>{emptyText}</p>;
    let arr: string[] = [];
    if (Array.isArray(notes)) {
      if (notes.length === 1 && notes[0] === 'none') return <p className={`text-sm opacity-70 ${textStyle}`}>{emptyText}</p>;
      arr = notes;
    } else if (typeof notes === 'string') {
      if (notes === 'none') return <p className={`text-sm opacity-70 ${textStyle}`}>{emptyText}</p>;
      arr = notes.split(/\n|\\n/).filter(n => n.trim() !== '');
    }
    if (arr.length === 0) return <p className={`text-sm opacity-70 ${textStyle}`}>{emptyText}</p>;
    return (
      <ul className={`list-disc list-outside ml-4 space-y-1 text-sm font-medium ${textStyle}`}>
        {arr.map((note, idx) => <li key={idx}>{typeof note === 'string' ? note.trim() : String(note)}</li>)}
      </ul>
    );
  };

  if (isLoading) return <div className="flex justify-center items-center min-h-[400px]"><Loader2 className="animate-spin text-emerald-500" size={48}/></div>;
  if (!animal) return <div className="text-center py-12 text-slate-500">Animal not found in local vault.</div>;

  return (
    <div className="max-w-[1200px] mx-auto pb-20 p-2 md:p-4">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold text-xs uppercase tracking-widest mb-6 transition-colors"><ArrowLeft size={16}/> Back</button>
      
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row gap-6 mb-6">
        <div className="w-full md:w-1/3 flex flex-col gap-4">
          <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden shadow-sm bg-slate-100 border border-slate-200">
            <img src={animal.image_url && animal.image_url !== '-1' ? animal.image_url : '/offline-media-fallback.svg'} alt={animal.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = '/offline-media-fallback.svg'; }} />
          </div>
        </div>
        
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-2">
              <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">{animal.name}</h1>
              <div className="flex gap-2 items-center">
                {animal.is_boarding && <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-bold rounded-full uppercase tracking-widest">Boarding</span>}
                {animal.archived && <span className="px-2 py-1 bg-slate-200 text-slate-700 text-xs font-bold rounded-full uppercase tracking-widest">Archived</span>}
                <IUCNBadge status={animal.red_list_status} />
              </div>
            </div>
            <div className="flex flex-col gap-0.5 mb-6">
              <p className="text-slate-400 font-mono text-[10px] uppercase tracking-widest">ID: {animal.id}</p>
              <p className="text-slate-400 font-mono text-[10px] uppercase tracking-widest">Ring/Chip: {animal.ring_number !== 'unknown' ? animal.ring_number : animal.microchip_id !== 'unknown' ? animal.microchip_id : 'Un-ringed'}</p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-6 gap-x-4 text-sm mb-8">
              <div><span className="text-[10px] font-black tracking-widest uppercase text-slate-400 block mb-1">Species</span><span className="font-bold text-slate-900">{animal.species}</span><span className="block text-slate-500 italic text-xs">{animal.latin_name !== 'unknown' ? animal.latin_name : ''}</span></div>
              <div><span className="text-[10px] font-black tracking-widest uppercase text-slate-400 block mb-1">Location</span><span className="font-bold text-slate-900 uppercase tracking-wider">{animal.location}</span></div>
              <div><span className="text-[10px] font-black tracking-widest uppercase text-slate-400 block mb-1">Sex</span><span className="font-bold text-slate-900 capitalize">{animal.gender}</span></div>
              <div><span className="text-[10px] font-black tracking-widest uppercase text-slate-400 block mb-1">Origin</span><span className="font-bold text-slate-900">{animal.origin !== 'unknown' ? animal.origin : '-'}</span></div>
              <div><span className="text-[10px] font-black tracking-widest uppercase text-slate-400 block mb-1">Acquisition</span><span className="font-bold text-slate-900">{animal.acquisition_date && animal.acquisition_date !== '1900-01-01' ? new Date(animal.acquisition_date).toLocaleDateString() : 'Unknown'}</span></div>
              <div><span className="text-[10px] font-black tracking-widest uppercase text-slate-400 block mb-1">Date of Birth</span><span className="font-bold text-slate-900">{animal.date_of_birth && animal.date_of_birth !== '1900-01-01' ? new Date(animal.date_of_birth).toLocaleDateString() : 'Unknown'} {animal.is_dob_unknown && '(Est)'}</span></div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
            <button onClick={() => setIsEditModalOpen(true)} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-emerald-700 transition-colors"><Edit2 size={14}/> Edit Profile</button>
            <button onClick={() => setSignGeneratorOpen(true)} className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-colors"><FileText size={14}/> Sign Generator</button>
            {animal.archived ? (
                <button onClick={() => window.confirm('Reactivate this animal?') && archiveMutation.mutate(false)} disabled={archiveMutation.isPending} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"><RefreshCw size={14} className={archiveMutation.isPending ? "animate-spin" : ""}/> Reactivate</button>
            ) : (
                <button onClick={() => window.confirm('Archive this animal?') && archiveMutation.mutate(true)} disabled={archiveMutation.isPending} className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 text-rose-600 border border-rose-200 font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-rose-100 transition-colors disabled:opacity-50"><Archive size={14}/> Archive</button>
            )}
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200 mb-6">
        <nav className="flex gap-6">
          {(['profile', 'medical', 'husbandry'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex items-center gap-2 pb-4 px-1 border-b-2 font-black text-xs uppercase tracking-widest transition-colors ${activeTab === tab ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-700'}`}>
              {tab === 'profile' && <FileText size={16}/>}
              {tab === 'medical' && <Stethoscope size={16}/>}
              {tab === 'husbandry' && <ClipboardList size={16}/>}
              {tab}
            </button>
          ))}
        </nav>
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'profile' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              
              <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:col-span-1 xl:col-span-2 shadow-sm">
                <div className="flex items-center gap-2 mb-4"><FileText className="text-slate-400" size={20} /><h3 className="font-black text-slate-800 uppercase tracking-tight">General Description</h3></div>
                {renderArrayNotes(animal.description, "No description provided.", "text-slate-600")}
              </div>

              <div className="bg-red-50 border border-red-200 rounded-2xl p-6 lg:col-span-1 xl:col-span-1 shadow-sm">
                <div className="flex items-center gap-2 mb-4"><AlertTriangle className="text-red-500" size={20} /><h3 className="font-black text-red-900 uppercase tracking-tight">Critical Notes</h3></div>
                {renderArrayNotes(animal.critical_husbandry_notes, "No critical notes.", "text-red-800")}
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
                 <div className="absolute inset-0 bg-slate-50 opacity-50"></div>
                 {animal.distribution_map_url && animal.distribution_map_url !== '-1' ? (
                   <img src={animal.distribution_map_url} alt="Distribution Map" className="w-full h-full object-contain relative z-10" />
                 ) : (
                   <p className="text-slate-400 font-bold text-xs uppercase tracking-widest relative z-10">No Range Map</p>
                 )}
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4"><GitMerge className="text-slate-400" size={20} /><h3 className="font-black text-slate-800 uppercase tracking-tight">Lineage & Genetics</h3></div>
                <div className="space-y-3">
                  <div><span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Sire ID</span><span className="text-sm font-bold text-slate-700 font-mono">{formatId(animal.sire_id)}</span></div>
                  <div><span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Dam ID</span><span className="text-sm font-bold text-slate-700 font-mono">{formatId(animal.dam_id)}</span></div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4"><ShieldAlert className="text-slate-400" size={20} /><h3 className="font-black text-slate-800 uppercase tracking-tight">Safety & Hazards</h3></div>
                <div className="space-y-4">
                  <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Hazard Rating</span>
                      <span className={`text-sm font-black uppercase tracking-widest ${animal.hazard_rating === 'HIGH' ? 'text-red-600' : animal.hazard_rating === 'MEDIUM' ? 'text-amber-600' : 'text-emerald-600'}`}>{animal.hazard_rating !== 'unknown' ? animal.hazard_rating : 'N/A'}</span>
                  </div>
                  {animal.is_venomous && <div className="bg-red-100 text-red-800 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 w-fit"><AlertTriangle size={16} /> VENOMOUS</div>}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4"><Scale className="text-slate-400" size={20} /><h3 className="font-black text-slate-800 uppercase tracking-tight">Weight Management</h3></div>
                <div className="space-y-3">
                  <div><span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Target / Flying Weight</span><span className="text-sm font-bold text-blue-600">{animal.flying_weight_g > 0 ? `${animal.flying_weight_g}${animal.weight_unit}` : 'N/A'}</span></div>
                  <div><span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Winter Weight</span><span className="text-sm font-bold text-blue-600">{animal.winter_weight_g > 0 ? `${animal.winter_weight_g}${animal.weight_unit}` : 'N/A'}</span></div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm lg:col-span-2">
                <div className="flex items-center gap-2 mb-4"><Thermometer className="text-slate-400" size={20} /><h3 className="font-black text-slate-800 uppercase tracking-tight">Environmental Targets</h3></div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div><span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Day Temp</span><span className="text-sm font-bold text-slate-700">{animal.target_day_temp_c !== null ? `${animal.target_day_temp_c}°C` : 'N/A'}</span></div>
                  <div><span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Night Temp</span><span className="text-sm font-bold text-slate-700">{animal.target_night_temp_c !== null ? `${animal.target_night_temp_c}°C` : 'N/A'}</span></div>
                  <div><span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Humidity Target</span><span className="text-sm font-bold text-slate-700">{animal.target_humidity_min_percent !== null ? `${animal.target_humidity_min_percent}% - ${animal.target_humidity_max_percent}%` : 'N/A'}</span></div>
                  <div><span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Misting</span><span className="text-sm font-bold text-slate-700">{animal.misting_frequency || 'N/A'}</span></div>
                </div>
              </div>
            </div>
        )}
        {activeTab === 'medical' && <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm text-center text-slate-500 font-bold uppercase tracking-widest text-xs">Medical Module Mounting Point</div>}
        {activeTab === 'husbandry' && <HusbandryLogsTab animalId={animal.id} />}
      </div>

      {signGeneratorOpen && <SignGenerator animal={animal} onClose={() => setSignGeneratorOpen(false)} />}
      {isEditModalOpen && <AddAnimalModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} existingAnimalId={animal.id} />}
    </div>
  );
}
