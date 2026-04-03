module.exports = {
  globDirectory: 'dist/',
  globPatterns: ['**/*.{html,js,css,ico,png,json,woff2}'],
  swDest: 'dist/sw.js',
  clientsClaim: true,
  skipWaiting: true,
  // SPA: serve index.html for all nav requests (e.g. /battery/123)
  navigateFallback: '/index.html',
  navigateFallbackDenylist: [/\.(js|css|png|jpg|ico|json|woff2)$/],
};
