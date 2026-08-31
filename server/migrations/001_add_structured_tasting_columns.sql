-- Additive, non-destructive migration for WhiskyClub 2.0.
-- Adds nullable columns so structured pill selections (colour, clarity, intensity,
-- aromas, sweetness, body, finish length) can be stored alongside the existing
-- free-text NoseNotes / PalateNotes / FinishNotes. Existing rows are untouched.
-- Safe to run multiple times.

IF COL_LENGTH('dbo.TastingEntries', 'AppearanceColour') IS NULL
  ALTER TABLE dbo.TastingEntries ADD AppearanceColour NVARCHAR(40) NULL;
GO
IF COL_LENGTH('dbo.TastingEntries', 'AppearanceClarity') IS NULL
  ALTER TABLE dbo.TastingEntries ADD AppearanceClarity NVARCHAR(40) NULL;
GO
IF COL_LENGTH('dbo.TastingEntries', 'AppearanceNotes') IS NULL
  ALTER TABLE dbo.TastingEntries ADD AppearanceNotes NVARCHAR(MAX) NULL;
GO
IF COL_LENGTH('dbo.TastingEntries', 'NoseIntensity') IS NULL
  ALTER TABLE dbo.TastingEntries ADD NoseIntensity NVARCHAR(40) NULL;
GO
IF COL_LENGTH('dbo.TastingEntries', 'NoseAromas') IS NULL
  ALTER TABLE dbo.TastingEntries ADD NoseAromas NVARCHAR(400) NULL;
GO
IF COL_LENGTH('dbo.TastingEntries', 'PalateSweetness') IS NULL
  ALTER TABLE dbo.TastingEntries ADD PalateSweetness NVARCHAR(40) NULL;
GO
IF COL_LENGTH('dbo.TastingEntries', 'PalateBody') IS NULL
  ALTER TABLE dbo.TastingEntries ADD PalateBody NVARCHAR(40) NULL;
GO
IF COL_LENGTH('dbo.TastingEntries', 'FinishLength') IS NULL
  ALTER TABLE dbo.TastingEntries ADD FinishLength NVARCHAR(40) NULL;
GO
IF COL_LENGTH('dbo.TastingEntries', 'OverallNotes') IS NULL
  ALTER TABLE dbo.TastingEntries ADD OverallNotes NVARCHAR(MAX) NULL;
GO
