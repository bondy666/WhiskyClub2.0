-- Additive, non-destructive migration for WhiskyClub 2.0.
-- Adds nullable columns to capture the drinker's take on the bottle's aesthetics:
-- shelf presence, a comma-joined list of style descriptors, and a freestyle note.
-- Existing rows are untouched. Safe to run multiple times.

IF COL_LENGTH('dbo.TastingEntries', 'BottlePresence') IS NULL
  ALTER TABLE dbo.TastingEntries ADD BottlePresence NVARCHAR(40) NULL;
GO
IF COL_LENGTH('dbo.TastingEntries', 'BottleStyle') IS NULL
  ALTER TABLE dbo.TastingEntries ADD BottleStyle NVARCHAR(400) NULL;
GO
IF COL_LENGTH('dbo.TastingEntries', 'BottleNotes') IS NULL
  ALTER TABLE dbo.TastingEntries ADD BottleNotes NVARCHAR(MAX) NULL;
GO
