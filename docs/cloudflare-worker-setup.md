# Cloudflare Worker + D1 setup (what you do yourself)

The repo already has the Worker code and GitHub Actions workflow. You only need to do these steps once.

---

## 1. Cloudflare account

- Sign up at [cloudflare.com](https://www.cloudflare.com) if you don’t have an account.

---

## 2. Create the D1 database

From your machine, in the repo root:

```bash
cd worker
npm install
npx wrangler d1 create kobo-db
```

Copy the **database_id** from the output (UUID). It looks like: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`.

---

## 3. Put the database ID in the project

Edit **`worker/wrangler.toml`** and replace the placeholder:

```toml
database_id = "REPLACE_WITH_YOUR_D1_DATABASE_ID"
```

with your actual id, e.g.:

```toml
database_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

Save the file.

---

## 4. Run the DB schema once (create table)

Still in `worker/`:

```bash
npx wrangler d1 execute kobo-db --remote --file=./schema.sql
```

You’ll be prompted to log in to Cloudflare in the browser if you haven’t already. After this, the `csv_uploads` table exists in D1.

### (Optional) Custom songs DB for Jazz Standards

To enable "Add custom song" in the Jazz Standards tab:

```bash
npx wrangler d1 create custom-songs
```

Copy the **database_id** and in **`worker/wrangler.toml`** set the second D1 database: replace `REPLACE_WITH_CUSTOM_SONGS_DATABASE_ID` with that id. Then run:

```bash
npx wrangler d1 execute custom-songs --remote --file=./schema-custom-songs.sql
```

Redeploy the Worker. If you skip this, the Worker still works; custom songs will just be empty.

---

## Local development (Worker + D1 on your machine)

Yes, this all works locally. D1 has two modes:

| Target | Flag | When to use |
|--------|------|-------------|
| **Remote** (Cloudflare) | `--remote` | Production; what the deployed Worker uses. |
| **Local** (SQLite on disk) | `--local` | When you run `wrangler dev`; no Cloudflare needed. |

**Run the Worker locally**

1. In `worker/`, install and run migrations **for local** (creates tables in a local SQLite DB):

   ```bash
   cd worker
   npm install
   npm run db:migrate:local
   # If you use custom songs:
   npm run db:migrate:songs:local
   ```

   Or without npm scripts:

   ```bash
   npx wrangler d1 execute kobo-db --local --file=./schema.sql
   npx wrangler d1 execute custom-songs --local --file=./schema-custom-songs.sql   # optional
   ```

2. Start the Worker: `npm run dev`. It listens at **http://localhost:8787** by default.

3. Point the frontend at the local Worker. In `.env` or `.env.local` set:

   `VITE_CLOUDFLARE_WORKER_URL=http://localhost:8787`

4. Start the app (`npm run dev` in the repo root). Workouts and Jazz Standards will call the local Worker; data is stored in the local D1 SQLite file (under `worker/.wrangler/` or similar).

**Summary:** Use `--local` when running `wrangler dev`; use `--remote` for the real Cloudflare DB and for CI/deploy. Run the same schema files for both; the only difference is the flag.

---

## 5. Create a Cloudflare API token

The **“Edit Cloudflare Workers”** template does **not** include permission to run D1 migrations. You need a **custom** token with both Workers and D1:

1. In [Cloudflare Dashboard](https://dash.cloudflare.com): **My Profile** (top right) → **API Tokens** → **Create Token**.
2. Click **“Create Custom Token”**.
3. Token name: e.g. `GitHub Actions kobo-worker`.
4. Permissions: set **Account** scope and add:
   - **Workers Scripts** → Edit  
   - **D1** → Edit  
   (Both are required: Workers for deploy, D1 for `wrangler d1 execute` in the workflow.)
5. Account resources: **Include** → **Your account**.
6. Create the token and copy it. You won’t see it again.

If the token only has Workers permissions, the “Run D1 migration” step will fail with `Authentication error [code: 10000]` on the D1 import/execute API.

---

## 6. Get your Account ID

The Account ID is a 32-character hex string (e.g. `a1b2c3d4e5f6789012345678abcdef01`) that identifies your Cloudflare account. You need it so GitHub Actions can deploy to the right account.

**Where to find it:**

1. Log in at [dash.cloudflare.com](https://dash.cloudflare.com).
2. Go to **Workers & Pages** in the left sidebar (under “Workers & Pages”).
3. On the Workers & Pages overview, look at the **right sidebar**. Under the “Account” or “Overview” area you’ll see **Account ID** with the value next to it. Click the copy icon or select and copy it.

**If you don’t see Workers & Pages:** On the main dashboard, click any **website/domain** you have (or “Add a site” and use the free tier). On that domain’s overview page, the **right sidebar** shows **Account ID** — same value for your whole account. You can also find it on the **API Tokens** page (My Profile → API Tokens), where it appears as “Account ID” next to your account name.

---

## 7. Add GitHub secrets

In your GitHub repo: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.

Add two secrets:

| Name                     | Value              |
|--------------------------|--------------------|
| `CLOUDFLARE_API_TOKEN`   | (the token from 5) |
| `CLOUDFLARE_ACCOUNT_ID`  | (the Account ID from 6) |

---

## 8. Deploy via GitHub Actions

- Push your branch (including the `worker/` folder and the updated `wrangler.toml`) to `main`, or
- Run the workflow manually: **Actions** → **Deploy Worker (Cloudflare)** → **Run workflow**.

After a successful run, your Worker is live. The URL will be like:

`https://kobo-api.<your-subdomain>.workers.dev`

Use that as the base URL for your app (e.g. `https://kobo-api.xxx.workers.dev/api/uploads`).

---

## 9. (Optional) Call the API from your frontend

From your GitHub Pages app you can:

- **List uploads:** `GET https://kobo-api.<subdomain>.workers.dev/api/uploads`
- **Get one CSV:** `GET https://kobo-api.<subdomain>.workers.dev/api/uploads/:id`
- **Upload CSV:** `POST https://kobo-api.<subdomain>.workers.dev/api/uploads` with body = raw CSV text, and optional header `X-Upload-Name: myfile.csv` or query `?name=myfile.csv`

If you want, you can put the Worker URL in `.env` as e.g. `VITE_CLOUDFLARE_WORKER_URL` and use it in the app.

---

## Summary checklist

- [ ] Cloudflare account
- [ ] `cd worker && npm install && npx wrangler d1 create kobo-db` → copy `database_id`
- [ ] Replace `REPLACE_WITH_YOUR_D1_DATABASE_ID` in `worker/wrangler.toml`
- [ ] `npx wrangler d1 execute kobo-db --remote --file=./schema.sql`
- [ ] Create API token (**custom**: Workers Scripts Edit + **D1 Edit**)
- [ ] Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` to GitHub Actions secrets
- [ ] Push to `main` or run **Deploy Worker (Cloudflare)** workflow
- [ ] (Optional) For Jazz custom songs: create custom-songs D1, add id to wrangler.toml, run schema-custom-songs.sql
