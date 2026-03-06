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

---

## 5. Create a Cloudflare API token

1. In [Cloudflare Dashboard](https://dash.cloudflare.com): **My Profile** (top right) → **API Tokens** → **Create Token**.
2. Use the **“Edit Cloudflare Workers”** template (or custom with **Workers Scripts: Edit** and **D1: Edit**).
3. Create the token and copy it. You won’t see it again.

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
- [ ] Create API token (Workers + D1 edit)
- [ ] Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` to GitHub Actions secrets
- [ ] Push to `main` or run **Deploy Worker (Cloudflare)** workflow
