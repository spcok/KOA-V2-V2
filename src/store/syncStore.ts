import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { db } from '../lib/db';
import { queryClient } from '../lib/queryClient';

interface SyncState {
  isSyncing: boolean;
  lastSyncedAt: string | null;
  lastPushedAt: number;
  realtimeChannel: any | null;
  pullFromCloud: () => Promise<void>;
  pushToCloud: () => Promise<void>;
  syncAll: () => Promise<void>;
  initRealtimeSubscription: () => void;
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set, get) => ({
      isSyncing: false,
      lastSyncedAt: null,
      lastPushedAt: 0,
      realtimeChannel: null,

      pushToCloud: async () => {
        const { lastSyncedAt } = get();
        
        // Dynamic High-Water Mark Logic
        let logsQuery = 'SELECT * FROM daily_logs';
        let animalsQuery = 'SELECT * FROM animals';
        let schedulesQuery = 'SELECT * FROM feeding_schedules';
        const params: any[] = [];

        if (lastSyncedAt) {
          logsQuery += ' WHERE updated_at > $1';
          animalsQuery += ' WHERE updated_at > $1';
          schedulesQuery += ' WHERE updated_at > $1';
          params.push(lastSyncedAt);
        }

        const { rows: localLogs } = await db.query(logsQuery, params);
        if (localLogs.length > 0) {
          const { error } = await supabase.from('daily_logs').upsert(localLogs);
          if (error) throw error;
        }

        const { rows: localAnimals } = await db.query(animalsQuery, params);
        if (localAnimals.length > 0) {
          const { error } = await supabase.from('animals').upsert(localAnimals);
          if (error) throw error;
        }
        
        const { rows: localSchedules } = await db.query(schedulesQuery, params);
        if (localSchedules.length > 0) {
          const { error } = await supabase.from('feeding_schedules').upsert(localSchedules);
          if (error) throw error;
        }

        set({ lastPushedAt: Date.now() });
      },

      pullFromCloud: async () => {
        set({ isSyncing: true });
        const { lastSyncedAt } = get();
        
        try {
          // 1. Pull Users (Always pull all to ensure UUID mappings are safe)
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

          // 2. Pull Animals (Delta)
          let animalsReq = supabase.from('animals').select('*');
          if (lastSyncedAt) animalsReq = animalsReq.gt('updated_at', lastSyncedAt);
          const { data: animalsData, error: animalsError } = await animalsReq;
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
                const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
                const setClause = columns.map(c => `${c} = EXCLUDED.${c}`).join(', ');
                const values = columns.map(col => record[col]);
                
                await tx.query(
                  `INSERT INTO animals (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET ${setClause}`,
                  values
                );
              }
            });
          }

          // 3. Pull Daily Logs (Delta)
          let logsReq = supabase.from('daily_logs').select('*');
          if (lastSyncedAt) logsReq = logsReq.gt('updated_at', lastSyncedAt);
          const { data: logsData, error: logsError } = await logsReq;
          if (logsError) throw logsError;

          if (logsData && logsData.length > 0) {
            await db.transaction(async (tx) => {
              for (const record of logsData) {
                const columns = [
                  'id', 'animal_id', 'log_type', 'log_date', 'notes', 'weight_grams', 'weight_unit',
                  'basking_temp_c', 'cool_temp_c', 'temperature_c', 'food', 'quantity', 'feed_time',
                  'feed_method', 'cast_status', 'misted', 'water', 'is_deleted', 'created_by', 'modified_by',
                  'created_at', 'updated_at'
                ];
                const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
                const setClause = columns.map(c => `${c} = EXCLUDED.${c}`).join(', ');
                const values = columns.map(col => record[col]);
                
                await tx.query(
                  `INSERT INTO daily_logs (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET ${setClause}`,
                  values
                );
              }
            });
          }

          queryClient.invalidateQueries();
        } catch (err) {
          console.error('Delta Pull Error:', err);
        } finally {
          set({ isSyncing: false });
        }
      },

      syncAll: async () => {
        set({ isSyncing: true });
        try {
          await get().pushToCloud();
          await get().pullFromCloud();
          // Update the high-water mark only if both succeed
          set({ lastSyncedAt: new Date().toISOString(), isSyncing: false });
        } catch (err) {
          console.error('Sync failed', err);
          set({ isSyncing: false });
        }
      },

      initRealtimeSubscription: () => {
        if (get().realtimeChannel) return;

        const channel = supabase.channel('public:daily_logs');
        set({ realtimeChannel: channel });

        channel
          .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_logs' }, async (payload) => {
            const { lastPushedAt } = get();
            // If we pushed within the last 3 seconds, this is almost certainly our own echo. Ignore it.
            if (Date.now() - lastPushedAt < 3000) {
              console.log('Realtime Echo Cancelled: Local mutation detected.');
              return;
            }
            console.log('Remote mutation detected. Triggering Delta Pull...');
            await get().pullFromCloud();
          })
          .subscribe();
      }
    }),
    {
      name: 'koa-sync-storage',
      partialize: (state) => ({ lastSyncedAt: state.lastSyncedAt, lastPushedAt: state.lastPushedAt }), // Persist both
    }
  )
);
