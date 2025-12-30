-- ============================================
-- Additional indexes for performance
-- ============================================

-- Composite index for student queries
CREATE INDEX IF NOT EXISTS idx_students_class_gender ON students(class_name, gender);
CREATE INDEX IF NOT EXISTS idx_students_grade_class ON students(grade, class_name);

-- Index for student search
CREATE INDEX IF NOT EXISTS idx_students_name ON students(name COLLATE NOCASE);
