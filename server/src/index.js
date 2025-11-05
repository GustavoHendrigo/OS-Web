import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { allQuery, getQuery } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Usuário e senha são obrigatórios.' });
  }

  try {
    const user = await getQuery('SELECT id, username, role, name FROM users WHERE username = ? AND password = ?', [
      username,
      password
    ]);

    if (!user) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    res.json({
      id: user.id,
      name: user.name,
      role: user.role,
      token: Buffer.from(`${user.id}:${user.role}`).toString('base64')
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao autenticar usuário.' });
  }
});

app.get('/api/orders', async (req, res) => {
  const { search, status } = req.query;
  const filters = [];
  const params = [];

  if (search) {
    filters.push('(o.code LIKE ? OR o.description LIKE ? OR o.vehicle LIKE ? OR c.name LIKE ?)');
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }
  if (status) {
    filters.push('o.status = ?');
    params.push(status);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  try {
    const orders = await allQuery(
      `SELECT o.*, c.name as clientName
       FROM orders o
       LEFT JOIN clients c ON c.id = o.clientId
       ${whereClause}
       ORDER BY datetime(o.createdAt) DESC`,
      params
    );

    const orderIds = orders.map((order) => order.id);
    let labor = [];
    let parts = [];
    if (orderIds.length) {
      const placeholders = orderIds.map(() => '?').join(',');
      labor = await allQuery(`SELECT * FROM order_labor WHERE orderId IN (${placeholders})`, orderIds);
      parts = await allQuery(`SELECT * FROM order_parts WHERE orderId IN (${placeholders})`, orderIds);
    }

    const ordersWithDetails = orders.map((order) => ({
      ...order,
      approvedByClient: Boolean(order.approvedByClient),
      labor: labor.filter((item) => item.orderId === order.id).map((item) => ({
        id: item.id,
        description: item.description,
        hours: item.hours,
        rate: item.rate
      })),
      parts: parts.filter((item) => item.orderId === order.id).map((item) => ({
        id: item.id,
        inventoryId: item.inventoryId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      })),
      summary: {
        laborTotal: order.laborTotal,
        partsTotal: order.partsTotal,
        additionalFees: order.additionalFees,
        discounts: order.discounts,
        total: order.total
      }
    }));

    res.json(ordersWithDetails);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao carregar ordens.' });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const order = await getQuery(
      `SELECT o.*, c.name as clientName
       FROM orders o
       LEFT JOIN clients c ON c.id = o.clientId
       WHERE o.id = ?`,
      [id]
    );

    if (!order) {
      return res.status(404).json({ message: 'Ordem não encontrada.' });
    }

    const labor = await allQuery('SELECT * FROM order_labor WHERE orderId = ?', [id]);
    const parts = await allQuery('SELECT * FROM order_parts WHERE orderId = ?', [id]);

    res.json({
      ...order,
      approvedByClient: Boolean(order.approvedByClient),
      labor: labor.map((item) => ({
        id: item.id,
        description: item.description,
        hours: item.hours,
        rate: item.rate
      })),
      parts: parts.map((item) => ({
        id: item.id,
        inventoryId: item.inventoryId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      })),
      summary: {
        laborTotal: order.laborTotal,
        partsTotal: order.partsTotal,
        additionalFees: order.additionalFees,
        discounts: order.discounts,
        total: order.total
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao carregar detalhes da ordem.' });
  }
});

app.get('/api/clients', async (req, res) => {
  const { search } = req.query;
  const filters = [];
  const params = [];

  if (search) {
    filters.push('(name LIKE ? OR email LIKE ? OR phone LIKE ? OR vehicles LIKE ? OR document LIKE ?)');
    const term = `%${search}%`;
    params.push(term, term, term, term, term);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  try {
    const clients = await allQuery(`SELECT * FROM clients ${whereClause} ORDER BY name ASC`, params);
    res.json(clients);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao carregar clientes.' });
  }
});

app.get('/api/inventory', async (req, res) => {
  const { search } = req.query;
  const filters = [];
  const params = [];

  if (search) {
    filters.push('(description LIKE ? OR code LIKE ? OR supplier LIKE ? OR location LIKE ?)');
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  try {
    const items = await allQuery(`SELECT * FROM inventory ${whereClause} ORDER BY description ASC`, params);
    res.json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao carregar estoque.' });
  }
});

app.use(express.static(path.join(__dirname, '../public')));

app.listen(port, () => {
  console.log(`API de oficina mecânica executando na porta ${port}`);
});
