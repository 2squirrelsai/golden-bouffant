# Golden Bouffant

Static Phaser 3 game. Deploy the folder contents to Netlify (or any static host).

## After every deploy — clear cache

Browsers often keep old JS. If you see a **black screen** or missing music after an update:

### Computer
1. Open the game URL
2. **Hard refresh**
   - **Mac:** `Cmd + Shift + R`
   - **Windows / Linux:** `Ctrl + Shift + R` or `Ctrl + F5`
3. Or DevTools (F12) → Network → check **Disable cache** → refresh

### iPhone Safari
1. Settings → Safari → **Clear History and Website Data**  
   (or: aA menu → Website Settings → clear for this site if available)
2. Close the tab fully and reopen the URL
3. Optional: Settings → Safari → Advanced → Website Data → remove your Netlify site

### Confirm you have the new build
Open the browser console. You should see:
```
[Boot] GBLog ready, build 20260805d
```
If the build number is older, cache is still serving the previous files.

## Local run
```bash
cd golden-bouffant
python3 -m http.server 8080
# open http://localhost:8080
```
