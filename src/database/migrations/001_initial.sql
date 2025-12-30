-- ============================================
-- Initial database schema
-- ============================================

-- ============================================
-- Students table
-- ============================================
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  gender TEXT NOT NULL CHECK(gender IN ('male', 'female')),
  contact TEXT,
  grade TEXT,
  class_name TEXT,
  special_needs INTEGER DEFAULT 0 CHECK(special_needs IN (0, 1)),
  preferred_seat_id TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for students
CREATE INDEX IF NOT EXISTS idx_students_gender ON students(gender);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_name);
CREATE INDEX IF NOT EXISTS idx_students_special_needs ON students(special_needs);

-- ============================================
-- Layout configurations table
-- ============================================
CREATE TABLE IF NOT EXISTS layout_configs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  rows INTEGER NOT NULL CHECK(rows > 0),
  cols INTEGER NOT NULL CHECK(cols > 0),
  seat_numbering_mode TEXT NOT NULL DEFAULT 'sequential' CHECK(seat_numbering_mode IN ('sequential', 'coordinate')),
  layout_data TEXT NOT NULL, -- JSON
  functional_areas TEXT, -- JSON
  is_default INTEGER DEFAULT 0 CHECK(is_default IN (0, 1)),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for layouts
CREATE INDEX IF NOT EXISTS idx_layouts_default ON layout_configs(is_default);

-- ============================================
-- Seating records table
-- ============================================
CREATE TABLE IF NOT EXISTS seating_records (
  id TEXT PRIMARY KEY,
  layout_id TEXT NOT NULL,
  fill_strategy TEXT NOT NULL CHECK(fill_strategy IN ('random', 'manual', 'mixed')),
  constraint_type TEXT CHECK(constraint_type IN ('mixed_gender', 'same_gender', 'random')),
  seating_data TEXT NOT NULL, -- JSON
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (layout_id) REFERENCES layout_configs(id) ON DELETE CASCADE
);

-- Indexes for seating records
CREATE INDEX IF NOT EXISTS idx_seating_records_layout ON seating_records(layout_id);
CREATE INDEX IF NOT EXISTS idx_seating_records_created ON seating_records(created_at DESC);

-- ============================================
-- Application settings table
-- ============================================
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL, -- JSON
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Triggers for automatic timestamp updates
-- ============================================
CREATE TRIGGER IF NOT EXISTS update_students_timestamp
AFTER UPDATE ON students
BEGIN
  UPDATE students SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_layouts_timestamp
AFTER UPDATE ON layout_configs
BEGIN
  UPDATE layout_configs SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ============================================
-- Insert default settings
-- ============================================
INSERT OR IGNORE INTO app_settings (key, value) VALUES
  ('animation_speed', '{"value": 1000}'),
  ('auto_save', '{"value": true}'),
  ('export_format', '{"value": "pdf"}');
