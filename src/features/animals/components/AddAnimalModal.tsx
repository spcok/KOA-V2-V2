import React, { useState, useEffect, useRef } from 'react';
import { useForm } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import { db } from '../../../lib/db';
import { queryClient } from '../../../lib/queryClient';
import { useSyncStore } from '../../../store/syncStore';
import { useAuthStore } from '../../../store/authStore';
import { X, Save, Loader2, Image as ImageIcon, Map as MapIcon, Check, ZoomIn } from 'lucide-react';

function ImageCropper({ src, aspect, onCrop, onCancel }: { src: string, aspect: number, onCrop: (b64: string) => void, onCancel: () => void }) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStart.current = { x: clientX - offset.x, y: clientY - offset.y };
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setOffset({ x: clientX - dragStart.current.x, y: clientY - dragStart.current.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const confirmCrop = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx || !imgRef.current || !containerRef.current) return;

    const MAX_WIDTH = 800;
    canvas.width = MAX_WIDTH;
    canvas.height = MAX_WIDTH / aspect;

    const container = containerRef.current.getBoundingClientRect();
    let cropWidth = container.width;
    let cropHeight = container.width / aspect;
    if (cropHeight > container.height) {
       cropHeight = container.height;
       cropWidth = container.height * aspect;
    }

    const scaleX = imgRef.current.naturalWidth / (imgRef.current.width * zoom);
    const scaleY = imgRef.current.naturalHeight / (imgRef.current.height * zoom);

    const imgCenterX = container.width / 2 + offset.x;
    const imgCenterY = container.height / 2 + offset.y;
    
    const cropBoxX = (container.width - cropWidth) / 2;
    const cropBoxY = (container.height - cropHeight) / 2;

    const sourceX = (cropBoxX - (imgCenterX - (imgRef.current.width * zoom) / 2)) * scaleX;
    const sourceY = (cropBoxY - (imgCenterY - (imgRef.current.height * zoom) / 2)) * scaleY;
    const sourceWidth = cropWidth * scaleX;
    const sourceHeight = cropHeight * scaleY;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imgRef.current, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
    
    onCrop(canvas.toDataURL('image/jpeg', 0.85));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/95 z-[200] flex flex-col items-center justify-center p-4">
      <div className="text-white text-center mb-4"><h3 className="font-black uppercase tracking-widest text-lg">Crop Image</h3><p className="text-sm opacity-70">Drag to pan. Use slider to zoom.</p></div>
      <div 
        ref={containerRef}
        className="relative w-full max-w-2xl h-[50vh] bg-black overflow-hidden touch-none cursor-move rounded-xl ring-2 ring-slate-700 shadow-2xl"
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown} onTouchMove={handleMouseMove} onTouchEnd={handleMouseUp}
      >
        <img ref={imgRef} src={src} alt="Crop target" className="absolute top-1/2 left-1/2 origin-center pointer-events-none" style={{ transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${zoom})`, maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
        <div className="absolute inset-0 pointer-events-none bg-black/60">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-2 border-amber-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]" style={{ aspectRatio: aspect, width: aspect > 1 ? '100%' : 'auto', height: aspect <= 1 ? '100%' : 'auto', maxHeight: '100%', maxWidth: '100%' }}>
            <div className="absolute inset-0 border border-white/20 grid grid-cols-3 grid-rows-3 pointer-events-none"><div className="border-r border-b border-white/20"/><div className="border-r border-b border-white/20"/><div className="border-b border-white/20"/><div className="border-r border-b border-white/20"/><div className="border-r border-b border-white/20"/><div className="border-b border-white/20"/><div className="border-r border-white/20"/><div className="border-r border-white/20"/><div/></div>
          </div>
        </div>
      </div>
      <div className="w-full max-w-md flex items-center gap-4 mt-6 bg-slate-800 p-4 rounded-xl">
        <ZoomIn className="text-slate-400" size={20} />
        <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full accent-amber-500" />
      </div>
      <div className="flex gap-4 mt-6">
        <button onClick={onCancel} className="px-6 py-3 bg-slate-700 text-white font-bold uppercase text-xs tracking-widest rounded-xl hover:bg-slate-600">Cancel</button>
        <button onClick={confirmCrop} className="px-8 py-3 bg-amber-500 text-amber-950 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-amber-400 flex items-center gap-2"><Check size={18}/> Confirm Crop</button>
      </div>
    </div>
  );
}

function FormField({ form, name, label, type = 'text', options, className = "", placeholder = "" }: any) {
  return (
    <form.Field name={name}>
      {(field: any) => (
        <div className={type === 'checkbox' ? 'flex items-center gap-3' : 'w-full'}>
          {type !== 'checkbox' && <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</label>}
          {type === 'select' ? (
            <select value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} onBlur={field.handleBlur} className={`w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-emerald-500 ${className}`}>
              {options.map((o: any) => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
            </select>
          ) : type === 'textarea' ? (
            <textarea value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} onBlur={field.handleBlur} className={`w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-emerald-500 ${className}`} placeholder={placeholder} />
          ) : type === 'checkbox' ? (
            <>
              <input type="checkbox" checked={Boolean(field.state.value)} onChange={(e) => field.handleChange(e.target.checked)} onBlur={field.handleBlur} className={`w-5 h-5 rounded border-slate-300 focus:ring-emerald-500 ${className}`} />
              <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">{label}</label>
            </>
          ) : (
            <input type={type} value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} onBlur={field.handleBlur} className={`w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-emerald-500 ${className}`} placeholder={placeholder} />
          )}
        </div>
      )}
    </form.Field>
  );
}

const DEFAULT_VALUES = {
  entity_type: 'INDIVIDUAL', parent_mob_id: '', census_count: 1, name: '', species: '', latin_name: '', category: 'Mammal', location: '',
  image_url: '', distribution_map_url: '', hazard_rating: 'LOW', is_venomous: false, weight_unit: 'g', flying_weight_g: '', winter_weight_g: '', average_target_weight: '',
  date_of_birth: '', is_dob_unknown: false, gender: 'Unknown', microchip_id: '', ring_number: '', has_no_id: false, red_list_status: 'NE',
  description: '', special_requirements: '', critical_husbandry_notes: '', ambient_temp_only: false, target_day_temp_c: '', target_night_temp_c: '', water_tipping_temp: '', target_humidity_min_percent: '', target_humidity_max_percent: '', misting_frequency: '',
  acquisition_date: '', acquisition_type: 'unknown', origin: '', origin_location: '', lineage_unknown: false, sire_id: '', dam_id: '',
  is_boarding: false, is_quarantine: false, display_order: 0
};

export function AddAnimalModal({ isOpen, onClose, existingAnimalId }: { isOpen: boolean, onClose: () => void, existingAnimalId?: string }) {
  const [isFetching, setIsFetching] = useState(false);
  const [activeSection, setActiveSection] = useState<'core' | 'id' | 'env' | 'health' | 'admin'>('core');
  
  const [cropFileSrc, setCropFileSrc] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<'image_url' | 'distribution_map_url' | null>(null);
  const [mapAspect, setMapAspect] = useState<number>(16/9);

  const currentUserId = useAuthStore(s => s.session?.user?.id);

  const form = useForm({
    defaultValues: DEFAULT_VALUES,
    onSubmit: async ({ value }) => {
      const payload: any = { ...value };
      const ZERO_UUID = '00000000-0000-0000-0000-000000000000';
      
      // STRICT SCHEMA ENFORCEMENT
      // 1. UUIDs -> Must fallback to ZERO_UUID, not null
      ['parent_mob_id', 'sire_id', 'dam_id'].forEach(k => {
        if (!payload[k] || payload[k].trim() === '' || payload[k] === 'unknown') payload[k] = ZERO_UUID;
      });

      // 2. Numerics -> Must fallback to -1, not null
      ['flying_weight_g', 'winter_weight_g', 'average_target_weight', 'target_day_temp_c', 'target_night_temp_c', 'water_tipping_temp', 'target_humidity_min_percent', 'target_humidity_max_percent'].forEach(k => {
        if (payload[k] === '' || payload[k] === null || payload[k] === undefined) payload[k] = -1;
        else payload[k] = Number(payload[k]);
      });
      payload.census_count = Number(payload.census_count) || 1;
      payload.display_order = Number(payload.display_order) || 0;

      // 3. Strings -> Must fallback to 'unknown'
      ['name', 'species', 'latin_name', 'category', 'location', 'hazard_rating', 'gender', 'microchip_id', 'ring_number', 'red_list_status', 'acquisition_type', 'origin', 'origin_location'].forEach(k => {
        if (!payload[k] || String(payload[k]).trim() === '') payload[k] = 'unknown';
      });
      
      if (!payload.image_url || payload.image_url === '') payload.image_url = '-1';
      if (!payload.distribution_map_url || payload.distribution_map_url === '') payload.distribution_map_url = null; // Schema allows null here
      if (!payload.misting_frequency || payload.misting_frequency.trim() === '') payload.misting_frequency = null; // Schema allows null here

      // 4. Arrays -> Must fallback to ['none']
      ['description', 'special_requirements', 'critical_husbandry_notes'].forEach(k => {
        if (!payload[k] || payload[k].trim() === '') payload[k] = ['none'];
        else if (typeof payload[k] === 'string') payload[k] = payload[k].split(/\n|\\n/).map((s: string) => s.trim()).filter((s: string) => s !== '');
      });

      // 5. Dates -> Must fallback to '1900-01-01'
      if (!payload.date_of_birth) payload.date_of_birth = '1900-01-01';
      if (!payload.acquisition_date) payload.acquisition_date = '1900-01-01';

      const uId = currentUserId || null;

      try {
          if (existingAnimalId) {
            const cols = Object.keys(payload);
            const setClause = cols.map((c, i) => `${c} = $${i + 1}`).join(', ');
            const values = cols.map(c => payload[c]);
            await db.query(`UPDATE animals SET ${setClause}, updated_at = now(), modified_by = $${cols.length + 1} WHERE id = $${cols.length + 2}`, [...values, uId, existingAnimalId]);
          } else {
            const cols = Object.keys(payload);
            const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
            const values = cols.map(c => payload[c]);
            await db.query(`INSERT INTO animals (${cols.join(', ')}, created_by, modified_by) VALUES (${placeholders}, $${cols.length + 1}, $${cols.length + 1})`, [...values, uId]);
          }
          queryClient.invalidateQueries();
          useSyncStore.getState().pushToCloud().catch(console.error);
          onClose();
      } catch (err: any) {
          console.error(err);
          alert(`Save Failed: ${err.message}`);
      }
    }
  });

  useEffect(() => {
    if (existingAnimalId && isOpen) {
      setIsFetching(true);
      db.query("SELECT * FROM animals WHERE id = $1", [existingAnimalId]).then(res => {
        if (res.rows[0]) {
            const r = res.rows[0];
            const loadData = { ...DEFAULT_VALUES };
            Object.keys(DEFAULT_VALUES).forEach(k => {
                if (r[k] !== undefined && r[k] !== null) loadData[k as keyof typeof DEFAULT_VALUES] = r[k];
            });
            
            // Revert strict defaults to UI-friendly blank states
            if (loadData.date_of_birth === '1900-01-01T00:00:00.000Z' || loadData.date_of_birth === '1900-01-01') loadData.date_of_birth = '';
            else loadData.date_of_birth = new Date(loadData.date_of_birth).toISOString().split('T')[0];
            
            if (loadData.acquisition_date === '1900-01-01T00:00:00.000Z' || loadData.acquisition_date === '1900-01-01') loadData.acquisition_date = '';
            else loadData.acquisition_date = new Date(loadData.acquisition_date).toISOString().split('T')[0];
            
            ['parent_mob_id', 'sire_id', 'dam_id'].forEach(k => {
               if (loadData[k as keyof typeof DEFAULT_VALUES] === '00000000-0000-0000-0000-000000000000') loadData[k as keyof typeof DEFAULT_VALUES] = '' as never;
            });

            ['flying_weight_g', 'winter_weight_g', 'average_target_weight', 'target_day_temp_c', 'target_night_temp_c', 'water_tipping_temp', 'target_humidity_min_percent', 'target_humidity_max_percent'].forEach(k => {
               if (loadData[k as keyof typeof DEFAULT_VALUES] === -1) loadData[k as keyof typeof DEFAULT_VALUES] = '' as never;
            });

            ['name', 'species', 'latin_name', 'category', 'location', 'hazard_rating', 'gender', 'microchip_id', 'ring_number', 'red_list_status', 'acquisition_type', 'origin', 'origin_location'].forEach(k => {
               if (loadData[k as keyof typeof DEFAULT_VALUES] === 'unknown') loadData[k as keyof typeof DEFAULT_VALUES] = '' as never;
            });

            if (loadData.image_url === '-1') loadData.image_url = '';

            ['description', 'special_requirements', 'critical_husbandry_notes'].forEach(k => {
                const val = loadData[k as keyof typeof DEFAULT_VALUES];
                if (Array.isArray(val)) {
                    if (val.length === 1 && val[0] === 'none') loadData[k as keyof typeof DEFAULT_VALUES] = '';
                    else loadData[k as keyof typeof DEFAULT_VALUES] = val.join('\n') as never;
                }
            });

            form.update({ defaultValues: loadData });
            form.reset();
        }
        setIsFetching(false);
      });
    }
  }, [existingAnimalId, isOpen, form]);

  const triggerUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'image_url' | 'distribution_map_url') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setCropFileSrc(ev.target?.result as string);
        setCropTarget(field);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = ''; 
  };

  if (!isOpen) return null;

  return (
    <>
      {cropFileSrc && cropTarget && (
        <ImageCropper 
          src={cropFileSrc} 
          aspect={cropTarget === 'image_url' ? 4/3 : mapAspect} 
          onCrop={(b64) => { form.setFieldValue(cropTarget, b64); setCropFileSrc(null); setCropTarget(null); }}
          onCancel={() => { setCropFileSrc(null); setCropTarget(null); }}
        />
      )}

      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 sm:p-6">
        <div className="bg-white border border-slate-200 shadow-2xl rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
            <h2 className="text-xl font-black tracking-tight text-slate-800 uppercase flex items-center gap-3">
              {existingAnimalId ? 'Edit Animal Profile' : 'Add New Animal'}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"><X size={20} /></button>
          </div>
          
          <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto scrollbar-hide shrink-0">
             {[
               { id: 'core', label: 'Core Details' }, 
               { id: 'id', label: 'Media & ID' }, 
               { id: 'env', label: 'Environment' }, 
               { id: 'health', label: 'Health & Lineage' }, 
               { id: 'admin', label: 'Admin Status' }
             ].map(t => (
                <button key={t.id} onClick={() => setActiveSection(t.id as any)} className={`px-6 py-4 text-xs font-black uppercase tracking-widest whitespace-nowrap border-b-2 transition-colors ${activeSection === t.id ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-700'}`}>
                  {t.label}
                </button>
             ))}
          </div>

          {isFetching ? (
            <div className="p-12 flex justify-center items-center flex-1"><Loader2 size={32} className="animate-spin text-emerald-500" /></div>
          ) : (
            <div className="p-6 overflow-y-auto flex-1 bg-white custom-scrollbar">
              
              <div className={activeSection === 'core' ? 'space-y-6' : 'hidden'}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      <div className="lg:col-span-3"><FormField form={form} name="name" label="Animal Name / Mob Name *" className="bg-slate-50 font-bold text-slate-800 p-3" /></div>
                      <FormField form={form} name="species" label="Common Species" />
                      <FormField form={form} name="latin_name" label="Latin Name" className="italic text-slate-600" />
                      <FormField form={form} name="category" label="Taxonomy Category" type="select" options={['Mammal', 'Bird', 'Reptile', 'Amphibian', 'Invertebrate', 'Fish', 'Raptor', 'Owl', 'Exotic', 'Other']} />
                      <FormField form={form} name="gender" label="Gender" type="select" options={['Unknown', 'Male', 'Female']} />
                      <FormField form={form} name="date_of_birth" label="Date of Birth" type="date" />
                      <div className="pt-6"><FormField form={form} name="is_dob_unknown" label="DOB is an Estimate" type="checkbox" className="text-emerald-500" /></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                      <div className="col-span-1 md:col-span-2"><FormField form={form} name="description" label="General Description" type="textarea" className="h-24" /></div>
                      <FormField form={form} name="origin" label="Origin Entity (e.g., Zoo Name)" />
                      <FormField form={form} name="origin_location" label="Origin Location (City/Country)" />
                      <FormField form={form} name="acquisition_date" label="Acquisition Date" type="date" />
                      <FormField form={form} name="acquisition_type" label="Acquisition Type" type="select" options={[{value:'DONATION', label:'Donation'}, {value:'PURCHASE', label:'Purchase'}, {value:'BREEDING', label:'Internal Breeding'}, {value:'RESCUE', label:'Rescue/Confiscation'}, {value:'LOAN', label:'Loan'}, {value:'unknown', label:'Unknown'}]} />
                  </div>
              </div>

              <div className={activeSection === 'id' ? 'space-y-6' : 'hidden'}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                      <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Profile Photo (4:3 Crop)</label>
                          <label className="flex flex-col items-center justify-center h-32 w-full bg-white border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-emerald-400 transition-colors relative overflow-hidden group">
                              <form.Field name="image_url">{({ state }) => (
                                <>
                                  {state.value && state.value !== '-1' ? (
                                    <img src={state.value} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-20 transition-opacity" />
                                  ) : <ImageIcon size={24} className="text-slate-400 mb-2"/>}
                                  <span className="text-xs font-bold text-slate-800 z-10 bg-white/80 px-3 py-1 rounded-full backdrop-blur-sm shadow-sm">{state.value && state.value !== '-1' ? 'Replace Photo' : 'Select Photo'}</span>
                                </>
                              )}</form.Field>
                              <input type="file" accept="image/*" className="hidden" onChange={e => triggerUpload(e, 'image_url')} />
                          </label>
                      </div>
                      <div>
                          <label className="flex items-center justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                             <span>Distribution Map</span>
                             <select value={mapAspect} onChange={e => setMapAspect(Number(e.target.value))} className="bg-transparent text-emerald-600 focus:outline-none"><option value={16/9}>16:9 Horizontal</option><option value={9/16}>9:16 Vertical</option><option value={1}>1:1 Square</option></select>
                          </label>
                          <label className="flex flex-col items-center justify-center h-32 w-full bg-white border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-emerald-400 transition-colors relative overflow-hidden group">
                              <form.Field name="distribution_map_url">{({ state }) => (
                                <>
                                  {state.value && state.value !== '-1' ? (
                                    <img src={state.value} alt="Preview" className="absolute inset-0 w-full h-full object-contain opacity-50 group-hover:opacity-20 transition-opacity" />
                                  ) : <MapIcon size={24} className="text-slate-400 mb-2"/>}
                                  <span className="text-xs font-bold text-slate-800 z-10 bg-white/80 px-3 py-1 rounded-full backdrop-blur-sm shadow-sm">{state.value && state.value !== '-1' ? 'Replace Map' : 'Select Map'}</span>
                                </>
                              )}</form.Field>
                              <input type="file" accept="image/*" className="hidden" onChange={e => triggerUpload(e, 'distribution_map_url')} />
                          </label>
                      </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                      <FormField form={form} name="location" label="Current Location (Enclosure)" className="font-bold uppercase tracking-widest" />
                      <FormField form={form} name="microchip_id" label="Microchip ID" className="font-mono text-sm" />
                      <FormField form={form} name="ring_number" label="Ring Number" className="font-mono text-sm" />
                      <div className="pt-6"><FormField form={form} name="has_no_id" label="No ID Elements (Too Small/Wild)" type="checkbox" className="text-emerald-500" /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 border-t border-slate-100 pt-6">
                      <div className="col-span-3"><h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Herd / Mob Management</h3></div>
                      <FormField form={form} name="entity_type" label="Entity Type" type="select" options={[{value:'INDIVIDUAL', label:'Individual Animal'}, {value:'MOB', label:'Mob/Herd (Parent)'}]} />
                      <form.Field name="entity_type">
                        {({ state }) => state.value === 'MOB' ? (
                          <FormField form={form} name="census_count" label="Census Count" type="number" />
                        ) : (
                          <FormField form={form} name="parent_mob_id" label="Parent Mob UUID (Optional)" placeholder="Paste Mob UUID..." className="font-mono text-xs" />
                        )}
                      </form.Field>
                  </div>
              </div>

              <div className={activeSection === 'env' ? 'space-y-6' : 'hidden'}>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                      <div className="col-span-3"><h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Weight Data</h3></div>
                      <FormField form={form} name="weight_unit" label="Unit" type="select" options={[{value:'g', label:'Grams (g)'}, {value:'kg', label:'Kilograms (kg)'}]} />
                      <FormField form={form} name="flying_weight_g" label="Target / Flying Weight" type="number" />
                      <FormField form={form} name="winter_weight_g" label="Winter Target Weight" type="number" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 border-t border-slate-100 pt-6">
                      <div className="col-span-full"><h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center justify-between">Climate Parameters <div className="mt-2"><FormField form={form} name="ambient_temp_only" label="Ambient Temp Only" type="checkbox" /></div></h3></div>
                      <FormField form={form} name="target_day_temp_c" label="Day Temp (°C)" type="number" />
                      <FormField form={form} name="target_night_temp_c" label="Night Temp (°C)" type="number" />
                      <FormField form={form} name="target_humidity_min_percent" label="Min Humidity (%)" type="number" />
                      <FormField form={form} name="target_humidity_max_percent" label="Max Humidity (%)" type="number" />
                      <FormField form={form} name="water_tipping_temp" label="Water Tipping (°C)" type="number" />
                      <div className="col-span-full"><FormField form={form} name="misting_frequency" label="Misting Frequency (Text)" placeholder="e.g. Twice Daily" /></div>
                  </div>
              </div>

              <div className={activeSection === 'health' ? 'space-y-6' : 'hidden'}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 bg-red-50 p-6 rounded-2xl border border-red-200">
                      <FormField form={form} name="hazard_rating" label="Hazard Rating" type="select" options={['LOW', 'MEDIUM', 'HIGH']} className="text-red-900 font-bold" />
                      <div className="pt-6"><FormField form={form} name="is_venomous" label="Venomous Species" type="checkbox" className="text-red-600" /></div>
                      <div className="col-span-full"><FormField form={form} name="critical_husbandry_notes" label="Critical Husbandry Notes (Bullet points via line-breaks)" type="textarea" placeholder="E.g. Requires daily misting\nAggressive during feeding" className="min-h-[100px] text-red-900" /></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <FormField form={form} name="red_list_status" label="IUCN Red List Status" type="select" options={[{value:'NE', label:'Not Evaluated'}, {value:'DD', label:'Data Deficient'}, {value:'LC', label:'Least Concern'}, {value:'NT', label:'Near Threatened'}, {value:'VU', label:'Vulnerable'}, {value:'EN', label:'Endangered'}, {value:'CR', label:'Critically Endangered'}, {value:'EW', label:'Extinct in Wild'}, {value:'EX', label:'Extinct'}]} />
                      <div className="col-span-full"><FormField form={form} name="special_requirements" label="Special Requirements (Dietary/Medical)" type="textarea" className="h-24" /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 border-t border-slate-100 pt-6">
                      <div className="col-span-full"><h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center justify-between">Genetics <div className="mt-2"><FormField form={form} name="lineage_unknown" label="Lineage Unknown" type="checkbox" /></div></h3></div>
                      <form.Field name="lineage_unknown">{({ state }) => (
                        <>
                          <FormField form={form} name="sire_id" label="Sire UUID" placeholder="UUID or empty" className={`font-mono text-xs ${state.value ? 'opacity-50' : ''}`} disabled={state.value} />
                          <FormField form={form} name="dam_id" label="Dam UUID" placeholder="UUID or empty" className={`font-mono text-xs ${state.value ? 'opacity-50' : ''}`} disabled={state.value} />
                        </>
                      )}</form.Field>
                  </div>
              </div>

              <div className={activeSection === 'admin' ? 'space-y-6' : 'hidden'}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 bg-amber-50 p-6 rounded-2xl border border-amber-200">
                      <FormField form={form} name="is_boarding" label="Animal is Boarding (External Owner)" type="checkbox" className="text-amber-600" />
                      <FormField form={form} name="is_quarantine" label="Active Quarantine Protocol" type="checkbox" className="text-purple-600" />
                  </div>
                  <div className="w-1/3"><FormField form={form} name="display_order" label="Dashboard Display Order (Sort Priority)" type="number" className="font-mono" /></div>
              </div>

            </div>
          )}

          <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
            <button onClick={onClose} className="px-6 py-3 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl font-bold uppercase text-xs tracking-widest transition-colors text-slate-600">Cancel</button>
            <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
              {([canSubmit, isSubmitting]) => (
                <button onClick={form.handleSubmit} disabled={!canSubmit || isSubmitting} className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase text-xs tracking-widest transition-colors flex items-center gap-2 disabled:opacity-50">
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Profile
                </button>
              )}
            </form.Subscribe>
          </div>
        </div>
      </div>
    </>
  );
}
