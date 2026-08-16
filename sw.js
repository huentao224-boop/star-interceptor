// 星际拦截机 ServiceWorker v5
// - 资源缓存优先（wasm/pck/js/png）：重复访问秒开
// - 页面文档补 COOP/COEP 头（供线程版引擎使用；无线程版无副作用）
self.addEventListener('install', () => {
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
	const req = event.request;
	if (req.method !== 'GET') {
		return;
	}
	const url = new URL(req.url);
	// 仅缓存同源资源（跨域 CDN 自带缓存）
	if (url.origin === self.location.origin && /\.(wasm|pck|js|png|woff2?)$/.test(url.pathname)) {
		event.respondWith(
			caches.open('si-v4').then(async (cache) => {
				const hit = await cache.match(req);
				if (hit) { return hit; }
				const resp = await fetch(req);
				if (resp && resp.ok) { cache.put(req, resp.clone()); }
				return resp;
			})
		);
		return;
	}
	if (req.mode !== 'navigate') {
		return;
	}
	event.respondWith(
		fetch(req).then((response) => {
			const headers = new Headers(response.headers);
			headers.set('Cross-Origin-Opener-Policy', 'same-origin');
			headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
			return new Response(response.body, {
				status: response.status,
				statusText: response.statusText,
				headers: headers,
			});
		}).catch(() => {
			return new Response('', { status: 502, statusText: 'Bad Gateway' });
		})
	);
});
