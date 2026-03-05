# Quick Start: Access from iPhone

## Easiest Method - Local Network (Development)

### Step 1: Find Your Mac's IP Address
```bash
ipconfig getifaddr en0
```
This will show something like `192.168.1.100`

### Step 2: Start the Dev Server
```bash
npm run dev
```

The server is now accessible on your network!

### Step 3: Access from iPhone

1. **Make sure iPhone and Mac are on the same WiFi**
2. **Open Safari** on your iPhone (not Chrome - Safari is required for "Add to Home Screen")
3. **Go to:** `http://YOUR_IP:3000` (replace YOUR_IP with the IP from Step 1)
   - Example: `http://192.168.1.100:3000`

### Step 4: Add to Home Screen

1. Tap the **Share button** (square with arrow) at the bottom
2. Scroll down and tap **"Add to Home Screen"**
3. Customize the name (e.g., "Kobo Reader")
4. Tap **"Add"**

Done! The app is now on your home screen and will open in fullscreen mode.

## For Production (Deploy Online)

### Option A: Vercel (Recommended - Free)

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Build and Deploy:**
   ```bash
   npm run build
   vercel
   ```

3. **Follow prompts** - your app will be live at a URL like `https://your-app.vercel.app`

4. **Access from iPhone:**
   - Open Safari
   - Go to your Vercel URL
   - Share → Add to Home Screen

### Option B: Netlify (Free)

1. **Build:**
   ```bash
   npm run build
   ```

2. **Drag and drop** the `dist` folder to [netlify.com/drop](https://app.netlify.com/drop)

3. **Access from iPhone** using the provided URL

## Troubleshooting

### Can't access from iPhone?
- ✅ Check both devices are on same WiFi
- ✅ Check Mac firewall isn't blocking port 3000
- ✅ Try using IP address instead of localhost
- ✅ Make sure dev server shows `Local: http://0.0.0.0:3000`

### "Add to Home Screen" not showing?
- ✅ Must use Safari (not Chrome)
- ✅ Site must be served (not just file://)
- ✅ For production, HTTPS is recommended

### Icons not showing?
- ✅ Icons are in `public/` folder
- ✅ Clear Safari cache: Settings → Safari → Clear History and Website Data

## File Upload on iPhone

Since the database file won't be automatically loaded from your Mac, you can:

1. **Upload via iPhone:**
   - Use the file input button in the app
   - Select the database file from Files app or iCloud

2. **Or sync via iCloud:**
   - Put database in iCloud Drive
   - Access from iPhone Files app
   - Upload through the app's file input

## Next Steps

- See `DEPLOY.md` for detailed deployment options
- Customize icons in `public/icon-*.png`
- Update `public/manifest.json` for app name/colors



