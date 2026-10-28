const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { rateLimit } = require('express-rate-limit');

const app = express();
app.set('trust proxy', 1);

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
