const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { rateLimit } = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');

const app = express();
app.set('trust proxy', 1);

// ===== Lab 11: dokumentasi gabungan =====
// Diletakkan SEBELUM proxy (syarat lab) dan SEBELUM rate limiter:
// satu kali buka /docs memuat ~8 file, jadi refresh cepat bisa kena 429.
const DOC_SOURCES = [
  { prefix: '/product-service', url: process.env.PRODUCT_DOC_URL || 'http://localhost:3000/openapi.json' },
  { prefix: '/order-service', url: process.env.ORDER_DOC_URL || 'http://localhost:3001/openapi.json' },
];

async function buildSpec() {
  const merged = {
    openapi: '3.0.3',
    info: { title: 'Toko API (via Gateway)', version: '1.0.0' },
    servers: [{ url: '/' }], // "Try it out" memakai alamat gateway
    paths: {},
    components: { schemas: {} },
  };
  for (const s of DOC_SOURCES) {
    try {
      const spec = await fetch(s.url, { signal: AbortSignal.timeout(2000) }).then(r => r.json());
      for (const [path, ops] of Object.entries(spec.paths || {})) merged.paths[s.prefix + path] = ops;
      Object.assign(merged.components.schemas, (spec.components || {}).schemas);
    } catch (e) {
      console.warn('dokumentasi gagal diambil dari', s.url);
    }
  }
  return merged;
}

app.get('/openapi.json', async (req, res) => res.json(await buildSpec()));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(null, { swaggerOptions: { url: '/openapi.json' } }));
// ===== akhir bagian lab 11 =====

// Rate limiting: maks. 20 request / 10 detik per alamat IP
app.use(rateLimit({
  windowMs: 10 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
}));


// /product-service/* -> product-service (port 3000)
app.use(createProxyMiddleware({
  pathFilter: '/product-service',
  target: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3000',
  changeOrigin: true,
  pathRewrite: { '^/product-service': '' },
}));

// /order-service/* -> order-service (port 3001)
app.use(createProxyMiddleware({
  pathFilter: '/order-service',
  target: process.env.ORDER_SERVICE_URL || 'http://localhost:3001',
  changeOrigin: true,
  pathRewrite: { '^/order-service': '' },
}));

app.use((req, res) => res.status(404).json({ error: 'Route tidak ditemukan' }));

app.listen(process.env.PORT || 8080, () => console.log('Gateway berjalan di :8080'));