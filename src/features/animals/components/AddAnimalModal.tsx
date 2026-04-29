import React, { useState, useEffect, useRef } from 'react';
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
    <div id="image_cropper_overlay" className="fixed inset-0 bg-slate-900/95 z-[200] flex flex-col items-center justify-center p-4">
      <div className="text-white text-center mb-4"><h3 className="font-black uppercase tracking-widest text-lg">Crop Image</h3><p className="text-sm opacity-70">Drag to pan. Use slider to zoom.</p></div>
      <div 
        ref={containerRef}
        id="cropper_container"
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
        <button id="btn_cropper_cancel" onClick={onCancel} className="px-6 py-3 bg-slate-700 text-white font-bold uppercase text-xs tracking-widest rounded-xl hover:bg-slate-600">Cancel</button>
        <button id="btn_cropper_confirm" onClick={confirmCrop} className="px-8 py-3 bg-amber-500 text-amber-950 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-amber-400 flex items-center gap-2"><Check size={18}/> Confirm Crop</button>
      </div>
    </div>
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
  const [formData, setFormData] = useState<any>(DEFAULT_VALUES);
  const [isFetching, setIsFetching] = useState(false);
  const [activeSection, setActiveSection] = useState<'core' | 'id' | 'env' | 'health' | 'admin'>('core');
  
  const [cropFileSrc, setCropFileSrc] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<'image_url' | 'distribution_map_url' | null>(null);
  const [mapAspect, setMapAspect] = useState<number>(16/9);

  const currentUserId = useAuthStore(s => s.session?.user?.id);

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
            if (String(loadData.date_of_birth).startsWith('1900-01-01')) loadData.date_of_birth = '';
            else loadData.date_of_birth = new Date(loadData.date_of_birth).toISOString().split('T')[0];
            
            if (String(loadData.acquisition_date).startsWith('1900-01-01')) loadData.acquisition_date = '';
            else loadData.acquisition_date = new Date(loadData.acquisition_date).toISOString().split('T')[0];
            
            ['parent_mob_id', 'sire_id', 'dam_id'].forEach(k => {
               if (loadData[k as keyof typeof DEFAULT_VALUES] === '00000000-0000-0000-0000-000000000000') loadData[k as keyof typeof DEFAULT_VALUES] = '' as never;
            });

            ['flying_weight_g', 'winter_weight_g', 'average_target_weight', 'target_day_temp_c', 'target_night_temp_c', 'water_tipping_temp', 'target_humidity_min_percent', 'target_humidity_max_percent'].forEach(k => {
               if (loadData[k as keyof typeof DEFAULT_VALUES] === -1 || loadData[k as keyof typeof DEFAULT_VALUES] === '-1') loadData[k as keyof typeof DEFAULT_VALUES] = '' as never;
            });

            ['name', 'species', 'latin_name', 'category', 'location', 'hazard_rating', 'gender', 'microchip_id', 'ring_number', 'red_list_status', 'acquisition_type', 'origin', 'origin_location'].forEach(k => {
               if (loadData[k as keyof typeof DEFAULT_VALUES] === 'unknown') loadData[k as keyof typeof DEFAULT_VALUES] = '' as never;
            });

            if (loadData.image_url === '-1') loadData.image_url = '';

            // Array interceptor
            ['description', 'special_requirements', 'critical_husbandry_notes'].forEach(k => {
                const val = loadData[k as keyof typeof DEFAULT_VALUES];
                if (Array.isArray(val)) {
                    if (val.length === 1 && val[0] === 'none') loadData[k as keyof typeof DEFAULT_VALUES] = '';
                    else loadData[k as keyof typeof DEFAULT_VALUES] = val.join('\n') as never;
                }
            });

            setFormData(loadData);
        }
        setIsFetching(false);
      });
    } else if (isOpen) {
        setFormData(DEFAULT_VALUES);
    }
  }, [existingAnimalId, isOpen]);

  const handleInput = (field: string, value: any) => {
      setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = { ...formData };
      const ZERO_UUID = '00000000-0000-0000-0000-000000000000';
      
      // STRICT SCHEMA ENFORCEMENT
      ['parent_mob_id', 'sire_id', 'dam_id'].forEach(k => {
        if (!payload[k] || String(payload[k]).trim() === '') payload[k] = ZERO_UUID;
      });

      ['flying_weight_g', 'winter_weight_g', 'average_target_weight', 'target_day_temp_c', 'target_night_temp_c', 'water_tipping_temp', 'target_humidity_min_percent', 'target_humidity_max_percent'].forEach(k => {
        if (payload[k] === '' || payload[k] === null || payload[k] === undefined) payload[k] = -1;
        else payload[k] = Number(payload[k]);
      });
      payload.census_count = Number(payload.census_count) || 1;
      payload.display_order = Number(payload.display_order) || 0;

      ['name', 'species', 'latin_name', 'category', 'location', 'hazard_rating', 'gender', 'microchip_id', 'ring_number', 'red_list_status', 'acquisition_type', 'origin', 'origin_location'].forEach(k => {
        if (!payload[k] || String(payload[k]).trim() === '') payload[k] = 'unknown';
      });
      
      if (!payload.image_url || payload.image_url === '') payload.image_url = '-1';
      if (!payload.distribution_map_url || payload.distribution_map_url === '') payload.distribution_map_url = null;
      if (!payload.misting_frequency || payload.misting_frequency.trim() === '') payload.misting_frequency = null;

      ['description', 'special_requirements', 'critical_husbandry_notes'].forEach(k => {
        if (!payload[k] || String(payload[k]).trim() === '') payload[k] = ['none'];
        else if (typeof payload[k] === 'string') payload[k] = payload[k].split(/\n|\\n/).map((s: string) => s.trim()).filter((s: string) => s !== '');
      });

      if (!payload.date_of_birth) payload.date_of_birth = '1900-01-01';
      if (!payload.acquisition_date) payload.acquisition_date = '1900-01-01';

      const uId = currentUserId || null;

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
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      useSyncStore.getState().pushToCloud().catch(console.error);
      onClose();
    },
    onError: (err: any) => alert(`Save Failed: ${err.message}`)
  });

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
          onCrop={(b64) => { handleInput(cropTarget, b64); setCropFileSrc(null); setCropTarget(null); }}
          onCancel={() => { setCropFileSrc(null); setCropTarget(null); }}
        />
      )}

      <div id="add_animal_modal_overlay" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 sm:p-6">
        <div className="bg-white border border-slate-200 shadow-2xl rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
            <h2 id="modal_title" className="text-xl font-black tracking-tight text-slate-800 uppercase flex items-center gap-3">
              {existingAnimalId ? 'Edit Animal Profile' : 'Add New Animal'}
            </h2>
            <button id="btn_modal_close" onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"><X size={20} /></button>
          </div>
          
          <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto scrollbar-hide shrink-0">
             {[
               { id: 'core', label: 'Core Details' }, 
               { id: 'id', label: 'Media & ID' }, 
               { id: 'env', label: 'Environment' }, 
               { id: 'health', label: 'Health & Lineage' }, 
               { id: 'admin', label: 'Admin Status' }
             ].map(t => (
                <button key={t.id} id={`section_tab_${t.id}`} onClick={() => setActiveSection(t.id as any)} className={`px-6 py-4 text-xs font-black uppercase tracking-widest whitespace-nowrap border-b-2 transition-colors ${activeSection === t.id ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-700'}`}>
                  {t.label}
                </button>
             ))}
          </div>

          {isFetching ? (
            <div className="p-12 flex justify-center items-center flex-1"><Loader2 size={32} className="animate-spin text-emerald-500" /></div>
          ) : (
            <div id="modal_form_container" className="p-6 overflow-y-auto flex-1 bg-white custom-scrollbar">
              
              <div className={activeSection === 'core' ? 'space-y-6' : 'hidden'}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      <div className="lg:col-span-3"><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Animal Name / Mob Name *</label><input type="text" value={formData.name || ''} onChange={e => handleInput('name', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold bg-slate-50 text-slate-800 focus:outline-none focus:border-emerald-500" /></div>
                      <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Common Species</label><input type="text" value={formData.species || ''} onChange={e => handleInput('species', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-emerald-500" /></div>
                      <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Latin Name</label><input type="text" value={formData.latin_name || ''} onChange={e => handleInput('latin_name', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium italic text-slate-600 focus:outline-none focus:border-emerald-500" /></div>
                      <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Taxonomy Category</label>
                          <select value={formData.category || 'Mammal'} onChange={e => handleInput('category', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-emerald-500"><option>Mammal</option><option>Bird</option><option>Reptile</option><option>Amphibian</option><option>Invertebrate</option><option>Fish</option><option>Raptor</option><option>Owl</option><option>Exotic</option><option>Other</option></select>
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Gender</label>
                          <select value={formData.gender || 'Unknown'} onChange={e => handleInput('gender', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-emerald-500"><option>Unknown</option><option>Male</option><option>Female</option></select>
                      </div>
                      <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Date of Birth</label><input type="date" value={formData.date_of_birth || ''} onChange={e => handleInput('date_of_birth', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-emerald-500" /></div>
                      <div className="flex items-center gap-3 pt-6"><input type="checkbox" checked={formData.is_dob_unknown} onChange={e => handleInput('is_dob_unknown', e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500" /><label className="text-xs font-bold text-slate-700 uppercase tracking-widest">DOB is an Estimate</label></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                      <div className="col-span-1 md:col-span-2"><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">General Description</label><textarea value={formData.description || ''} onChange={e => handleInput('description', e.target.value)} className="w-full h-24 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-emerald-500" /></div>
                      <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Origin Entity (e.g., Zoo Name)</label><input type="text" value={formData.origin || ''} onChange={e => handleInput('origin', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-emerald-500" /></div>
                      <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Origin Location (City/Country)</label><input type="text" value={formData.origin_location || ''} onChange={e => handleInput('origin_location', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-emerald-500" /></div>
                      <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Acquisition Date</label><input type="date" value={formData.acquisition_date || ''} onChange={e => handleInput('acquisition_date', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-emerald-500" /></div>
                      <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Acquisition Type</label>
                          <select value={formData.acquisition_type || 'unknown'} onChange={e => handleInput('acquisition_type', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-emerald-500"><option value="DONATION">Donation</option><option value="PURCHASE">Purchase</option><option value="BREEDING">Internal Breeding</option><option value="RESCUE">Rescue/Confiscation</option><option value="LOAN">Loan</option><option value="unknown">Unknown</option></select>
                      </div>
                  </div>
              </div>

              <div className={activeSection === 'id' ? 'space-y-6' : 'hidden'}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                      <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Profile Photo (4:3 Crop)</label>
                          <label className="flex flex-col items-center justify-center h-32 w-full bg-white border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-emerald-400 transition-colors relative overflow-hidden group">
                              {formData.image_url && formData.image_url !== '-1' ? (
                                <img src={formData.image_url} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-20 transition-opacity" />
                              ) : <ImageIcon size={24} className="text-slate-400 mb-2"/>}
                              <span className="text-xs font-bold text-slate-800 z-10 bg-white/80 px-3 py-1 rounded-full backdrop-blur-sm shadow-sm">{formData.image_url && formData.image_url !== '-1' ? 'Replace Photo' : 'Select Photo'}</span>
                              <input type="file" accept="image/*" className="hidden" onChange={e => triggerUpload(e, 'image_url')} />
                          </label>
                      </div>
                      <div>
                          <label className="flex items-center justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                             <span>Distribution Map</span>
                             <select value={mapAspect} onChange={e => setMapAspect(Number(e.target.value))} className="bg-transparent text-emerald-600 focus:outline-none"><option value={16/9}>16:9 Horizontal</option><option value={9/16}>9:16 Vertical</option><option value={1}>1:1 Square</option></select>
                          </label>
                          <label className="flex flex-col items-center justify-center h-32 w-full bg-white border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-emerald-400 transition-colors relative overflow-hidden group">
                              {formData.distribution_map_url && formData.distribution_map_url !== '-1' ? (
                                <img src={formData.distribution_map_url} alt="Preview" className="absolute inset-0 w-full h-full object-contain opacity-50 group-hover:opacity-20 transition-opacity" />
                              ) : <MapIcon size={24} className="text-slate-400 mb-2"/>}
                              <span className="text-xs font-bold text-slate-800 z-10 bg-white/80 px-3 py-1 rounded-full backdrop-blur-sm shadow-sm">{formData.distribution_map_url && formData.distribution_map_url !== '-1' ? 'Replace Map' : 'Select Map'}</span>
                              <input type="file" accept="image/*" className="hidden" onChange={e => triggerUpload(e, 'distribution_map_url')} />
                          </label>
                      </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                      <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Current Location (Enclosure)</label><input type="text" value={formData.location || ''} onChange={e => handleInput('location', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold uppercase tracking-widest focus:outline-none focus:border-emerald-500" /></div>
                      <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Microchip ID</label><input type="text" value={formData.microchip_id || ''} onChange={e => handleInput('microchip_id', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:border-emerald-500" /></div>
                      <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Ring Number</label><input type="text" value={formData.ring_number || ''} onChange={e => handleInput('ring_number', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:border-emerald-500" /></div>
                      <div className="flex items-center gap-3 pt-6"><input type="checkbox" checked={formData.has_no_id} onChange={e => handleInput('has_no_id', e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500" /><label className="text-xs font-bold text-slate-700 uppercase tracking-widest">No ID Elements (Too Small/Wild)</label></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 border-t border-slate-100 pt-6">
                      <div className="col-span-3"><h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Herd / Mob Management</h3></div>
                      <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Entity Type</label><select value={formData.entity_type || 'INDIVIDUAL'} onChange={e => handleInput('entity_type', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-emerald-500"><option value="INDIVIDUAL">Individual Animal</option><option value="MOB">Mob/Herd (Parent)</option></select></div>
                      {formData.entity_type === 'MOB' ? (
                          <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Census Count</label><input type="number" value={formData.census_count || ''} onChange={e => handleInput('census_count', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-emerald-500" /></div>
                      ) : (
                          <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Parent Mob UUID (Optional)</label><input type="text" placeholder="Paste Mob UUID..." value={formData.parent_mob_id || ''} onChange={e => handleInput('parent_mob_id', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-500" /></div>
                      )}
                  </div>
              </div>

              <div className={activeSection === 'env' ? 'space-y-6' : 'hidden'}>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                      <div className="col-span-3"><h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Weight Data</h3></div>
                      <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Unit</label>
                          <select value={formData.weight_unit || 'g'} onChange={e => handleInput('weight_unit', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-emerald-500">
                             <option value="g">Grams (g)</option><option value="kg">Kilograms (kg)</option><option value="lb">Pounds (lb)</option><option value="oz">Ounces (oz)</option>
                          </select>
                      </div>
                      <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Target / Flying Weight</label><input type="number" value={formData.flying_weight_g || ''} onChange={e => handleInput('flying_weight_g', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-emerald-500" /></div>
                      <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Winter Target Weight</label><input type="number" value={formData.winter_weight_g || ''} onChange={e => handleInput('winter_weight_g', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-emerald-500" /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 border-t border-slate-100 pt-6">
                      <div className="col-span-full"><h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center justify-between">Climate Parameters <div className="flex items-center gap-2"><input type="checkbox" checked={formData.ambient_temp_only} onChange={e => handleInput('ambient_temp_only', e.target.checked)} className="w-4 h-4 rounded focus:ring-emerald-500" /><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ambient Temp Only</span></div></h3></div>
                      <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Day Temp (°C)</label><input type="number" value={formData.target_day_temp_c || ''} onChange={e => handleInput('target_day_temp_c', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-emerald-500" /></div>
                      <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Night Temp (°C)</label><input type="number" value={formData.target_night_temp_c || ''} onChange={e => handleInput('target_night_temp_c', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-emerald-500" /></div>
                      <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Min Humidity (%)</label><input type="number" value={formData.target_humidity_min_percent || ''} onChange={e => handleInput('target_humidity_min_percent', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-emerald-500" /></div>
                      <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Max Humidity (%)</label><input type="number" value={formData.target_humidity_max_percent || ''} onChange={e => handleInput('target_humidity_max_percent', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-emerald-500" /></div>
                      <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Water Tipping (°C)</label><input type="number" value={formData.water_tipping_temp || ''} onChange={e => handleInput('water_tipping_temp', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-emerald-500" /></div>
                      <div className="col-span-full"><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Misting Frequency (Text)</label><input type="text" placeholder="e.g. Twice Daily" value={formData.misting_frequency || ''} onChange={e => handleInput('misting_frequency', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-emerald-500" /></div>
                  </div>
              </div>

              <div className={activeSection === 'health' ? 'space-y-6' : 'hidden'}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 bg-red-50 p-6 rounded-2xl border border-red-200">
                      <div><label className="block text-[10px] font-black text-red-700 uppercase tracking-widest mb-1">Hazard Rating</label><select value={formData.hazard_rating || 'LOW'} onChange={e => handleInput('hazard_rating', e.target.value)} className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm font-bold text-red-900 focus:outline-none focus:border-red-500"><option>LOW</option><option>MEDIUM</option><option>HIGH</option></select></div>
                      <div className="flex items-center gap-3 pt-6"><input type="checkbox" checked={formData.is_venomous} onChange={e => handleInput('is_venomous', e.target.checked)} className="w-5 h-5 rounded border-red-300 text-red-600 focus:ring-red-500" /><label className="text-xs font-bold text-red-800 uppercase tracking-widest">Venomous Species</label></div>
                      <div className="col-span-full"><label className="block text-[10px] font-black text-red-700 uppercase tracking-widest mb-1">Critical Husbandry Notes (Bullet points via line-breaks)</label><textarea placeholder="E.g. Requires daily misting\nAggressive during feeding" value={formData.critical_husbandry_notes || ''} onChange={e => handleInput('critical_husbandry_notes', e.target.value)} className="w-full min-h-[100px] px-3 py-2 border border-red-200 rounded-lg text-sm font-medium text-red-900 focus:outline-none focus:border-red-500" /></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">IUCN Red List Status</label><select value={formData.red_list_status || 'NE'} onChange={e => handleInput('red_list_status', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-emerald-500"><option value="NE">Not Evaluated</option><option value="DD">Data Deficient</option><option value="LC">Least Concern</option><option value="NT">Near Threatened</option><option value="VU">Vulnerable</option><option value="EN">Endangered</option><option value="CR">Critically Endangered</option><option value="EW">Extinct in Wild</option><option value="EX">Extinct</option></select></div>
                      <div className="col-span-full"><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Special Requirements (Dietary/Medical)</label><textarea value={formData.special_requirements || ''} onChange={e => handleInput('special_requirements', e.target.value)} className="w-full h-24 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-emerald-500" /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 border-t border-slate-100 pt-6">
                      <div className="col-span-full"><h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center justify-between">Genetics <div className="flex items-center gap-2"><input type="checkbox" checked={formData.lineage_unknown} onChange={e => handleInput('lineage_unknown', e.target.checked)} className="w-4 h-4 rounded focus:ring-emerald-500" /><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Lineage Unknown</span></div></h3></div>
                      <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Sire UUID</label><input type="text" placeholder="UUID or empty" value={formData.sire_id || ''} onChange={e => handleInput('sire_id', e.target.value)} className={`w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-500 ${formData.lineage_unknown ? 'opacity-50' : ''}`} disabled={formData.lineage_unknown} /></div>
                      <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Dam UUID</label><input type="text" placeholder="UUID or empty" value={formData.dam_id || ''} onChange={e => handleInput('dam_id', e.target.value)} className={`w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-500 ${formData.lineage_unknown ? 'opacity-50' : ''}`} disabled={formData.lineage_unknown} /></div>
                  </div>
              </div>

              <div className={activeSection === 'admin' ? 'space-y-6' : 'hidden'}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 bg-amber-50 p-6 rounded-2xl border border-amber-200">
                      <div className="flex items-center gap-3"><input type="checkbox" checked={formData.is_boarding} onChange={e => handleInput('is_boarding', e.target.checked)} className="w-5 h-5 rounded border-amber-400 text-amber-600 focus:ring-amber-500" /><label className="text-xs font-bold text-amber-900 uppercase tracking-widest">Animal is Boarding (External Owner)</label></div>
                      <div className="flex items-center gap-3"><input type="checkbox" checked={formData.is_quarantine} onChange={e => handleInput('is_quarantine', e.target.checked)} className="w-5 h-5 rounded border-purple-400 text-purple-600 focus:ring-purple-500" /><label className="text-xs font-bold text-purple-900 uppercase tracking-widest">Active Quarantine Protocol</label></div>
                  </div>
                  <div className="w-1/3"><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Dashboard Display Order (Sort Priority)</label><input type="number" value={formData.display_order || ''} onChange={e => handleInput('display_order', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-emerald-500" /></div>
              </div>

            </div>
          )}

          <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
            <button id="btn_modal_cancel" onClick={onClose} className="px-6 py-3 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl font-bold uppercase text-xs tracking-widest transition-colors text-slate-600">Cancel</button>
            <button id="btn_modal_save" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !formData.name} className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase text-xs tracking-widest transition-colors flex items-center gap-2 disabled:opacity-50">
              {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Profile
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
