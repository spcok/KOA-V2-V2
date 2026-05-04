import React, { useState, useRef } from 'react';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { db } from '../../../lib/db';
import { queryClient } from '../../../lib/queryClient';
import { useAuthStore } from '../../../store/authStore';
import { X, Save, Loader2, Image as ImageIcon, Map as MapIcon, Check, ZoomIn } from 'lucide-react';
import toast from 'react-hot-toast';

const ZERO_UUID = '00000000-0000-0000-0000-000000000000';

// --- RESTORED ORIGINAL SCHEMA ---
const animalSchema = z.object({
  entity_type: z.enum(['INDIVIDUAL', 'MOB']).default('INDIVIDUAL'),
  parent_mob_id: z.string().transform(val => val.trim() === '' ? ZERO_UUID : val),
  census_count: z.preprocess(val => Number(val) || 1, z.number().min(1)),
  name: z.string().min(1, "Name is required").transform(val => val.trim() === '' ? 'unknown' : val),
  species: z.string().transform(val => val.trim() === '' ? 'unknown' : val),
  latin_name: z.string().transform(val => val.trim() === '' ? 'unknown' : val),
  category: z.string().transform(val => val.trim() === '' ? 'unknown' : val),
  location: z.string().transform(val => val.trim() === '' ? 'unknown' : val),
  image_url: z.string().transform(val => val.trim() === '' ? '-1' : val),
  distribution_map_url: z.string().nullable().transform(val => val === '' ? null : val),
  hazard_rating: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('LOW'),
  is_venomous: z.boolean().default(false),
  weight_unit: z.enum(['g', 'kg', 'lb', 'oz']).default('g'), // Updated to include lb and oz
  flying_weight_g: z.preprocess(val => val === '' || val === null ? -1 : Number(val), z.number()),
  winter_weight_g: z.preprocess(val => val === '' || val === null ? -1 : Number(val), z.number()),
  average_target_weight: z.preprocess(val => val === '' || val === null ? -1 : Number(val), z.number()),
  date_of_birth: z.string().transform(val => val === '' ? '1900-01-01' : val),
  is_dob_unknown: z.boolean().default(false),
  gender: z.string().transform(val => val.trim() === '' ? 'unknown' : val),
  microchip_id: z.string().transform(val => val.trim() === '' ? 'unknown' : val),
  ring_number: z.string().transform(val => val.trim() === '' ? 'unknown' : val),
  has_no_id: z.boolean().default(false),
  red_list_status: z.string().default('NE'),
  description: z.string().transform(val => val.trim() === '' ? ['none'] : val.split(/\n|\\n/).map(s => s.trim()).filter(Boolean)),
  special_requirements: z.string().transform(val => val.trim() === '' ? ['none'] : val.split(/\n|\\n/).map(s => s.trim()).filter(Boolean)),
  critical_husbandry_notes: z.string().transform(val => val.trim() === '' ? ['none'] : val.split(/\n|\\n/).map(s => s.trim()).filter(Boolean)),
  ambient_temp_only: z.boolean().default(false),
  target_day_temp_c: z.preprocess(val => val === '' || val === null ? -1 : Number(val), z.number()),
  target_night_temp_c: z.preprocess(val => val === '' || val === null ? -1 : Number(val), z.number()),
  water_tipping_temp: z.preprocess(val => val === '' || val === null ? -1 : Number(val), z.number()),
  target_humidity_min_percent: z.preprocess(val => val === '' || val === null ? -1 : Number(val), z.number()),
  target_humidity_max_percent: z.preprocess(val => val === '' || val === null ? -1 : Number(val), z.number()),
  misting_frequency: z.string().nullable().transform(val => val === '' ? null : val),
  acquisition_date: z.string().transform(val => val === '' ? '1900-01-01' : val),
  acquisition_type: z.string().transform(val => val.trim() === '' ? 'unknown' : val),
  origin: z.string().transform(val => val.trim() === '' ? 'unknown' : val),
  origin_location: z.string().transform(val => val.trim() === '' ? 'unknown' : val),
  lineage_unknown: z.boolean().default(false),
  sire_id: z.string().transform(val => val.trim() === '' ? ZERO_UUID : val),
  dam_id: z.string().transform(val => val.trim() === '' ? ZERO_UUID : val),
  is_boarding: z.boolean().default(false),
  is_quarantine: z.boolean().default(false),
  display_order: z.preprocess(val => Number(val) || 0, z.number())
});

const DEFAULT_VALUES = {
  entity_type: 'INDIVIDUAL', parent_mob_id: '', census_count: 1, name: '', species: '', latin_name: '', category: 'Mammal', location: '',
  image_url: '', distribution_map_url: '', hazard_rating: 'LOW', is_venomous: false, weight_unit: 'g', flying_weight_g: '', winter_weight_g: '', average_target_weight: '',
  date_of_birth: '', is_dob_unknown: false, gender: 'Unknown', microchip_id: '', ring_number: '', has_no_id: false, red_list_status: 'NE',
  description: '', special_requirements: '', critical_husbandry_notes: '', ambient_temp_only: false, target_day_temp_c: '', target_night_temp_c: '', water_tipping_temp: '', target_humidity_min_percent: '', target_humidity_max_percent: '', misting_frequency: '',
  acquisition_date: '', acquisition_type: 'unknown', origin: '', origin_location: '', lineage_unknown: false, sire_id: '', dam_id: '',
  is_boarding: false, is_quarantine: false, display_order: 0
};

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
    const targetWidth = Math.min(MAX_WIDTH, imgRef.current.naturalWidth);
    const targetHeight = targetWidth / aspect;

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const scale = imgRef.current.naturalWidth / (containerRef.current.clientWidth * zoom);
    const sourceX = Math.max(0, (containerRef.current.clientWidth / 2 - offset.x) * scale - (targetWidth / 2));
    const sourceY = Math.max(0, (containerRef.current.clientHeight / 2 - offset.y) * scale - (targetHeight / 2));

    ctx.drawImage(imgRef.current, sourceX, sourceY, targetWidth, targetHeight, 0, 0, targetWidth, targetHeight);
    onCrop(canvas.toDataURL('image/jpeg', 0.8));
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 flex flex-col items-center justify-center p-4">
        <div className="bg-slate-900 rounded-3xl overflow-hidden w-full max-w-2xl border border-slate-800 shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                <h3 className="text-white font-black uppercase text-sm flex items-center gap-2"><ZoomIn size={16} className="text-indigo-400"/> Adjust Image Focus</h3>
                <button onClick={onCancel} className="text-slate-400 hover:text-white"><X size={20}/></button>
            </div>
            
            <div 
                ref={containerRef}
                className="relative w-full h-[400px] overflow-hidden bg-black touch-none cursor-move"
                onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
                onTouchStart={handleMouseDown} onTouchMove={handleMouseMove} onTouchEnd={handleMouseUp}
            >
                <img ref={imgRef} src={src} className="absolute max-w-none opacity-50 pointer-events-none" style={{ transform: `translate(-50%, -50%) scale(${zoom}) translate(${offset.x}px, ${offset.y}px)`, left: '50%', top: '50%', minWidth: '100%', minHeight: '100%', objectFit: 'cover' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ width: '80%', aspectRatio: aspect, boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75)', border: '2px solid white' }}>
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3"><div className="border-r border-b border-white/30"></div><div className="border-r border-b border-white/30"></div><div className="border-b border-white/30"></div><div className="border-r border-b border-white/30"></div><div className="border-r border-b border-white/30"></div><div className="border-b border-white/30"></div><div className="border-r border-white/30"></div><div className="border-r border-white/30"></div><div></div></div>
                </div>
            </div>

            <div className="p-6 bg-slate-950 flex flex-col sm:flex-row items-center gap-4 justify-between">
                <div className="flex items-center gap-3 w-full sm:w-1/2">
                    <span className="text-xs font-bold text-slate-400">ZOOM</span>
                    <input type="range" min="1" max="3" step="0.1" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full accent-indigo-500" />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={onCancel} className="flex-1 sm:flex-none px-6 py-2 border border-slate-700 text-slate-300 rounded-xl font-bold text-xs uppercase hover:bg-slate-800">Cancel</button>
                    <button onClick={confirmCrop} className="flex-1 sm:flex-none px-6 py-2 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 hover:bg-indigo-500"><Check size={16}/> Apply Crop</button>
                </div>
            </div>
        </div>
    </div>
  );
}

function FormField({ form, name, label, type = "text", placeholder, className = "", required = false }: { form: any, name: string, label: string, type?: string, placeholder?: string, className?: string, required?: boolean }) {
  return (
    <form.Field name={name}>
      {(field: any) => (
        <div className="mb-4">
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">{label} {required && <span className="text-rose-500">*</span>}</label>
          {type === 'textarea' ? (
              <textarea value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} placeholder={placeholder} className={`w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-bold text-slate-700 h-24 ${className}`} />
          ) : type === 'checkbox' ? (
              <input type="checkbox" checked={field.state.value} onChange={(e) => field.handleChange(e.target.checked)} className={`w-5 h-5 rounded border-slate-300 ${className}`} />
          ) : (
              <input type={type} value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} placeholder={placeholder} className={`w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-bold text-slate-700 ${className}`} />
          )}
          {field.state.meta.errors ? <p className="text-[10px] font-bold text-rose-500 uppercase mt-1">{field.state.meta.errors.join(', ')}</p> : null}
        </div>
      )}
    </form.Field>
  );
}

function FormSelect({ form, name, label, options, required = false }: { form: any, name: string, label: string, options: {value: string, label: string}[], required?: boolean }) {
    return (
        <form.Field name={name}>
            {(field: any) => (
                <div className="mb-4">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">{label} {required && <span className="text-rose-500">*</span>}</label>
                    <select value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-bold text-slate-700 appearance-none">
                        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {field.state.meta.errors ? <p className="text-[10px] font-bold text-rose-500 uppercase mt-1">{field.state.meta.errors.join(', ')}</p> : null}
                </div>
            )}
        </form.Field>
    )
}

export function AddAnimalModal({ isOpen, onClose, existingAnimalId }: { isOpen: boolean, onClose: () => void, existingAnimalId?: string }) {
  const [activeSection, setActiveSection] = useState<'core' | 'id' | 'env' | 'health' | 'admin'>('core');
  const [cropFileSrc, setCropFileSrc] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<'image_url' | 'distribution_map_url' | null>(null);
  const [mapAspect, setMapAspect] = useState<number>(16/9);

  const currentUserId = useAuthStore(s => s.session?.user?.id);

  // --- THE HYDRATION GUARD ---
  const { data: initialData, isLoading: isHydrating } = useQuery({
    queryKey: ['animal_edit_hydrate', existingAnimalId],
    queryFn: async () => {
        if (!existingAnimalId) return DEFAULT_VALUES;

        const res = await db.query("SELECT * FROM animals WHERE id = $1", [existingAnimalId]);
        const r = res.rows[0];
        if (!r) throw new Error("Animal not found");

        const loadData = { ...DEFAULT_VALUES };
        
        Object.keys(DEFAULT_VALUES).forEach(k => {
            if (r[k] !== undefined && r[k] !== null) loadData[k as keyof typeof DEFAULT_VALUES] = r[k];
        });
        
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
        if (loadData.distribution_map_url === '-1') loadData.distribution_map_url = '';

        ['description', 'special_requirements', 'critical_husbandry_notes'].forEach(k => {
            const val = loadData[k as keyof typeof DEFAULT_VALUES];
            if (Array.isArray(val)) {
                if (val.length === 1 && val[0] === 'none') loadData[k as keyof typeof DEFAULT_VALUES] = '';
                else loadData[k as keyof typeof DEFAULT_VALUES] = val.join('\n') as never;
            }
        });

        return loadData;
    },
    enabled: isOpen
  });

  const form = useForm({
    defaultValues: initialData || DEFAULT_VALUES,
    validatorAdapter: zodValidator(),
    onSubmit: async ({ value }) => {
      const payload: any = animalSchema.parse(value);
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
        
        queryClient.invalidateQueries({ queryKey: ['animal'] });
        queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
        toast.success('Animal profile saved!');
        onClose();
      } catch (err: any) {
        console.error("Submission Error", err);
        toast.error(`Database Error: ${err.message}`);
      }
    }
  });

  const triggerUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'image_url' | 'distribution_map_url') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
          setCropFileSrc(ev.target?.result as string);
          setCropTarget(field);
          setMapAspect(field === 'distribution_map_url' ? 4/3 : 16/9);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (base64Image: string) => {
      if (cropTarget) form.setFieldValue(cropTarget, base64Image);
      setCropFileSrc(null);
      setCropTarget(null);
  };

  if (!isOpen) return null;
  if (isHydrating) return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-[100]">
          <Loader2 className="animate-spin text-white" size={48}/>
      </div>
  );

  return (
    <>
      {cropFileSrc && cropTarget && (
          <ImageCropper src={cropFileSrc} aspect={mapAspect} onCrop={handleCropComplete} onCancel={() => { setCropFileSrc(null); setCropTarget(null); }} />
      )}

      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-start pt-10 px-4 z-50 overflow-y-auto overflow-x-hidden">
        <div className="bg-slate-50 rounded-3xl w-full max-w-4xl flex flex-col shadow-2xl mb-10 overflow-hidden border border-slate-200/60">
          
          <div className="flex justify-between items-center p-6 border-b border-slate-200 bg-white shrink-0">
            <h2 className="text-xl font-black uppercase tracking-tight text-indigo-950 flex items-center gap-3">
              <span className="bg-indigo-100 text-indigo-700 p-2 rounded-xl"><ImageIcon size={20} /></span>
              {existingAnimalId ? 'Edit Animal Profile' : 'Enroll New Animal'}
            </h2>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"><X size={24} /></button>
          </div>

          <div className="bg-white px-6 py-4 flex gap-4 overflow-x-auto border-b border-slate-200 shrink-0 hide-scrollbar">
              {[
                  { id: 'core', label: 'Core Identity' },
                  { id: 'id', label: 'ID & Taxonomy' },
                  { id: 'env', label: 'Husbandry & Temp' },
                  { id: 'health', label: 'Health & Weights' },
                  { id: 'admin', label: 'Administration' }
              ].map(sec => (
                  <button key={sec.id} onClick={() => setActiveSection(sec.id as any)} className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeSection === sec.id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'}`}>
                      {sec.label}
                  </button>
              ))}
          </div>

          {activeSection === 'core' && (
            <div className="p-8 space-y-6 flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="col-span-2 md:col-span-1"><FormSelect form={form} name="entity_type" label="Entity Type" required options={[{value: 'INDIVIDUAL', label: 'Individual'}, {value: 'MOB', label: 'Mob / Colony'}]} /></div>
                  <div className="col-span-2 md:col-span-1"><FormField form={form} name="census_count" label="Count (If Mob)" type="number" /></div>
                  <div className="col-span-2 md:col-span-2"><FormField form={form} name="name" label="Animal / Mob Name" required placeholder="e.g. Leo, Meerkats Pen A" /></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField form={form} name="species" label="Common Species Name" required placeholder="e.g. African Lion" />
                <FormSelect form={form} name="category" label="Taxonomic Category" required options={['Mammal', 'Bird', 'Reptile', 'Amphibian', 'Fish', 'Invertebrate'].map(c => ({value: c, label: c}))} />
              </div>

              <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><ImageIcon size={14}/> Profile Image Banner (16:9)</label>
                  <form.Field name="image_url">
                      {(field: any) => (
                          <div className="space-y-4">
                              {field.state.value && field.state.value !== '-1' && (
                                  <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-200"><img src={field.state.value} className="w-full h-full object-cover" /></div>
                              )}
                              <input type="file" accept="image/*" onChange={(e) => triggerUpload(e, 'image_url')} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:uppercase file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" />
                          </div>
                      )}
                  </form.Field>
              </div>
            </div>
          )}

          {activeSection === 'id' && (
            <div className="p-8 space-y-6 flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField form={form} name="latin_name" label="Latin / Scientific Name" className="italic" />
                    <FormSelect form={form} name="gender" label="Gender" options={[{value: 'Male', label: 'Male'}, {value: 'Female', label: 'Female'}, {value: 'Unknown', label: 'Unknown/Unsexed'}, {value: 'unknown', label: 'Unknown/Unsexed'}]} />
                    <FormField form={form} name="microchip_id" label="Microchip / Transponder ID" className="font-mono" />
                    <FormField form={form} name="ring_number" label="Ring / Band Number" className="font-mono" />
                </div>
                <div className="flex gap-4">
                    <FormField form={form} name="has_no_id" label="No ID Present" type="checkbox" />
                    <FormField form={form} name="is_dob_unknown" label="DOB is Estimated" type="checkbox" />
                </div>
                <div className="w-1/2"><FormField form={form} name="date_of_birth" label="Date of Birth / Hatch" type="date" /></div>
            </div>
          )}

          {activeSection === 'env' && (
            <div className="p-8 space-y-6 flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField form={form} name="location" label="Enclosure / Location Name" required />
                    <FormSelect form={form} name="hazard_rating" label="Risk / Hazard Rating" required options={['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(c => ({value: c, label: c}))} />
                </div>
                <FormField form={form} name="is_venomous" label="Venomous / Toxic" type="checkbox" className="text-rose-600" />
                
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b pb-2 mt-6">Target Parameters</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <FormField form={form} name="target_day_temp_c" label="Day Temp (°C)" type="number" />
                    <FormField form={form} name="target_night_temp_c" label="Night Temp (°C)" type="number" />
                    <FormField form={form} name="target_humidity_min_percent" label="Min Humidity (%)" type="number" />
                    <FormField form={form} name="target_humidity_max_percent" label="Max Humidity (%)" type="number" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField form={form} name="water_tipping_temp" label="Water Tipping Alert Temp (°C)" type="number" />
                    <FormField form={form} name="misting_frequency" label="Misting Frequency" placeholder="e.g. Twice Daily" />
                </div>
                
                <FormField form={form} name="critical_husbandry_notes" label="Critical Husbandry Notes (Printed on Enclosure Sign)" type="textarea" className="border-rose-200 bg-rose-50" />
                <FormField form={form} name="description" label="General Description / Identifying Marks" type="textarea" />
            </div>
          )}

          {activeSection === 'health' && (
             <div className="p-8 space-y-6 flex-1 overflow-y-auto">
                 <div className="grid grid-cols-3 gap-6">
                     <FormSelect form={form} name="weight_unit" label="Weight Tracking Unit" required options={[{value: 'g', label: 'Grams (g)'}, {value: 'kg', label: 'Kilograms (kg)'}, {value: 'lb', label: 'Pounds (lb)'}, {value: 'oz', label: 'Ounces (oz)'}]} />
                     <FormField form={form} name="average_target_weight" label="Target Average Weight" type="number" />
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                    <FormField form={form} name="flying_weight_g" label="Flying Weight (Birds Only)" type="number" />
                    <FormField form={form} name="winter_weight_g" label="Target Winter Weight" type="number" />
                 </div>
                 <FormField form={form} name="special_requirements" label="Dietary / Medical Requirements" type="textarea" />
             </div>
          )}

          {activeSection === 'admin' && (
            <div className="p-8 space-y-6 flex-1 overflow-y-auto">
                <FormSelect form={form} name="red_list_status" label="IUCN Red List Status" required options={[{value: 'NE', label: 'Not Evaluated'}, {value: 'DD', label: 'Data Deficient'}, {value: 'LC', label: 'Least Concern'}, {value: 'NT', label: 'Near Threatened'}, {value: 'VU', label: 'Vulnerable'}, {value: 'EN', label: 'Endangered'}, {value: 'CR', label: 'Critically Endangered'}, {value: 'EW', label: 'Extinct in the Wild'}, {value: 'EX', label: 'Extinct'}]} />
                
                <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><MapIcon size={14}/> Distribution Map (4:3)</label>
                  <form.Field name="distribution_map_url">
                      {(field: any) => (
                          <div className="space-y-4">
                              {field.state.value && field.state.value !== '-1' && (
                                  <div className="relative w-1/2 aspect-4/3 rounded-xl overflow-hidden border border-slate-200"><img src={field.state.value} className="w-full h-full object-cover" /></div>
                              )}
                              <input type="file" accept="image/*" onChange={(e) => triggerUpload(e, 'distribution_map_url')} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:uppercase file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer" />
                          </div>
                      )}
                  </form.Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField form={form} name="acquisition_date" label="Arrival Date" type="date" />
                  <FormSelect form={form} name="acquisition_type" label="Acquisition Source" options={[{value: 'unknown', label: 'Unknown'}, {value: 'Bred on site', label: 'Bred on site'}, {value: 'Donation', label: 'Donation'}, {value: 'Purchase', label: 'Purchase'}, {value: 'Rescue/Confiscation', label: 'Rescue / Confiscation'}]} />
              </div>

              <div className="flex gap-6 items-center">
                  <div className="flex-1 space-y-4 border-r pr-6">
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
