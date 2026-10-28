const BASE = process.env.BASE_URL || 'http://localhost:8080';
const json = { 'Content-Type': 'application/json' };

(async () => {
  const list = await fetch(`${BASE}/product-service/products`).then(r => r.json());
  console.log('jumlah produk:', list.length);

  const o = await fetch(`${BASE}/order-service/orders`, {
    method: 'POST', headers: json, body: JSON.stringify({ productId: 1, qty: 2 }),
  });
  console.log('buat order:', o.status, await o.json());

  const p = await fetch(`${BASE}/product-service/products/1`).then(r => r.json());
  console.log('stok produk 1 sekarang:', p.stock);
})();
