const express = require('express');
const app = express();
app.use(express.json());

// Data milik product-service (pemilik tunggal data produk & stok)
const products = [
  { id: 1, name: 'Keyboard Mekanik', price: 450000, stock: 10 },
  { id: 2, name: 'Mouse Wireless', price: 175000, stock: 25 },
  { id: 3, name: 'Monitor 24 inci', price: 1850000, stock: 5 },
];

app.get('/products', (req, res) => res.json(products));

app.get('/products/:id', (req, res) => {
  const p = products.find(x => x.id === Number(req.params.id));
  p ? res.json(p) : res.status(404).json({ error: 'Produk tidak ditemukan' });
});

// Endpoint baru: dipanggil service lain untuk mengurangi stok
app.post('/products/:id/reserve', (req, res) => {
  const p = products.find(x => x.id === Number(req.params.id));
  const qty = (req.body || {}).qty;
  if (!p) return res.status(404).json({ error: 'Produk tidak ditemukan' });
  if (!Number.isInteger(qty) || qty < 1) return res.status(400).json({ error: 'qty tidak valid' });
  if (p.stock < qty) return res.status(409).json({ error: 'Stok tidak cukup' });
  p.stock -= qty;
  res.json(p);
});

app.listen(process.env.PORT || 3000, () => console.log('product-service di :3000'));
