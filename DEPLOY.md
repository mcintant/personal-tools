# Deploying Kobo Reading Analyzer

This guide shows you how to deploy the app so you can access it from your iPhone and add it to your home screen.

## Option 1: Deploy to Vercel (Recommended - Free & Easy)

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Deploy
```bash
npm run build
vercel
```

Follow the prompts. Your app will be live at a URL like `https://your-app.vercel.app`

### Step 3: Access from iPhone
1. Open Safari on your iPhone
2. Go to your Vercel URL
3. Tap the Share button
4. Tap "Add to Home Screen"
5. Name it "Kobo Reader" and tap "Add"

## Option 2: Deploy to Netlify (Free & Easy)

### Step 1: Install Netlify CLI
```bash
npm install -g netlify-cli
```

### Step 2: Build and Deploy
```bash
npm run build
netlify deploy --prod
```

Or drag and drop the `dist` folder to [netlify.com/drop](https://app.netlify.com/drop)

## Option 3: Local Network Access (For Development)

### Step 1: Find Your Computer's IP
```bash
# On macOS
ipconfig getifaddr en0
# Or
ifconfig | grep "inet " | grep -v 127.0.0.1
```

### Step 2: Update Vite Config
Update `vite.config.js`:
```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: 3000,
    open: true
  }
})
```

### Step 3: Start Dev Server
```bash
npm run dev
```

### Step 4: Access from iPhone
1. Make sure iPhone and computer are on the same WiFi
2. On iPhone, open Safari
3. Go to: `http://YOUR_IP:3000` (e.g., `http://192.168.1.100:3000`)
4. Tap Share → "Add to Home Screen"

### Step 5: For Production Build on Local Network
```bash
npm run build
npm install -g serve
serve -s dist -l 3000 --host 0.0.0.0
```

## Option 4: GitHub Pages

### Step 1: Install gh-pages
```bash
npm install --save-dev gh-pages
```

### Step 2: Update package.json
Add to scripts:
```json
"deploy": "npm run build && gh-pages -d dist"
```

### Step 3: Update vite.config.js
```javascript
export default defineConfig({
  base: '/your-repo-name/', // Replace with your GitHub repo name
  plugins: [react()],
  // ...
})
```

### Step 4: Deploy
```bash
npm run deploy
```

## Option 5: Simple HTTP Server (Local)

### Step 1: Build
```bash
npm run build
```

### Step 2: Serve
```bash
# Using Python
cd dist
python3 -m http.server 3000 --bind 0.0.0.0

# Or using Node serve
npm install -g serve
serve -s dist -l 3000 --host 0.0.0.0
```

### Step 3: Access
On iPhone, go to `http://YOUR_IP:3000`

## Adding to iPhone Home Screen

Once the app is accessible:

1. **Open Safari** on your iPhone (Chrome won't work for "Add to Home Screen")
2. **Navigate** to your app URL
3. **Tap the Share button** (square with arrow pointing up)
4. **Scroll down** and tap **"Add to Home Screen"**
5. **Customize the name** (e.g., "Kobo Reader")
6. **Tap "Add"**

The app will now appear on your home screen and open in fullscreen mode!

## Important Notes

### For Local Network Access:
- **Firewall**: Make sure your Mac's firewall allows connections on port 3000
- **Same Network**: iPhone and computer must be on the same WiFi
- **HTTPS**: Some features require HTTPS. For local dev, Safari will allow it, but for production, use Vercel/Netlify

### For Production:
- **HTTPS Required**: PWA features work best with HTTPS
- **Database File**: The SQLite file needs to be uploaded or accessible
- **File Upload**: Users can upload their own database file via the file input

## Troubleshooting

### "Add to Home Screen" not working?
- Make sure you're using Safari (not Chrome)
- The site must be served over HTTPS (or localhost for development)
- Check that `manifest.json` is accessible

### Can't access from iPhone?
- Check firewall settings
- Verify both devices are on same network
- Try using your computer's IP address instead of localhost

### Icons not showing?
- Verify icon files exist in `public/` folder
- Check that paths in `manifest.json` are correct
- Clear browser cache

## Quick Deploy Commands

```bash
# Build for production
npm run build

# Preview locally
npm run preview

# Deploy to Vercel
vercel

# Deploy to Netlify
netlify deploy --prod

# Serve locally on network
serve -s dist -l 3000 --host 0.0.0.0
```



