-- Additive, non-destructive migration for WhiskyClub 2.0.
--  * SessionWhiskies: an explicit line-up so whiskies can be added to a session
--    up front (tagged as belonging to that session) before anyone tastes them.
--  * SessionPhotos: multiple memory photos per session (gallery), replacing the
--    single TastingSessions.PhotoUrl column while keeping it for back-compat.
-- Safe to run multiple times.

IF OBJECT_ID('dbo.SessionWhiskies', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.SessionWhiskies (
    Id               INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_SessionWhiskies PRIMARY KEY,
    TastingSessionId INT NOT NULL,
    WhiskyId         INT NOT NULL,
    CreatedAt        DATETIME2 NOT NULL CONSTRAINT DF_SessionWhiskies_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_SessionWhiskies UNIQUE (TastingSessionId, WhiskyId),
    CONSTRAINT FK_SessionWhiskies_Session FOREIGN KEY (TastingSessionId)
      REFERENCES dbo.TastingSessions(Id) ON DELETE CASCADE,
    CONSTRAINT FK_SessionWhiskies_Whisky FOREIGN KEY (WhiskyId)
      REFERENCES dbo.Whiskies(Id) ON DELETE CASCADE
  );
END
GO

IF OBJECT_ID('dbo.SessionPhotos', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.SessionPhotos (
    Id               INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_SessionPhotos PRIMARY KEY,
    TastingSessionId INT NOT NULL,
    ImageUrl         NVARCHAR(MAX) NOT NULL,
    Caption          NVARCHAR(255) NULL,
    CreatedAt        DATETIME2 NOT NULL CONSTRAINT DF_SessionPhotos_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_SessionPhotos_Session FOREIGN KEY (TastingSessionId)
      REFERENCES dbo.TastingSessions(Id) ON DELETE CASCADE
  );
END
GO

-- Ensure ImageUrl is wide enough to hold base64 data URLs.
IF COL_LENGTH('dbo.SessionPhotos', 'ImageUrl') IS NOT NULL
  ALTER TABLE dbo.SessionPhotos ALTER COLUMN ImageUrl NVARCHAR(MAX) NOT NULL;
GO

-- Carry any existing single session photo into the new gallery table.
-- Dynamic SQL so the PhotoUrl reference only compiles when the column exists.
IF COL_LENGTH('dbo.TastingSessions', 'PhotoUrl') IS NOT NULL
  EXEC sp_executesql N'
    INSERT INTO dbo.SessionPhotos (TastingSessionId, ImageUrl)
    SELECT s.Id, s.PhotoUrl
    FROM dbo.TastingSessions s
    WHERE s.PhotoUrl IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM dbo.SessionPhotos p WHERE p.TastingSessionId = s.Id);';
GO
