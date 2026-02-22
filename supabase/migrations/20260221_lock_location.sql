-- Add location fields to locks for geofencing reminders
ALTER TABLE locks
  ADD COLUMN latitude DOUBLE PRECISION,
  ADD COLUMN longitude DOUBLE PRECISION,
  ADD COLUMN geofence_radius INT NOT NULL DEFAULT 100;

-- Allow 'geofence' as event source
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_source_check;
ALTER TABLE events ADD CONSTRAINT events_source_check
  CHECK (source IN ('nfc', 'qr', 'manual', 'app_clip', 'geofence'));
