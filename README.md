# 🥃 Ealing Whisky Guild 2.0

A slick, mobile-first PWA for tasting, scoring and sharing drams — rebuilt for polish
and one-tap ease of use.

- **client/** — React + Vite + TypeScript + Tailwind v4 PWA
- **server/** — Express + TypeScript API (Azure SQL `whiskyclubdb`, with a seeded
  in-memory fallback so it runs anywhere)

## Highlights

- **Guided tasting flow** — Appearance → Nose → Palate → Finish → Score, entirely with
  single-tap pill buttons. Log a full tasting in seconds.
- **Warm, dark whisky-bar theme** with gold accents, Fraunces display type and a bottom
  tab bar + floating "Taste a dram" action.
- **Dashboard** with top whisky, most active member, club stats and recent sessions.
- **WhatsApp poll** — one tap opens WhatsApp with a pre-filled night-planning poll
  (`wa.me` deep link, no API needed).
- **Azure EasyAuth** sign-in with Microsoft & Google, matching the club's other apps.
- Installable PWA with offline shell.

## Run locally

From the repo root:

```bash
npm install            # installs concurrently
npm --prefix server install
npm --prefix client install
npm run dev            # runs API (4000) + client (5173) together
```

Then open http://localhost:5173. In local dev, `DEV_AUTH=true` signs you in
automatically as a demo member so you can click straight through.

You can also run each side on its own:

```bash
npm --prefix server run dev   # http://localhost:4000
npm --prefix client run dev   # http://localhost:5173 (proxies /api and /.auth to 4000)
```

## Connecting the real `whiskyclubdb` (Azure SQL)

1. Create the tables once:

   ```bash
   # using sqlcmd, Azure Data Studio, or the VS Code MSSQL extension
   sqlcmd -S <server>.database.windows.net -d whiskyclubdb -U <user> -P <pwd> -i server/schema.sql
   ```

2. Add connection settings to `server/.env` (copy from `.env.example`):

   ```
   SQL_CONNECTION_STRING=Server=tcp:<server>.database.windows.net,1433;Database=whiskyclubdb;User ID=<user>;Password=<pwd>;Encrypt=true
   # or the individual SQL_SERVER / SQL_DATABASE / SQL_USER / SQL_PASSWORD vars
   DEV_AUTH=false
   ```

The server automatically switches from the in-memory store to Azure SQL when SQL
settings are present, and falls back to in-memory if the connection fails.

## Deploying to Azure App Service

1. Build both apps: `npm run build` (client → `client/dist`, server → `server/dist`).
2. Deploy the repo; start command: `npm start` (serves the API and the built client).
3. Configure **App Service Authentication (EasyAuth)** with the Microsoft (AAD) and
   Google identity providers. The server reads the `x-ms-client-principal` header and
   exposes `/.auth/me`, so no code changes are needed.
4. Set the `SQL_*` app settings for `whiskyclubdb`.

## Tasting note options

Defined in one place — `client/src/data/tastingOptions.ts`:

| Section | Choices |
| --- | --- |
| Appearance · Colour | Pale, Golden, Amber, Copper, Mahogany |
| Appearance · Clarity | Crystal Clear, Hazy, Cloudy |
| Nose · Intensity | Light, Medium, Pronounced, Powerful |
| Nose · Aromas (multi) | Fruit, Floral, Honey, Vanilla, Smoke, Spice, Oak |
| Palate · Sweetness | Bone Dry, Dry, Medium, Sweet |
| Palate · Body | Light, Medium, Full, Oily |
| Finish · Length | Short, Medium, Long, Very Long, Endless |
| Score | 0–10 (½ steps) + freestyle notes |

Every section also has an optional freestyle note.
