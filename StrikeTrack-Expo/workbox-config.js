module.exports = {
  globDirectory: 'dist/',
  globPatterns: ['**/*.{html,js,css,ico,png,jpg,jpeg,webp,svg,json,woff,woff2,ttf,otf}'],
  globIgnores: ['sw.js', 'sw.js.map', 'workbox-*.js', 'workbox-*.js.map'],
  swDest: 'dist/sw.js',
  clientsClaim: true,
  skipWaiting: true,
  cleanupOutdatedCaches: true,
  // SPA: serve index.html for all nav requests (e.g. /battery/123)
  navigateFallback: '/index.html',
  navigateFallbackDenylist: [/\.(js|css|png|jpg|jpeg|webp|svg|ico|json|woff|woff2|ttf|otf)$/],
  runtimeCaching: [
    {
      urlPattern: ({ request }) => request.destination === 'font',
      handler: 'CacheFirst',
      options: {
        cacheName: 'font-cache',
        expiration: {
          maxEntries: 40,
          maxAgeSeconds: 60 * 60 * 24 * 365,
        },
      },
    },
    {
      urlPattern: ({ request }) => request.destination === 'image',
      handler: 'CacheFirst',
      options: {
        cacheName: 'image-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 365,
        },
      },
    },
  ],
};
