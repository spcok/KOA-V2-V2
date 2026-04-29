import React, { useState, useEffect } from 'react';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { db } from '../../../lib/db';
import { useSyncStore } from '../../../store/syncStore';
import { queryClient } from '../../../lib/queryClient';
import { useAuthStore } from '../../../store/authStore';
import { X, Save, Loader2 } from 'lucide-react';

// Strict Schema Boundary mapping to PGLite
const animalSchema = z.object({
  name: z.string().min(1, "Name is required"),
  species: z.string().min(1, "Species is required"),
  latin_name: z.string().default('unknown'),
  category: z.string().default('unknown'),
  location: z.string().default('unknown'),
  entity_type: z.enum(['INDIVIDUAL', 'MOB', 'EGG']).default('INDIVIDUAL'),
  gender: z.string().default('unknown'),
  weight_unit: z.enum(['g', 'kg', 'lb', 'oz', 'lbs_oz']).default('g'),
  hazard_rating: z.string().default('unknown'),
  is_venomous: z.boolean().default(false),
  microchip_id: z.string().default('unknown'),
  ring_number: z.string().default('unknown'),
  date_of_birth: z.string().default('1900-01-01'),
});

interface AddAnimalModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingAnimalId?: string;
}

export function AddAnimalModal({ isOpen, onClose, existingAnimalId }: AddAnimalModalProps) {
  const [isFetching, setIsFetching] = useState(!!existingAnimalId);
  const [initialData, setInitialData] = useState({
    name: '', species: '', latin_name: 'unknown', category: 'unknown',
    location: 'unknown', entity_type: 'INDIVIDUAL', gender: 'unknown',
    weight_unit: 'g', hazard_rating: 'unknown', is_venomous: false,
    microchip_id: 'unknown', ring_number: 'unknown', date_of_birth: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    async function fetchData() {
      if (existingAnimalId && isOpen) {
        setIsFetching(true);
        try {
          const res = await db.query('SELECT * FROM animals WHERE id = $1', [existingAnimalId]);
          if (res.rows[0]) {
            const row = res.rows[0];
            setInitialData({
              name: row.name, species: row.species, latin_name: row.latin_name,
              category: row.category, location: row.location, entity_type: row.entity_type,
              gender: row.gender, weight_unit: row.weight_unit, hazard_rating: row.hazard_rating,
              is_venomous: row.is_venomous, microchip_id: row.microchip_id, 
              ring_number: row.ring_number, date_of_birth: row.date_of_birth
            });
          }
        } catch (err) {
          console.error("Failed to load animal", err);
        } finally {
          setIsFetching(false);
        }
      }
    }
    fetchData();
  }, [existingAnimalId, isOpen]);

  if (!isOpen) return null;
  if (isFetching) return <div className="fixed inset-0 bg-slate-900/80 flex justify-center items-center z-50 text-emerald-400 font-mono">Loading data from vault...</div>;

  return <AnimalFormEngine onClose={onClose} existingAnimalId={existingAnimalId} initialData={initialData} />;
}

function AnimalFormEngine({ onClose, existingAnimalId, initialData }: { onClose: () => void, existingAnimalId?: string, initialData: any }) {
  
  const saveMutation = useMutation({
    mutationFn: async (value: any) => {
      const session = useAuthStore.getState().session;
      const currentUserId = session?.user?.id || '00000000-0000-0000-0000-000000000000';
      
      if (existingAnimalId) {
        await db.query(
          `UPDATE animals SET 
            name=$1, species=$2, latin_name=$3, category=$4, location=$5, entity_type=$6, gender=$7, 
            weight_unit=$8, hazard_rating=$9, is_venomous=$10, microchip_id=$11, ring_number=$12, 
            date_of_birth=$13, updated_at=now(), modified_by=$14 
          WHERE id=$15`,
          [value.name, value.species, value.latin_name, value.category, value.location, value.entity_type, value.gender, value.weight_unit, value.hazard_rating, value.is_venomous, value.microchip_id, value.ring_number, value.date_of_birth, currentUserId, existingAnimalId]
        );
      } else {
        await db.query(
          `INSERT INTO animals (
            name, species, latin_name, category, location, entity_type, gender, weight_unit, 
            hazard_rating, is_venomous, microchip_id, ring_number, date_of_birth, created_by, modified_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $14)`,
          [value.name, value.species, value.latin_name, value.category, value.location, value.entity_type, value.gender, value.weight_unit, value.hazard_rating, value.is_venomous, value.microchip_id, value.ring_number, value.date_of_birth, currentUserId]
        );
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      useSyncStore.getState().pushToCloud().catch(console.error);
      onClose();
    },
    onError: (err) => {
      console.error('CRITICAL SQL ERROR:', err);
      alert('Database Error: Failed to save animal profile.');
    }
  });

  const form = useForm({
    validatorAdapter: zodValidator,
    defaultValues: initialData,
    onSubmit: async ({ value }) => {
      saveMutation.mutate(value);
    },
  });

  // Reusable Field Component to eliminate boilerplate
  const FieldWrapper = ({ name, label, type = "text", options }: { name: string, label: string, type?: string, options?: string[] }) => (
    <form.Field name={name as any} children={(field) => (
      <div>
        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</label>
        {type === 'select' ? (
          <select value={field.state.value as string} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-amber-500">
            {options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        ) : type === 'checkbox' ? (
          <div className="flex items-center h-full pt-6">
            <input type="checkbox" checked={field.state.value as boolean} onChange={(e) => field.handleChange(e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-amber-500 focus:ring-amber-500" />
            <span className="ml-2 text-sm font-bold text-slate-700">{label}</span>
          </div>
        ) : (
          <input type={type} value={field.state.value as string} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-amber-500" />
        )}
      </div>
    )} />
  );

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200 shadow-xl rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden text-slate-900">
        
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-black tracking-tight text-slate-800">{existingAnimalId ? 'Edit Animal Profile' : 'Register New Animal'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-300">
          <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <FieldWrapper name="name" label="Name (or ID)" />
               <FieldWrapper name="species" label="Species / Common Name" />
               <FieldWrapper name="latin_name" label="Latin Name" />
               <FieldWrapper name="category" label="Category" options={['Mammal', 'Bird', 'Reptile', 'Amphibian', 'Invertebrate', 'Fish', 'unknown']} type="select" />
            </div>

            <div className="h-px w-full bg-slate-100 my-4"></div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <FieldWrapper name="entity_type" label="Entity Type" options={['INDIVIDUAL', 'MOB', 'EGG']} type="select" />
               <FieldWrapper name="gender" label="Gender" options={['Male', 'Female', 'Unknown', 'Mixed']} type="select" />
               <FieldWrapper name="date_of_birth" label="Date of Birth" type="date" />
               <FieldWrapper name="weight_unit" label="Preferred Weight Unit" options={['g', 'kg', 'lb', 'oz', 'lbs_oz']} type="select" />
               <FieldWrapper name="location" label="Enclosure / Location" />
               <FieldWrapper name="hazard_rating" label="Hazard Rating" options={['unknown', 'Low', 'Medium', 'High', 'Extreme']} type="select" />
            </div>

            <div className="h-px w-full bg-slate-100 my-4"></div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <FieldWrapper name="microchip_id" label="Microchip ID" />
               <FieldWrapper name="ring_number" label="Ring / Band Number" />
               <FieldWrapper name="is_venomous" label="Is Venomous/Toxic" type="checkbox" />
            </div>

          </form>
        </div>

        <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-6 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold uppercase text-xs tracking-wider transition-colors">Cancel</button>
          <button type="button" onClick={() => form.handleSubmit()} disabled={saveMutation.isPending} className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold uppercase text-xs tracking-wider transition-colors flex items-center gap-2">
            {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Profile
          </button>
        </div>

      </div>
    </div>
  );
}
