RECALL PWA - QUICK START

Files:
- index.html
- style.css
- script.js
- manifest.json
- sw.js
- icons/icon-192.png and icon-512.png

IMPORTANT:
A service worker does not work when you double-click index.html (file://).
Run it through VS Code Live Server or another local web server.

VS Code steps:
1. Open this Recall-PWA folder in VS Code.
2. Install/enable Live Server if needed.
3. Right-click index.html > Open with Live Server.
4. Keep the app open once while online/local server is running so the service worker can cache the app files.
5. In Chrome, use the install icon in the address bar or the app's Install app button if it appears.
6. After the first successful load, the app shell can open offline. Notes are stored in IndexedDB for this browser/origin.

For GitHub Pages, upload all files and folders while keeping their paths unchanged. HTTPS hosting supports PWA installation.

Note: Notes are stored on this device/browser only. Export a JSON backup regularly.
