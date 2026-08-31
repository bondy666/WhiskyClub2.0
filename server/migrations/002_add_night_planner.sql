-- Additive, non-destructive migration for WhiskyClub 2.0 "Plan the Next Night".
-- Adds date-proposal + per-member voting so the Guild can propose several nights
-- and vote for the ones they can make. Safe to run multiple times.

IF OBJECT_ID('dbo.ProposedNights', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.ProposedNights (
    Id                 INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ProposedNights PRIMARY KEY,
    NightDate          DATE NOT NULL,
    ProposedByMemberId INT NULL,
    CreatedAt          DATETIME2 NOT NULL CONSTRAINT DF_ProposedNights_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_ProposedNights_Date UNIQUE (NightDate)
  );
END
GO

IF OBJECT_ID('dbo.NightVotes', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.NightVotes (
    Id              INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_NightVotes PRIMARY KEY,
    ProposedNightId INT NOT NULL,
    ClubMemberId    INT NOT NULL,
    CreatedAt       DATETIME2 NOT NULL CONSTRAINT DF_NightVotes_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_NightVotes_Night FOREIGN KEY (ProposedNightId)
      REFERENCES dbo.ProposedNights(Id) ON DELETE CASCADE,
    CONSTRAINT UQ_NightVotes_Member UNIQUE (ProposedNightId, ClubMemberId)
  );
END
GO
