import React, { useState } from 'react';
import { Archive, Edit2, FileText, RefreshCw } from 'lucide-react';
import { usePermissions } from '../../../hooks/usePermissions';
import { UserRole, Animal } from '../../../types';
import { ArchiveAnimalModal } from './ArchiveAnimalModal';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';

interface Props {
  onEdit: () => void;
  onSign: () => void;
  animal: Animal;
}

export const ProfileActionBar: React.FC<Props> = ({ onEdit, onSign, animal }) => {
  const permissions = usePermissions();
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const queryClient = useQueryClient();
  
  const canArchive = permissions.archive_animals || permissions.role === UserRole.ADMIN || permissions.role === UserRole.OWNER;

  const handleReactivate = async () => {
    try {
      const { error } = await supabase.rpc('reactivate_animal_sub_account', { p_animal_id: animal.id });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['animals'] });
      toast.success('Animal reactivated successfully!');
    } catch (err: unknown) {
      console.error('Reactivate error:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to reactivate: ${message}`);
    }
  };

  return (
    <div className="flex gap-2 mt-4">
      {animal.archived ? (
        <button 
          onClick={handleReactivate}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
        >
          <RefreshCw size={16} /> Reactivate Animal
        </button>
      ) : (
        <>
          <button 
            onClick={onEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition"
          >
            <Edit2 size={16} /> Edit
          </button>
          <button 
            onClick={onSign}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 text-sm rounded-lg hover:bg-slate-200 transition"
          >
            <FileText size={16} /> Sign Generator
          </button>
          {canArchive && (
            <button 
              onClick={() => setIsArchiveModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 text-sm rounded-lg hover:bg-red-100 transition"
            >
              <Archive size={16} /> Archive
            </button>
          )}
        </>
      )}

      {isArchiveModalOpen && (
        <ArchiveAnimalModal 
          animal={animal} 
          onClose={() => setIsArchiveModalOpen(false)} 
        />
      )}
    </div>
  );
};
