import { PGlite } from '@electric-sql/pglite';
import { live } from '@electric-sql/pglite/live';

export const db = new PGlite('idb://koa-local-db', {
  extensions: {
    live,
  }
});

export const initDb = async () => {
  // 1. Initialize the migration tracking table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version integer PRIMARY KEY,
      executed_at timestamp with time zone DEFAULT now()
    );
  `);

  // 2. Determine the current local database version
  const { rows } = await db.query('SELECT MAX(version) as current_version FROM schema_migrations');
  const currentVersion = rows[0]?.current_version || 0;

  console.log(`[DB Boot] Current Local Schema Version: V${currentVersion}`);

  // ==========================================
  // MIGRATION V1: Base System Tables
  // ==========================================
  if (currentVersion < 1) {
    console.log('[DB Boot] Executing Migration V1: Base Schema...');
    await db.exec(`
      CREATE TABLE IF NOT EXISTS animals (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_type text NOT NULL DEFAULT 'INDIVIDUAL',
        parent_mob_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        census_count integer NOT NULL DEFAULT 1,
        name text NOT NULL DEFAULT 'unknown',
        species text NOT NULL DEFAULT 'unknown',
        latin_name text NOT NULL DEFAULT 'unknown',
        category text NOT NULL DEFAULT 'unknown',
        location text NOT NULL DEFAULT 'unknown',
        image_url text NOT NULL DEFAULT '-1',
        distribution_map_url text,
        hazard_rating text NOT NULL DEFAULT 'unknown',
        is_venomous boolean NOT NULL DEFAULT false,
        weight_unit text NOT NULL DEFAULT 'g',
        flying_weight_g numeric NOT NULL DEFAULT -1,
        winter_weight_g numeric NOT NULL DEFAULT -1,
        average_target_weight numeric NOT NULL DEFAULT -1,
        date_of_birth date NOT NULL DEFAULT '1900-01-01',
        is_dob_unknown boolean NOT NULL DEFAULT false,
        gender text NOT NULL DEFAULT 'unknown',
        microchip_id text NOT NULL DEFAULT 'unknown',
        ring_number text NOT NULL DEFAULT 'unknown',
        has_no_id boolean NOT NULL DEFAULT false,
        red_list_status text NOT NULL DEFAULT 'UNK',
        description text[] NOT NULL DEFAULT ARRAY['none'],
        special_requirements text[] NOT NULL DEFAULT ARRAY['none'],
        critical_husbandry_notes text[] NOT NULL DEFAULT ARRAY['none'],
        ambient_temp_only boolean NOT NULL DEFAULT false,
        target_day_temp_c numeric NOT NULL DEFAULT -1,
        target_night_temp_c numeric NOT NULL DEFAULT -1,
        water_tipping_temp numeric,
        target_humidity_min_percent numeric,
        target_humidity_max_percent numeric,
        misting_frequency text,
        acquisition_date date NOT NULL DEFAULT '1900-01-01',
        acquisition_type text NOT NULL DEFAULT 'unknown',
        origin text NOT NULL DEFAULT 'unknown',
        origin_location text NOT NULL DEFAULT 'unknown',
        lineage_unknown boolean NOT NULL DEFAULT false,
        sire_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        dam_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        is_boarding boolean NOT NULL DEFAULT false,
        is_quarantine boolean NOT NULL DEFAULT false,
        display_order integer NOT NULL DEFAULT 0,
        archived boolean NOT NULL DEFAULT false,
        archive_reason text NOT NULL DEFAULT 'unknown',
        archive_type text NOT NULL DEFAULT 'unknown',
        archived_at timestamp with time zone NOT NULL DEFAULT '1900-01-01 00:00:00+00',
        is_deleted boolean NOT NULL DEFAULT false,
        created_by uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        modified_by uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS daily_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        animal_id uuid NOT NULL,
        log_type text NOT NULL,
        log_date timestamp with time zone NOT NULL,
        notes text DEFAULT 'NONE',
        weight_grams numeric DEFAULT -1,
        weight_unit text DEFAULT '-1',
        basking_temp_c numeric DEFAULT -1,
        cool_temp_c numeric DEFAULT -1,
        temperature_c numeric DEFAULT -1,
        food text DEFAULT 'N/A',
        quantity numeric DEFAULT -1,
        feed_time time DEFAULT '00:00:00',
        feed_method text DEFAULT 'N/A',
        cast_status text DEFAULT 'N/A',
        misted text DEFAULT 'N/A',
        water text DEFAULT 'N/A',
        is_deleted boolean NOT NULL DEFAULT false,
        created_by uuid,
        modified_by uuid,
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS feeding_schedules (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        animal_id uuid NOT NULL,
        scheduled_date date NOT NULL,
        food_type text NOT NULL,
        quantity numeric NOT NULL,
        calci_dust boolean NOT NULL DEFAULT false,
        additional_notes text,
        is_completed boolean NOT NULL DEFAULT false,
        completed_at timestamp with time zone,
        completed_by uuid,
        is_deleted boolean NOT NULL DEFAULT false,
        created_by uuid,
        modified_by uuid,
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY,
        email text NOT NULL,
        name text,
        initials text,
        role text,
        is_deleted boolean NOT NULL DEFAULT false,
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now()
      );
    `);
    
    await db.query('INSERT INTO schema_migrations (version) VALUES (1)');
    console.log('[DB Boot] Migration V1 Complete.');
  }

  // ==========================================
  // MIGRATION V2: Daily Rounds Module
  // ==========================================
  if (currentVersion < 2) {
    console.log('[DB Boot] Executing Migration V2: Daily Rounds...');
    await db.exec(`
      CREATE TABLE IF NOT EXISTS daily_rounds (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        round_date date NOT NULL,
        round_time time,
        assigned_to uuid,
        status text DEFAULT 'pending',
        notes text,
        is_deleted boolean NOT NULL DEFAULT false,
        created_by uuid,
        modified_by uuid,
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now()
      );
    `);
    await db.query('INSERT INTO schema_migrations (version) VALUES (2)');
    console.log('[DB Boot] Migration V2 Complete.');
  }

  // ==========================================
  // MIGRATION V3: Align Daily Rounds with CSV Schema
  // ==========================================
  if (currentVersion < 3) {
    console.log('[DB Boot] Executing Migration V3: Schema Alignment...');
    
    await db.exec(`
      DROP TABLE IF EXISTS daily_rounds;
      
      CREATE TABLE daily_rounds (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        animal_id uuid,
        date date NOT NULL,
        shift text NOT NULL,
        section text,
        is_alive boolean,
        water_checked boolean,
        locks_secured boolean,
        animal_issue_note text,
        general_section_note text,
        completed_by uuid,
        completed_at timestamp with time zone,
        is_deleted boolean NOT NULL DEFAULT false,
        created_by uuid,
        modified_by uuid,
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now()
      );
    `);
    
    await db.query('INSERT INTO schema_migrations (version) VALUES (3)');
    console.log('[DB Boot] Migration V3 Complete.');
  }

  // ==========================================
  // MIGRATION V4: Users Table & Strict Mode Safety
  // ==========================================
  if (currentVersion < 4) {
    console.log('[DB Boot] Executing Migration V4: Users Table Initialization...');
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY,
        email text NOT NULL,
        name text,
        initials text,
        role text,
        is_deleted boolean NOT NULL DEFAULT false,
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now()
      );
    `);
    // Protected against concurrent React Strict Mode boots
    await db.query('INSERT INTO schema_migrations (version) VALUES (4) ON CONFLICT (version) DO NOTHING');
    console.log('[DB Boot] Migration V4 Complete.');
  }

  // ==========================================
  // MIGRATION V5: Sign Generator Cache Column
  // ==========================================
  if (currentVersion < 5) {
    console.log('[DB Boot] Executing Migration V5: Sign Content Column...');
    await db.exec(`ALTER TABLE animals ADD COLUMN IF NOT EXISTS sign_content text;`);
    await db.query('INSERT INTO schema_migrations (version) VALUES (5) ON CONFLICT (version) DO NOTHING');
    console.log('[DB Boot] Migration V5 Complete.');
  }

  // ==========================================
  // FUTURE MIGRATIONS GO HERE (e.g., if currentVersion < 5)
  // ==========================================

};
