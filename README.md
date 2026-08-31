# 🥃 Ealing Whisky Guild 2.0

A slick, mobile-first PWA for tasting, scoring and sharing drams — rebuilt for polish
and one-tap ease of use.

- **client/** — React + Vite + TypeScript + Tailwind v4 PWA
- **server/** — Express + TypeScript API (Azure SQL `whiskyclubdb`, with a seeded
  in-memory fallback so it runs anywhere)

## Highlights

- **Six-step guided tasting flow** — Bottle → Appearance → Nose → Palate → Finish → Score,
  entirely with single-tap pill buttons. Log a full tasting in seconds.
- **Bottle appreciation step** — rate shelf presence and bottle aesthetic before the pour,
  so the full experience is captured from the first impression.
- **Expanded colour & clarity palette** — 14 nuanced colour shades (Water White → Deep Treacle)
  each with a colour swatch, and 7 clarity descriptors.
- **Aroma emoji** — every aroma pill now carries a matching emoji for at-a-glance character.
- **Whisky photos** — add a bottle photo when creating or editing a whisky (compressed
  client-side to a JPEG data URL; no separate blob storage required). Falls back to a 🥃
  tumbler emoji everywhere a photo is absent.
- **Edit whiskies** — tap the pencil icon on any whisky detail page to update its name,
  distillery, region, age, ABV or photo.
- **Ad-hoc tastings** — log a personal dram outside of a club session from the dedicated
  tab; only the owner can delete their own notes.
- **Plan-a-Night voting** — members vote on proposed session dates directly in the app;
  vote counts and voter lists are shown in real time.
- **Session photo gallery** — sessions can carry multiple photos, shown as a thumbnail
  carousel on the session detail page.
- **Member avatars** — animated gradient avatars on the Members page, with an inline
  add-member form.
- **Score dial** — a circular arc component renders each member's score visually on whisky
  and session detail pages.
- **Warm, dark whisky-bar theme** with gold accents, Fraunces display type and a bottom
  tab bar + floating "Taste a dram" action.
- **Dashboard** with top whisky, most active member, club stats and recent sessions.
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
| Bottle · Shelf Presence | Wallflower, Understated, Handsome, Striking, Showstopper |
| Bottle · Aesthetic (multi) | Timeless Elegance, Regal & Ornate, Sleek Minimalism, Rustic Charm, Vintage Apothecary, Bold & Modern, Whimsical Flourish, Understated Luxury |
| Appearance · Colour | Water White, Pale Straw, White Wine, Pale Gold, Golden, Honeyed, Old Gold, Amber, Burnished Copper, Tawny, Chestnut, Russet, Mahogany, Deep Treacle |
| Appearance · Clarity | Star-Bright, Crystal Clear, Gin-Clear, Limpid, Faintly Veiled, Hazy, Cloudy |
| Nose · Intensity | Light, Medium, Pronounced, Powerful |
| Nose · Aromas (multi) | Fruit 🍑, Floral 🌸, Honey 🍯, Vanilla 🍦, Smoke 💨, Spice 🌶️, Oak 🪵, Butter 🧈, Toast 🍞 |
| Palate · Sweetness | Bone Dry, Dry, Medium, Sweet |
| Palate · Body | Light, Medium, Full, Oily |
| Finish · Length | Short, Medium, Long, Very Long, Endless |
| Score | 0–10 (½ steps) + freestyle notes |

Every section also has an optional freestyle note.
