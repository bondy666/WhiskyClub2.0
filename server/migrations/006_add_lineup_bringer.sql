-- Additive, non-destructive migration for WhiskyClub 2.0.
-- Records which member is bringing each bottle in a session line-up, so the
-- Guild can see who's bringing what and avoid two people bringing the same dram.
-- Nullable so existing rows (and freestyle/host-added bottles) remain valid.
-- Safe to run multiple times.

IF COL_LENGTH('dbo.SessionWhiskies', 'BroughtByMemberId') IS NULL
  ALTER TABLE dbo.SessionWhiskies ADD BroughtByMemberId INT NULL;
GO

IF OBJECT_ID('dbo.FK_SessionWhiskies_Member', 'F') IS NULL
  ALTER TABLE dbo.SessionWhiskies
    ADD CONSTRAINT FK_SessionWhiskies_Member FOREIGN KEY (BroughtByMemberId)
      REFERENCES dbo.ClubMembers(Id);
GO
