const express = require('express');
const amqp = require('amqplib');
const app = express();
app.use(express.json());

const PRODUCT_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3000';
const orders = []; // data milik order-service. TIDAK ada array products di sini.

// ===== Lab 10: koneksi ke RabbitMQ & publisher event =====
const AMQP_URL = process.env.AMQP_URL || 'amqp://localhost';
let channel = null;

async function connectQueue() {
  try {
    const conn = await amqp.connect(AMQP_URL);
    conn.on('error', () => { });
    conn.on('close', () => { channel = null; setTimeout(connectQueue, 3000); });
    channel = await conn.createChannel();
    await channel.assertExchange('orders', 'fanout', { durable: true });
    console.log('terhubung ke RabbitMQ');
  } catch (e) {
    console.error('RabbitMQ belum tersedia, coba lagi dalam 3 detik');
    setTimeout(connectQueue, 3000);
  }
}

function publishOrderCreated(order) {
  if (!channel) {
    console.warn('channel tidak tersedia, event TIDAK terkirim:', order.id);
    return false;
  }
  const body = Buffer.from(JSON.stringify({ type: 'order.created', data: order }));
  return channel.publish('orders', '', body, {
    persistent: true,
    contentType: 'application/json',
    messageId: `order-${order.id}`,
  });
}
// ===== akhir bagian lab 10 =====

app.post('/orders', async (req, res) => {
  const { productId, qty } = req.body || {};
  if (!Number.isInteger(productId) || !Number.isInteger(qty) || qty < 1)
    return res.status(400).json({ error: 'productId dan qty harus bilangan bulat > 0' });

  let resp;
  try {
    // Minta product-service mengurangi stok, dengan timeout 2 detik (sinkron, dari lab 09)
    resp = await fetch(`${PRODUCT_URL}/products/${productId}/reserve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qty }),
      signal: AbortSignal.timeout(2000),
    });
  } catch (err) {
    return res.status(503).json({ error: 'product-service tidak tersedia, coba lagi nanti' });
  }

  const data = await resp.json();
  if (!resp.ok) return res.status(resp.status).json(data); // 404 / 409 diteruskan apa adanya

  const order = {
    id: orders.length + 1, productId, productName: data.name, qty,
    total: data.price * qty, createdAt: new Date().toISOString()
  };
  orders.push(order);
  publishOrderCreated(order); // lab 10: terbitkan event, TIDAK menunggu consumer
  res.status(201).json(order);
});

app.get('/orders', (req, res) => res.json(orders));

connectQueue(); // lab 10: sambung ke RabbitMQ sekali saat start
app.listen(process.env.PORT || 3001, () => console.log('order-service di :3001'));