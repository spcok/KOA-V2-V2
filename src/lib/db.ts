import { PGlite } from '@electric-sql/pglite';

export const db = new PGlite('idb://koa-local-db');

// Module-level locks to defeat React Strict Mode double-mounting
let isInitializing = false;
let hasInitialized = false;

export async function initDb() {
  if (isInitializing || hasInitialized) {
      console.log("[DB Core] Boot sequence already locked by another thread. Bypassing.");
      return;
  }
  
  isInitializing = true;

  try {
    // 1. Foundation: The Migrations Ledger
    await db.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version text PRIMARY KEY,
        applied_at timestamp with time zone DEFAULT now()
      )
    `);

    // 2. The Execution Engine: Strictly isolated, race-condition-proof query runner
    const runMigration = async (version: string, queries: string[]) => {
      const { rows } = await db.query('SELECT version FROM schema_migrations WHERE version = $1', [version]);
      
      if (rows.length === 0) {
        console.log(`[DB Core] Deploying Schema ${version}...`);
        
        // Execute queries strictly one by one to prevent prepared statement panics
        for (const q of queries) {
            await db.query(q);
        }
        
        // Final database-level lock to catch microsecond races
        await db.query('INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT (version) DO NOTHING', [version]);
        console.log(`[DB Core] Schema ${version} Secured.`);
      }
    };

    // V1: Base Entities
    await runMigration('V1', [
      `CREATE TABLE IF NOT EXISTS users (id uuid PRIMARY KEY, email text UNIQUE NOT NULL, name text, initials text, role text DEFAULT 'KEEPER', is_deleted boolean DEFAULT false, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now())`,
      `CREATE TABLE IF NOT EXISTS animals (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, species text NOT NULL, status text DEFAULT 'ACTIVE', location text, is_deleted boolean DEFAULT false, created_by uuid, modified_by uuid, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now())`,
      `CREATE TABLE IF NOT EXISTS daily_logs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), animal_id uuid REFERENCES animals(id), log_type text NOT NULL, log_date date NOT NULL, notes text, weight_grams numeric, weight_unit text DEFAULT 'g', basking_temp_c numeric, cool_temp_c numeric, temperature_c numeric, food text, quantity numeric, feed_time time without time zone, feed_method text, cast_status text, misted boolean DEFAULT false, water boolean DEFAULT false, is_deleted boolean DEFAULT false, created_by uuid, modified_by uuid, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now())`,
      `CREATE TABLE IF NOT EXISTS feeding_schedules (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), animal_id uuid REFERENCES animals(id), scheduled_date date NOT NULL, food_type text NOT NULL, quantity numeric, calci_dust boolean DEFAULT false, additional_notes text, is_completed boolean DEFAULT false, completed_at timestamp with time zone, completed_by uuid, is_deleted boolean DEFAULT false, created_by uuid, modified_by uuid, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now())`
    ]);

    // V2: Round Data
    await runMigration('V2', [
      `CREATE TABLE IF NOT EXISTS daily_rounds (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), animal_id uuid REFERENCES animals(id), date date NOT NULL, shift text NOT NULL, section text NOT NULL, is_alive boolean DEFAULT true, water_checked boolean DEFAULT false, locks_secured boolean DEFAULT false, animal_issue_note text, general_section_note text, completed_by uuid, completed_at timestamp with time zone, is_deleted boolean DEFAULT false, created_by uuid, modified_by uuid, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now())`
    ]);

    // V3: Animal Profile Expansion
    await runMigration('V3', [
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS entity_type text DEFAULT 'INDIVIDUAL'`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS parent_mob_id uuid`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS census_count integer DEFAULT 1`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS latin_name text`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS category text`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS image_url text`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS distribution_map_url text`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS hazard_rating text DEFAULT 'LOW'`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS is_venomous boolean DEFAULT false`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS weight_unit text DEFAULT 'g'`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS flying_weight_g numeric`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS winter_weight_g numeric`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS average_target_weight numeric`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS date_of_birth date`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS is_dob_unknown boolean DEFAULT false`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS gender text DEFAULT 'Unknown'`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS microchip_id text`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS ring_number text`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS has_no_id boolean DEFAULT false`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS red_list_status text DEFAULT 'NE'`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS description text`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS special_requirements text`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS critical_husbandry_notes text`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS ambient_temp_only boolean DEFAULT false`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS target_day_temp_c numeric`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS target_night_temp_c numeric`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS water_tipping_temp numeric`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS target_humidity_min_percent numeric`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS target_humidity_max_percent numeric`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS misting_frequency text`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS acquisition_date date`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS acquisition_type text`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS origin text`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS origin_location text`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS lineage_unknown boolean DEFAULT false`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS sire_id uuid`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS dam_id uuid`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS is_boarding boolean DEFAULT false`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS is_quarantine boolean DEFAULT false`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS archive_reason text`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS archive_type text`,
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone`
    ]);

    // V4: User Deletion Sync
    await runMigration('V4', [
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false`
    ]);

    // V5: AI Signage JSON
    await runMigration('V5', [
        `ALTER TABLE animals ADD COLUMN IF NOT EXISTS sign_content jsonb`
    ]);

    // V6: Tasks Infrastructure
    await runMigration('V6', [
        `CREATE TABLE IF NOT EXISTS tasks (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, description text, assigned_to uuid, due_date date, task_type text DEFAULT 'GENERAL', status text DEFAULT 'PENDING', location text DEFAULT '', priority text DEFAULT 'MEDIUM', completed_at timestamp with time zone, completed_by uuid, is_deleted boolean NOT NULL DEFAULT false, created_by uuid, modified_by uuid, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now())`
    ]);

    const { rows } = await db.query('SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1');
    console.log(`[DB Core] Boot sequence complete. Active Schema: ${rows[0]?.version || 'Unknown'}`);
    hasInitialized = true;

  } catch (err) {
    console.error('[DB Core] FATAL INITIALIZATION ERROR:', err);
  } finally {
    isInitializing = false;
  }
}
