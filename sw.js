/* ══════════════════════════════════════════════════════════
   VLADJIA MOTO · service worker
   鐵律：HTML 永遠走網路，只有圖／音／字型進快取。
   這樣改完 index.html 推上去，重開就是新版，不會舊版還魂。
   ══════════════════════════════════════════════════════════ */

const VER   = '20260813-1';          // 想強制清快取就改這個數字
const STORE = 'moto-assets-' + VER;

/* 只有這些副檔名會被留下來 */
const KEEP = /\.(png|jpg|jpeg|webp|svg|mp3|wav|otf|ttf|woff2?)$/i;

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(n => n !== STORE).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

/* 對暗號：頁面問版本，SW 報自己的號 */
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'VER') {
    e.source && e.source.postMessage({ type: 'VER', ver: VER });
  }
  if (e.data && e.data.type === 'PURGE') {
    caches.keys().then(ns => Promise.all(ns.map(n => caches.delete(n))));
  }
});

self.addEventListener('fetch', e => {
  const req = e.request;

  /* 只管自己家的 GET，其他一律放行（GAS iframe 千萬別碰）*/
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  /* 頁面本身：純網路，不留任何副本 */
  if (req.mode === 'navigate' || /\.html?$/i.test(url.pathname)) {
    e.respondWith(fetch(req, { cache: 'no-store' }).catch(() => caches.match(req)));
    return;
  }

  /* 素材：先給快取，同時背景更新 */
  if (KEEP.test(url.pathname)) {
    e.respondWith((async () => {
      const c = await caches.open(STORE);
      const hit = await c.match(req);
      const net = fetch(req).then(res => {
        if (res && res.ok) c.put(req, res.clone());
        return res;
      }).catch(() => null);
      return hit || net || new Response('', { status: 504 });
    })());
    return;
  }

  /* 其他（manifest、sw 自己…）：走網路 */
});
