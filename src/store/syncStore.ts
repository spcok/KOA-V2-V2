import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { db } from '../lib/db';
import { queryClient } from '../lib/queryClient';

interface SyncState {
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  realtimeChannel: any | null;
  pullFromCloud: () => Promise<void>;
  pushToCloud: () => Promise<void>;
  syncAll: () => Promise<void>;
  initRealtimeSubscription: () => void;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  isSyncing: false,
  lastSyncedAt: null,
  realtimeChannel: null,
  pushToCloud: async () => {
    const { rows: localLogs } = await db.query('SELECT * FROM daily_logs');
    if (localLogs.length > 0) {
      const { error } = await supabase.from('daily_logs').upsert(localLogs);
      if (error) throw error;
    }
  },
  pullFromCloud: async () => {
    set({ isSyncing: true });
    try {
      // Pull Users
      const { data: usersData, error: usersError } = await supabase.from('users').select('*');
      if (usersError) throw usersError;

      if (usersData && usersData.length > 0) {
        await db.transaction(async (tx) => {
          for (const record of usersData) {
            await tx.query(
              `INSERT INTO users (id, email, name, initials, role, is_deleted, created_at, updated_at) 
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               ON CONFLICT (id) DO UPDATE SET 
               email = EXCLUDED.email, name = EXCLUDED.name, initials = EXCLUDED.initials, 
               role = EXCLUDED.role, is_deleted = EXCLUDED.is_deleted, updated_at = EXCLUDED.updated_at`,
              [record.id, record.email, record.name, record.initials, record.role, record.is_deleted, record.created_at, record.updated_at]
            );
          }
        });
      }

      // Pull Animals
      const { data: animalsData, error: animalsError } = await supabase.from('animals').select('*');
      if (animalsError) throw animalsError;

      if (animalsData && animalsData.length > 0) {
        await db.transaction(async (tx) => {
          for (const record of animalsData) {
            const columns = [
              'id', 'entity_type', 'parent_mob_id', 'census_count', 'name', 'species', 
              'latin_name', 'category', 'location', 'image_url', 'distribution_map_url', 
              'hazard_rating', 'is_venomous', 'weight_unit', 'flying_weight_g', 'winter_weight_g', 
              'average_target_weight', 'date_of_birth', 'is_dob_unknown', 'gender', 'microchip_id', 
              'ring_number', 'has_no_id', 'red_list_status', 'description', 'special_requirements', 
              'critical_husbandry_notes', 'ambient_temp_only', 'target_day_temp_c', 'target_night_temp_c', 
              'water_tipping_temp', 'target_humidity_min_percent', 'target_humidity_max_percent', 
              'misting_frequency', 'acquisition_date', 'acquisition_type', 'origin', 'origin_location', 
              'lineage_unknown', 'sire_id', 'dam_id', 'is_boarding', 'is_quarantine', 'display_order', 
              'archived', 'archive_reason', 'archive_type', 'archived_at', 'is_deleted', 'created_by', 
              'modified_by', 'created_at', 'updated_at'
            ];
            
            const values = columns.map(col => record[col]);
            const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
            const updateSet = columns.map(col => `${col} = EXCLUDED.${col}`).join(', ');

            const query = `
              INSERT INTO animals (${columns.join(', ')})
              VALUES (${placeholders})
              ON CONFLICT (id) DO UPDATE SET ${updateSet};
            `;

            await tx.query(query, values);
          }
        });
      }

      // Pull Logs
      const { data: logsData, error: logsError } = await supabase.from('daily_logs').select('*');
      if (logsError) throw logsError;

      if (logsData && logsData.length > 0) {
        await db.transaction(async (tx) => {
          for (const record of logsData) {
            const columns = [
              'id', 'animal_id', 'log_type', 'log_date', 'notes', 'weight_grams', 'weight_unit', 
              'temperature_c', 'basking_temp_c', 'cool_temp_c', 'misted', 'water', 'food', 'quantity', 
              'feed_time', 'feed_method', 'cast_status', 'created_at', 'updated_at'
            ];
            
            const values = columns.map(col => record[col]);
            const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
            const updateSet = columns.map(col => `${col} = EXCLUDED.${col}`).join(', ');

            const query = `
              INSERT INTO daily_logs (${columns.join(', ')})
              VALUES (${placeholders})
              ON CONFLICT (id) DO UPDATE SET ${updateSet};
            `;

            await tx.query(query, values);
          }
        });
      }
      
      set({ lastSyncedAt: new Date(), isSyncing: false });
    } catch (err) {
      console.error('Error pulling from cloud:', err);
      set({ isSyncing: false });
      throw err;
    }
  },
  syncAll: async () => {
    set({ isSyncing: true });
    try {
      await get().pushToCloud();
      await get().pullFromCloud();
      set({ lastSyncedAt: new Date(), isSyncing: false });
    } catch (err) {
    }
  },
  initRealtimeSubscription: () => {
    if (get().realtimeChannel) return;

    const channel = supabase.channel('public:daily_logs');
    set({ realtimeChannel: channel });

    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_logs' }, async (payload) => {
        console.log('Realtime payload received:', payload);

        if (payload.eventType === 'DELETE') {
          await db.query('DELETE FROM daily_logs WHERE id = $1', [payload.old.id]);
          window.dispatchEvent(new Event('db-updated'));
        } else if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          // Destructure the new record
          const record = payload.new;
          const columns = [
            'id', 'animal_id', 'log_type', 'log_date', 'notes', 'weight_grams', 'weight_unit',
            'temperature_c', 'basking_temp_c', 'cool_temp_c', 'misted', 'water', 'food',
            'quantity', 'feed_time', 'feed_method', 'cast_status', 'created_at', 'updated_at'
          ];
          const values = columns.map(col => record[col]);
          const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
          const updateSet = columns.map(col => `${col} = EXCLUDED.${col}`).join(', ');

          const query = `
            INSERT INTO daily_logs (${columns.join(', ')})
            VALUES (${placeholders})
            ON CONFLICT (id) DO UPDATE SET ${updateSet};
          `;
          await db.query(query, values);
          window.dispatchEvent(new Event('db-updated'));
        }
        queryClient.invalidateQueries();
      })
      .subscribe();
  }
}));