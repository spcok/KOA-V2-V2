import React, { useEffect } from 'react';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { X } from 'lucide-react';
import { db } from '../../../lib/db';

const formSchema = z.object({
  // Core ID
  name: z.string().min(1, 'Name is required'),
  species: z.string().min(1, 'Species is required'),
  latin_name: z.string().optional().transform(val => val || 'unknown'),
  category: z.string().optional().transform(val => val || 'unknown'),
  gender: z.string().optional().transform(val => val || 'unknown'),
  location: z.string().optional().transform(val => val || 'unknown'),

  // Identification
  microchip_id: z.string().optional(),
  ring_number: z.string().optional(),
  has_no_id: z.boolean().default(false),

  // Status & Media
  date_of_birth: z.string().optional().transform(val => val || '1900-01-01'),
  is_dob_unknown: z.boolean().default(false),
  hazard_rating: z.string().optional().transform(val => val || 'unknown'),
  is_venomous: z.boolean().default(false),
  red_list_status: z.string().optional().transform(val => val || 'UNK'),
  image_url: z.any().optional(),
  distribution_map_url: z.any().optional(),

  // Acquisition & Origin
  acquisition_date: z.string().optional().transform(val => val || '1900-01-01'),
  acquisition_type: z.string().optional().transform(val => val || 'unknown'),
  origin: z.string().optional().transform(val => val || 'unknown'),
  origin_location: z.string().optional().transform(val => val || 'unknown'),
  lineage_unknown: z.boolean().default(false),
  sire_id: z.string().optional().transform(val => val || '00000000-0000-0000-0000-000000000000'),
  dam_id: z.string().optional().transform(val => val || '00000000-0000-0000-0000-000000000000'),

  // Physical Targets
  flying_weight_g: z.number().optional().transform(val => val ?? -1),
  winter_weight_g: z.number().optional().transform(val => val ?? -1),
  average_target_weight: z.number().optional().transform(val => val ?? -1),

  // Environmental Targets
  ambient_temp_only: z.boolean().default(false),
  target_day_temp_c: z.number().optional().transform(val => val ?? -1),
  target_night_temp_c: z.number().optional().transform(val => val ?? -1),
  water_tipping_temp_c: z.number().optional().transform(val => val ?? -1),
  target_humidity_min: z.number().optional().transform(val => val ?? -1),
  target_humidity_max: z.number().optional().transform(val => val ?? -1),
  misting_frequency: z.string().optional().transform(val => val || 'unknown'),

  // Notes (handled as multiline strings in UI, split on submit)
  description: z.string().optional().transform(val => val || 'none'),
  special_requirements: z.string().optional().transform(val => val || 'none'),
  critical_husbandry_notes: z.string().optional().transform(val => val || 'none'),

  // Logistics
  is_boarding: z.boolean().default(false),
  is_quarantine: z.boolean().default(false),
});

export type FormState = z.infer<typeof formSchema>;

export interface AddAnimalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any; // any for now, to map between array and string fields
}

export function AddAnimalModal({ isOpen, onClose, initialData }: AddAnimalModalProps) {
  const form = useForm({
    defaultValues: {
      name: initialData?.name || '',
      species: initialData?.species || '',
      latin_name: initialData?.latin_name || '',
      category: initialData?.category || 'unknown',
      gender: initialData?.gender || 'unknown',
      location: initialData?.location || '',

      microchip_id: initialData?.microchip_id || '',
      ring_number: initialData?.ring_number || '',
      has_no_id: initialData?.has_no_id ?? false,

      date_of_birth: initialData?.date_of_birth || '',
      is_dob_unknown: initialData?.is_dob_unknown ?? false,
      hazard_rating: initialData?.hazard_rating || 'unknown',
      is_venomous: initialData?.is_venomous ?? false,
      red_list_status: initialData?.red_list_status || 'UNK',
      image_url: initialData?.image_url || null,
      distribution_map_url: initialData?.distribution_map_url || null,

      acquisition_date: initialData?.acquisition_date || '',
      acquisition_type: initialData?.acquisition_type || '',
      origin: initialData?.origin || '',
      origin_location: initialData?.origin_location || '',
      lineage_unknown: initialData?.lineage_unknown ?? false,
      sire_id: initialData?.sire_id || '',
      dam_id: initialData?.dam_id || '',

      flying_weight_g: initialData?.flying_weight_g === -1 ? undefined : initialData?.flying_weight_g,
      winter_weight_g: initialData?.winter_weight_g === -1 ? undefined : initialData?.winter_weight_g,
      average_target_weight: initialData?.average_target_weight === -1 ? undefined : initialData?.average_target_weight,

      ambient_temp_only: initialData?.ambient_temp_only ?? false,
      target_day_temp_c: initialData?.target_day_temp_c === -1 ? undefined : initialData?.target_day_temp_c,
      target_night_temp_c: initialData?.target_night_temp_c === -1 ? undefined : initialData?.target_night_temp_c,
      water_tipping_temp_c: initialData?.water_tipping_temp_c === -1 ? undefined : initialData?.water_tipping_temp_c,
      target_humidity_min: initialData?.target_humidity_min === -1 ? undefined : initialData?.target_humidity_min,
      target_humidity_max: initialData?.target_humidity_max === -1 ? undefined : initialData?.target_humidity_max,
      misting_frequency: initialData?.misting_frequency || '',

      description: Array.isArray(initialData?.description) ? initialData.description.join('\n') : (initialData?.description || ''),
      special_requirements: Array.isArray(initialData?.special_requirements) ? initialData.special_requirements.join('\n') : (initialData?.special_requirements || ''),
      critical_husbandry_notes: Array.isArray(initialData?.critical_husbandry_notes) ? initialData.critical_husbandry_notes.join('\n') : (initialData?.critical_husbandry_notes || ''),

      is_boarding: initialData?.is_boarding ?? false,
      is_quarantine: initialData?.is_quarantine ?? false,
    },
    onSubmit: async ({ value }) => {
      try {
        const validated = formSchema.parse(value);
        
        // Construct final payload
        const payload = {
          ...validated,
          // Convert multiline strings to arrays
          description: validated.description.split('\n').filter(s => s.trim()),
          special_requirements: validated.special_requirements.split('\n').filter(s => s.trim()),
          critical_husbandry_notes: validated.critical_husbandry_notes.split('\n').filter(s => s.trim()),
          
          // System hidden fields
          entity_type: 'INDIVIDUAL',
          parent_mob_id: '00000000-0000-0000-0000-000000000000',
          census_count: 1,
          weight_unit: 'g',
          display_order: 0,
        };

        if (payload.description.length === 0) payload.description = ['none'];
        if (payload.special_requirements.length === 0) payload.special_requirements = ['none'];
        if (payload.critical_husbandry_notes.length === 0) payload.critical_husbandry_notes = ['none'];

        console.log('Final Prepared Payload:', payload);
        
        await db.query(`
          INSERT INTO animals (
            entity_type, parent_mob_id, census_count, name, species, latin_name, category, location, image_url, distribution_map_url, 
            hazard_rating, is_venomous, weight_unit, flying_weight_g, winter_weight_g, average_target_weight, date_of_birth, is_dob_unknown, gender, 
            microchip_id, ring_number, has_no_id, red_list_status, description, special_requirements, critical_husbandry_notes, ambient_temp_only, target_day_temp_c, 
            target_night_temp_c, water_tipping_temp, target_humidity_min_percent, target_humidity_max_percent, misting_frequency, acquisition_date, acquisition_type, origin, 
            origin_location, lineage_unknown, sire_id, dam_id, is_boarding, is_quarantine, display_order
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
            $11, $12, $13, $14, $15, $16, $17, $18, $19, 
            $20, $21, $22, $23, $24, $25, $26, $27, $28, 
            $29, $30, $31, $32, $33, $34, $35, $36, 
            $37, $38, $39, $40, $41, $42, $43
          ) RETURNING *;
        `, [
          payload.entity_type, payload.parent_mob_id, payload.census_count, payload.name, payload.species, payload.latin_name, payload.category, payload.location, '-1', null,
          payload.hazard_rating, payload.is_venomous, payload.weight_unit, payload.flying_weight_g, payload.winter_weight_g, payload.average_target_weight, payload.date_of_birth, payload.is_dob_unknown, payload.gender,
          payload.microchip_id, payload.ring_number, payload.has_no_id, payload.red_list_status, payload.description, payload.special_requirements, payload.critical_husbandry_notes, payload.ambient_temp_only, payload.target_day_temp_c,
          payload.target_night_temp_c, payload.water_tipping_temp_c, payload.target_humidity_min, payload.target_humidity_max, payload.misting_frequency, payload.acquisition_date, payload.acquisition_type, payload.origin,
          payload.origin_location, payload.lineage_unknown, payload.sire_id, payload.dam_id, payload.is_boarding, payload.is_quarantine, payload.display_order
        ]);

        onClose();
      } catch (error) {
        console.error('Validation Error:', error);
      }
    },
  });

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  const InputLabel = ({ children }: { children: React.ReactNode }) => (
    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{children}</label>
  );

  const InputStyle = "w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-sm text-slate-200 focus:outline-none focus:border-emerald-500 disabled:opacity-50";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-hidden">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col font-sans text-slate-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded flex items-center justify-center text-slate-950 font-bold italic">K</div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 tracking-tight">
                {initialData ? 'Edit Animal Record' : 'Add Animal Record'}
              </h2>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mt-0.5">Comprehensive Entry</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <form id="add-animal-form" onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); form.handleSubmit(); }} className="space-y-8">
            
            {/* Core ID */}
            <section className="bg-slate-800/20 p-5 rounded-lg border border-slate-800/50">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 border-b border-slate-700 pb-2">Core ID</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <form.Field name="name">
                  {(field) => (
                    <div><InputLabel>Name *</InputLabel><input value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} className={InputStyle} /></div>
                  )}
                </form.Field>
                <form.Field name="species">
                  {(field) => (
                    <div><InputLabel>Species *</InputLabel><input value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} className={InputStyle} /></div>
                  )}
                </form.Field>
                <form.Field name="latin_name">
                  {(field) => (
                    <div><InputLabel>Latin Name</InputLabel><input value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} className={InputStyle} /></div>
                  )}
                </form.Field>
                <form.Field name="category">
                  {(field) => (
                    <div>
                      <InputLabel>Category</InputLabel>
                      <select value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} className={InputStyle}>
                        <option value="unknown">Unknown</option><option value="Owls">Owls</option><option value="Raptors">Raptors</option><option value="Mammals">Mammals</option><option value="Exotics">Exotics</option>
                      </select>
                    </div>
                  )}
                </form.Field>
                <form.Field name="gender">
                  {(field) => (
                    <div>
                      <InputLabel>Gender</InputLabel>
                      <select value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} className={InputStyle}>
                        <option value="unknown">Unknown</option><option value="Male">Male</option><option value="Female">Female</option>
                      </select>
                    </div>
                  )}
                </form.Field>
                <form.Field name="location">
                  {(field) => (
                    <div><InputLabel>Location</InputLabel><input value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} className={InputStyle} /></div>
                  )}
                </form.Field>
              </div>
            </section>

            {/* Identification */}
            <section className="bg-slate-800/20 p-5 rounded-lg border border-slate-800/50">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 border-b border-slate-700 pb-2">Identification</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <form.Field name="microchip_id">
                  {(field) => (
                    <div><InputLabel>Microchip ID</InputLabel><input value={field.state.value || ''} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} className={InputStyle} /></div>
                  )}
                </form.Field>
                <form.Subscribe selector={(state) => state.values.category}>
                  {(category) => (
                    <form.Field name="ring_number">
                      {(field) => (
                        <div>
                          <InputLabel>Ring Number {(category !== 'Owls' && category !== 'Raptors') && '(Owls and Raptors only)'}</InputLabel>
                          <input value={field.state.value || ''} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} disabled={category !== 'Owls' && category !== 'Raptors'} className={InputStyle} />
                        </div>
                      )}
                    </form.Field>
                  )}
                </form.Subscribe>
                <form.Field name="has_no_id">
                  {(field) => (
                    <div className="flex items-center mt-5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={field.state.value} onChange={(e) => field.handleChange(e.target.checked)} className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900" />
                        <span className="text-xs font-bold text-slate-300 uppercase">Has No ID</span>
                      </label>
                    </div>
                  )}
                </form.Field>
              </div>
            </section>

            {/* Status & Media */}
            <section className="bg-slate-800/20 p-5 rounded-lg border border-slate-800/50">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 border-b border-slate-700 pb-2">Status & Media</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                 <form.Subscribe selector={(state) => state.values.is_dob_unknown}>
                  {(isDobUnknown) => (
                    <form.Field name="date_of_birth">
                      {(field) => (
                        <div><InputLabel>Date of Birth</InputLabel><input type="date" value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} disabled={isDobUnknown} className={InputStyle} /></div>
                      )}
                    </form.Field>
                  )}
                </form.Subscribe>
                <form.Field name="is_dob_unknown">
                  {(field) => (
                    <div className="flex items-center mt-5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={field.state.value} onChange={(e) => field.handleChange(e.target.checked)} className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900" />
                        <span className="text-xs font-bold text-slate-300 uppercase">DOB Unknown</span>
                      </label>
                    </div>
                  )}
                </form.Field>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 mt-2">
                <form.Field name="hazard_rating">
                  {(field) => (
                    <div>
                      <InputLabel>Hazard Rating</InputLabel>
                      <select value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} className={InputStyle}>
                        <option value="none">None</option><option value="unknown">Unknown</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                      </select>
                    </div>
                  )}
                </form.Field>
                <form.Field name="red_list_status">
                  {(field) => (
                    <div>
                      <InputLabel>IUCN Red List Status</InputLabel>
                      <select value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} className={InputStyle}>
                        <option value="UNK">Unknown (UNK)</option>
                        <option value="EX">Extinct (EX)</option>
                        <option value="EW">Extinct In The Wild (EW)</option>
                        <option value="CR">Critically Endangered (CR)</option>
                        <option value="EN">Endangered (EN)</option>
                        <option value="VU">Vulnerable (VU)</option>
                        <option value="NT">Near Threatened (NT)</option>
                        <option value="LC">Least Concern (LC)</option>
                        <option value="DD">Data Deficient (DD)</option>
                        <option value="NE">Not Evaluated (NE)</option>
                      </select>
                    </div>
                  )}
                </form.Field>
                 <form.Field name="is_venomous">
                  {(field) => (
                    <div className="flex items-center mt-5">
                      <label className="flex items-center gap-2 cursor-pointer p-2 bg-rose-500/10 border border-rose-500/30 rounded">
                        <input type="checkbox" checked={field.state.value} onChange={(e) => field.handleChange(e.target.checked)} className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-rose-500 focus:ring-rose-500 focus:ring-offset-slate-900" />
                        <span className="text-xs font-bold text-rose-400 uppercase">Venomous Species</span>
                      </label>
                    </div>
                  )}
                </form.Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-800">
                <form.Field name="image_url">
                  {(field) => (
                    <div>
                      <InputLabel>Animal Photo</InputLabel>
                      <input type="file" accept="image/*" onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.files?.[0] || null)} className="w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-emerald-400 hover:file:bg-slate-700" />
                    </div>
                  )}
                </form.Field>
                <form.Field name="distribution_map_url">
                  {(field) => (
                    <div>
                      <InputLabel>Distribution Map</InputLabel>
                      <input type="file" accept="image/*" onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.files?.[0] || null)} className="w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-emerald-400 hover:file:bg-slate-700" />
                    </div>
                  )}
                </form.Field>
              </div>
            </section>

            {/* Acquisition & Origin */}
            <section className="bg-slate-800/20 p-5 rounded-lg border border-slate-800/50">
               <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 border-b border-slate-700 pb-2">Acquisition & Origin</h3>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <form.Field name="acquisition_date">
                    {(field) => (
                      <div><InputLabel>Acquisition Date</InputLabel><input type="date" value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} className={InputStyle} /></div>
                    )}
                  </form.Field>
                  <form.Field name="acquisition_type">
                    {(field) => (
                      <div><InputLabel>Acquisition Type</InputLabel><input value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} className={InputStyle} /></div>
                    )}
                  </form.Field>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <form.Field name="origin">
                    {(field) => (
                      <div><InputLabel>Origin</InputLabel><input value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} className={InputStyle} /></div>
                    )}
                  </form.Field>
                  <form.Field name="origin_location">
                    {(field) => (
                      <div><InputLabel>Origin Location</InputLabel><input value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} className={InputStyle} /></div>
                    )}
                  </form.Field>
                  <form.Field name="lineage_unknown">
                    {(field) => (
                      <div className="flex items-center mt-5">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={field.state.value} onChange={(e) => field.handleChange(e.target.checked)} className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900" />
                          <span className="text-xs font-bold text-slate-300 uppercase">Lineage Unknown</span>
                        </label>
                      </div>
                    )}
                  </form.Field>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <form.Subscribe selector={(state) => state.values.lineage_unknown}>
                    {(isLineageUnknown) => (
                      <>
                        <form.Field name="sire_id">
                          {(field) => (
                            <div><InputLabel>Sire ID</InputLabel><input value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} disabled={isLineageUnknown} className={InputStyle} /></div>
                          )}
                        </form.Field>
                        <form.Field name="dam_id">
                          {(field) => (
                            <div><InputLabel>Dam ID</InputLabel><input value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} disabled={isLineageUnknown} className={InputStyle} /></div>
                          )}
                        </form.Field>
                      </>
                    )}
                  </form.Subscribe>
               </div>
            </section>

             {/* Physical Targets */}
             <section className="bg-slate-800/20 p-5 rounded-lg border border-slate-800/50">
               <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 border-b border-slate-700 pb-2">Physical Targets</h3>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <form.Field name="flying_weight_g">
                    {(field) => (
                      <div><InputLabel>Flying Weight (g)</InputLabel><input type="number" step="0.1" value={field.state.value ?? ''} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.valueAsNumber || undefined)} className={InputStyle} /></div>
                    )}
                  </form.Field>
                  <form.Field name="winter_weight_g">
                    {(field) => (
                      <div><InputLabel>Winter Weight (g)</InputLabel><input type="number" step="0.1" value={field.state.value ?? ''} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.valueAsNumber || undefined)} className={InputStyle} /></div>
                    )}
                  </form.Field>
                  <form.Field name="average_target_weight">
                    {(field) => (
                      <div><InputLabel>Target Weight (g)</InputLabel><input type="number" step="0.1" value={field.state.value ?? ''} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.valueAsNumber || undefined)} className={InputStyle} /></div>
                    )}
                  </form.Field>
               </div>
            </section>

            {/* Environmental Targets */}
            <section className="bg-slate-800/20 p-5 rounded-lg border border-slate-800/50">
               <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 border-b border-slate-700 pb-2">Environmental Targets</h3>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <form.Field name="ambient_temp_only">
                    {(field) => (
                      <div className="flex items-center h-full pt-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={field.state.value} onChange={(e) => field.handleChange(e.target.checked)} className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900" />
                          <span className="text-xs font-bold text-slate-300 uppercase">Ambient Temp Only</span>
                        </label>
                      </div>
                    )}
                  </form.Field>
               </div>
               <form.Subscribe selector={(state) => state.values.ambient_temp_only}>
                  {(isAmbientOnly) => (
                     <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <form.Field name="target_day_temp_c">
                              {(field) => (
                                <div><InputLabel>Target Day Temp (°C)</InputLabel><input type="number" step="0.1" value={field.state.value ?? ''} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.valueAsNumber || undefined)} disabled={isAmbientOnly} className={InputStyle} /></div>
                              )}
                            </form.Field>
                            <form.Field name="target_night_temp_c">
                              {(field) => (
                                <div><InputLabel>Target Night Temp (°C)</InputLabel><input type="number" step="0.1" value={field.state.value ?? ''} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.valueAsNumber || undefined)} disabled={isAmbientOnly} className={InputStyle} /></div>
                              )}
                            </form.Field>
                            <form.Field name="water_tipping_temp_c">
                              {(field) => (
                                <div><InputLabel>Water Tipping Temp (°C)</InputLabel><input type="number" step="0.1" value={field.state.value ?? ''} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.valueAsNumber || undefined)} disabled={isAmbientOnly} className={InputStyle} /></div>
                              )}
                            </form.Field>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <form.Field name="target_humidity_min">
                              {(field) => (
                                <div><InputLabel>Target Humidity Min (%)</InputLabel><input type="number" step="1" value={field.state.value ?? ''} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.valueAsNumber || undefined)} disabled={isAmbientOnly} className={InputStyle} /></div>
                              )}
                            </form.Field>
                            <form.Field name="target_humidity_max">
                              {(field) => (
                                <div><InputLabel>Target Humidity Max (%)</InputLabel><input type="number" step="1" value={field.state.value ?? ''} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.valueAsNumber || undefined)} disabled={isAmbientOnly} className={InputStyle} /></div>
                              )}
                            </form.Field>
                            <form.Field name="misting_frequency">
                              {(field) => (
                                <div><InputLabel>Misting Frequency</InputLabel><input value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} disabled={isAmbientOnly} className={InputStyle} placeholder="e.g. Twice Daily" /></div>
                              )}
                            </form.Field>
                        </div>
                     </>
                  )}
               </form.Subscribe>
            </section>

             {/* Notes Line By Line */}
             <section className="bg-slate-800/20 p-5 rounded-lg border border-slate-800/50">
               <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 border-b border-slate-700 pb-2">Notes</h3>
               <div className="space-y-4">
                  <form.Field name="description">
                    {(field) => (
                      <div><InputLabel>Description (one item per line)</InputLabel><textarea value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} rows={3} className={InputStyle} /></div>
                    )}
                  </form.Field>
                  <form.Field name="special_requirements">
                    {(field) => (
                      <div><InputLabel>Special Requirements (one requirement per line)</InputLabel><textarea value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} rows={3} className={InputStyle} /></div>
                    )}
                  </form.Field>
                  <form.Field name="critical_husbandry_notes">
                    {(field) => (
                      <div><InputLabel>Critical Husbandry Notes (one note per line)</InputLabel><textarea value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} rows={3} className={InputStyle} /></div>
                    )}
                  </form.Field>
               </div>
            </section>

             {/* Logistics */}
             <section className="bg-slate-800/20 p-5 rounded-lg border border-slate-800/50">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 border-b border-slate-700 pb-2">Logistics</h3>
              <div className="flex gap-8">
                <form.Field name="is_boarding">
                  {(field) => (
                    <div className="flex items-center">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={field.state.value} onChange={(e) => field.handleChange(e.target.checked)} className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900" />
                        <span className="text-xs font-bold text-slate-300 uppercase">Is Boarding</span>
                      </label>
                    </div>
                  )}
                </form.Field>
                <form.Field name="is_quarantine">
                  {(field) => (
                    <div className="flex items-center">
                      <label className="flex items-center gap-2 cursor-pointer p-2 bg-amber-500/10 border border-amber-500/30 rounded">
                        <input type="checkbox" checked={field.state.value} onChange={(e) => field.handleChange(e.target.checked)} className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900" />
                        <span className="text-xs font-bold text-amber-400 uppercase">In Quarantine</span>
                      </label>
                    </div>
                  )}
                </form.Field>
              </div>
            </section>

          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-300 hover:text-white transition-colors border border-transparent hover:border-slate-700 rounded">
            Cancel
          </button>
          <button type="submit" form="add-animal-form" className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-sm font-bold rounded shadow-lg shadow-emerald-900/20 transition-all hover:-translate-y-0.5 active:translate-y-0">
            {initialData ? 'Save Changes' : 'Create Record'}
          </button>
        </div>
      </div>
    </div>
  );
}
