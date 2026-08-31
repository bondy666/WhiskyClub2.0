-- Photos: whisky bottle images and session memory photos, stored as data URLs.
-- Widen Whiskies.ImageUrl to hold base64 data URLs, and add a session photo column.

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Whiskies') AND name = 'ImageUrl')
  ALTER TABLE dbo.Whiskies ALTER COLUMN ImageUrl NVARCHAR(MAX) NULL;

IF COL_LENGTH('dbo.TastingSessions', 'PhotoUrl') IS NULL
  ALTER TABLE dbo.TastingSessions ADD PhotoUrl NVARCHAR(MAX) NULL;
