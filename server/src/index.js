import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { allQuery, getQuery, runQuery } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;
const staticAssetsPath = path.resolve(__dirname, '../public');

const allowedOrigins = (process.env.CLIENT_ORIGIN ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = allowedOrigins.length
  ? {
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error('Origin not allowed by CORS'));
      }
    }
  : undefined;

app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

async function initializeDatabase() {
  await runQuery('PRAGMA foreign_keys = ON');

  await runQuery(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      document TEXT,
      vehicles TEXT,
      notes TEXT
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL,
      description TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      minQuantity INTEGER NOT NULL,
      unitCost REAL NOT NULL,
      location TEXT,
      supplier TEXT
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL,
      clientId INTEGER NOT NULL,
      vehicle TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      promisedDate TEXT,
      laborTotal REAL NOT NULL,
      partsTotal REAL NOT NULL,
      discounts REAL NOT NULL,
      additionalFees REAL NOT NULL,
      total REAL NOT NULL,
      notes TEXT,
      approvedByClient INTEGER DEFAULT 0,
      FOREIGN KEY (clientId) REFERENCES clients(id)
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS order_labor (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orderId INTEGER NOT NULL,
      description TEXT NOT NULL,
      hours REAL NOT NULL,
      rate REAL NOT NULL,
      FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS order_parts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orderId INTEGER NOT NULL,
      inventoryId INTEGER,
      description TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unitPrice REAL NOT NULL,
      FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (inventoryId) REFERENCES inventory(id)
    )
  `);

  const userCount = await getQuery('SELECT COUNT(*) as total FROM users');
  if (!userCount || userCount.total === 0) {
    const defaultUsers = [
      ['admin', 'admin123', 'Administrador Geral', 'admin'],
      ['mecanico', 'mecanico123', 'Equipe Mecânica', 'mecanico']
    ];

    for (const user of defaultUsers) {
      await runQuery('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)', user);
    }
  }
}

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function getOrderWithDetails(id) {
  const order = await getQuery(
    `SELECT o.*, c.name as clientName
       FROM orders o
       LEFT JOIN clients c ON c.id = o.clientId
       WHERE o.id = ?`,
    [id]
  );

  if (!order) {
    return null;
  }

  const [labor, parts] = await Promise.all([
    allQuery('SELECT * FROM order_labor WHERE orderId = ?', [id]),
    allQuery('SELECT * FROM order_parts WHERE orderId = ?', [id])
  ]);

  return {
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
  };
}

function calculateSummary(payload, fallback = {}) {
  const laborItems = Array.isArray(payload.labor) ? payload.labor : [];
  const partItems = Array.isArray(payload.parts) ? payload.parts : [];
  const summary = payload.summary ?? {};

  const computedLabor = laborItems.length
    ? laborItems.reduce((acc, item) => acc + normalizeNumber(item.hours) * normalizeNumber(item.rate), 0)
    : undefined;
  const computedParts = partItems.length
    ? partItems.reduce((acc, item) => acc + normalizeNumber(item.quantity) * normalizeNumber(item.unitPrice), 0)
    : undefined;

  const laborTotal = normalizeNumber(
    typeof summary.laborTotal !== 'undefined'
      ? summary.laborTotal
      : typeof computedLabor !== 'undefined'
        ? computedLabor
        : typeof fallback.laborTotal !== 'undefined'
          ? fallback.laborTotal
          : 0,
    0
  );
  const partsTotal = normalizeNumber(
    typeof summary.partsTotal !== 'undefined'
      ? summary.partsTotal
      : typeof computedParts !== 'undefined'
        ? computedParts
        : typeof fallback.partsTotal !== 'undefined'
          ? fallback.partsTotal
          : 0,
    0
  );
  const additionalFees = normalizeNumber(
    typeof summary.additionalFees !== 'undefined' ? summary.additionalFees : fallback.additionalFees,
    0
  );
  const discounts = normalizeNumber(
    typeof summary.discounts !== 'undefined' ? summary.discounts : fallback.discounts,
    0
  );
  const total = normalizeNumber(
    typeof summary.total !== 'undefined'
      ? summary.total
      : typeof fallback.total !== 'undefined'
        ? fallback.total
        : laborTotal + partsTotal + additionalFees - discounts,
    laborTotal + partsTotal + additionalFees - discounts
  );

  return { laborTotal, partsTotal, additionalFees, discounts, total };
}

async function replaceOrderItems(orderId, items, table, columns) {
  await runQuery(`DELETE FROM ${table} WHERE orderId = ?`, [orderId]);
  if (!Array.isArray(items) || !items.length) {
    return;
  }

  const placeholders = columns.map(() => '?').join(', ');
  const statement = `INSERT INTO ${table} (orderId, ${columns.join(', ')}) VALUES (?, ${placeholders})`;
  for (const item of items) {
    const values = columns.map((column) => {
      const value = item[column];
      return typeof value === 'undefined' ? null : value;
    });
    await runQuery(statement, [orderId, ...values]);
  }
}

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
    const order = await getOrderWithDetails(id);

    if (!order) {
      return res.status(404).json({ message: 'Ordem não encontrada.' });
    }

    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao carregar detalhes da ordem.' });
  }
});

app.post('/api/orders', async (req, res) => {
  const { code, clientId, vehicle, description } = req.body;

  if (!code || !clientId || !vehicle || !description) {
    return res.status(400).json({ message: 'Código, cliente, veículo e descrição são obrigatórios.' });
  }

  const normalizedClientId = Number(clientId);
  if (!Number.isFinite(normalizedClientId)) {
    return res.status(400).json({ message: 'Cliente inválido.' });
  }

  const status = req.body.status ?? 'aberta';
  const promisedDate = req.body.promisedDate ? req.body.promisedDate : null;
  const notes = req.body.notes ?? null;
  const approvedByClient = req.body.approvedByClient ? 1 : 0;
  const createdAt = new Date().toISOString();
  const summary = calculateSummary(req.body);

  try {
    const result = await runQuery(
      `INSERT INTO orders (code, clientId, vehicle, description, status, createdAt, promisedDate, laborTotal, partsTotal, discounts, additionalFees, total, notes, approvedByClient)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        code,
        normalizedClientId,
        vehicle,
        description,
        status,
        createdAt,
        promisedDate,
        summary.laborTotal,
        summary.partsTotal,
        summary.discounts,
        summary.additionalFees,
        summary.total,
        notes,
        approvedByClient
      ]
    );

    const orderId = result.lastID;

    if (Array.isArray(req.body.labor)) {
      const laborItems = req.body.labor.map((item) => ({
        description: item.description,
        hours: normalizeNumber(item.hours, 0),
        rate: normalizeNumber(item.rate, 0)
      }));
      await replaceOrderItems(orderId, laborItems, 'order_labor', ['description', 'hours', 'rate']);
    }

    if (Array.isArray(req.body.parts)) {
      const partItems = req.body.parts.map((item) => ({
        inventoryId: typeof item.inventoryId === 'number' ? item.inventoryId : null,
        description: item.description,
        quantity: normalizeNumber(item.quantity, 0),
        unitPrice: normalizeNumber(item.unitPrice, 0)
      }));
      await replaceOrderItems(orderId, partItems, 'order_parts', ['inventoryId', 'description', 'quantity', 'unitPrice']);
    }

    const createdOrder = await getOrderWithDetails(orderId);
    res.status(201).json(createdOrder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao criar ordem de serviço.' });
  }
});

app.put('/api/orders/:id', async (req, res) => {
  const { id } = req.params;
  const { code, clientId, vehicle, description } = req.body;

  if (!code || !clientId || !vehicle || !description) {
    return res.status(400).json({ message: 'Código, cliente, veículo e descrição são obrigatórios.' });
  }

  try {
    const existing = await getQuery(
      'SELECT id, laborTotal, partsTotal, discounts, additionalFees, total FROM orders WHERE id = ?',
      [id]
    );
    if (!existing) {
      return res.status(404).json({ message: 'Ordem não encontrada.' });
    }

    const status = req.body.status ?? 'aberta';
    const promisedDate = req.body.promisedDate ? req.body.promisedDate : null;
    const notes = req.body.notes ?? null;
    const approvedByClient = req.body.approvedByClient ? 1 : 0;
    const normalizedClientId = Number(clientId);
    if (!Number.isFinite(normalizedClientId)) {
      return res.status(400).json({ message: 'Cliente inválido.' });
    }
    const summary = calculateSummary(req.body, existing);

    await runQuery(
      `UPDATE orders
       SET code = ?, clientId = ?, vehicle = ?, description = ?, status = ?, promisedDate = ?, laborTotal = ?, partsTotal = ?, discounts = ?, additionalFees = ?, total = ?, notes = ?, approvedByClient = ?
       WHERE id = ?`,
      [
        code,
        normalizedClientId,
        vehicle,
        description,
        status,
        promisedDate,
        summary.laborTotal,
        summary.partsTotal,
        summary.discounts,
        summary.additionalFees,
        summary.total,
        notes,
        approvedByClient,
        id
      ]
    );

    if (Array.isArray(req.body.labor)) {
      const laborItems = req.body.labor.map((item) => ({
        description: item.description,
        hours: normalizeNumber(item.hours, 0),
        rate: normalizeNumber(item.rate, 0)
      }));
      await replaceOrderItems(id, laborItems, 'order_labor', ['description', 'hours', 'rate']);
    }

    if (Array.isArray(req.body.parts)) {
      const partItems = req.body.parts.map((item) => ({
        inventoryId: typeof item.inventoryId === 'number' ? item.inventoryId : null,
        description: item.description,
        quantity: normalizeNumber(item.quantity, 0),
        unitPrice: normalizeNumber(item.unitPrice, 0)
      }));
      await replaceOrderItems(id, partItems, 'order_parts', ['inventoryId', 'description', 'quantity', 'unitPrice']);
    }

    const updatedOrder = await getOrderWithDetails(id);
    res.json(updatedOrder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao atualizar ordem de serviço.' });
  }
});

app.delete('/api/orders/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await runQuery('DELETE FROM orders WHERE id = ?', [id]);
    if (result.changes === 0) {
      return res.status(404).json({ message: 'Ordem não encontrada.' });
    }
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao remover ordem de serviço.' });
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

app.post('/api/clients', async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Nome é obrigatório.' });
  }

  const payload = {
    phone: req.body.phone ?? null,
    email: req.body.email ?? null,
    document: req.body.document ?? null,
    vehicles: req.body.vehicles ?? null,
    notes: req.body.notes ?? null
  };

  try {
    const result = await runQuery(
      `INSERT INTO clients (name, phone, email, document, vehicles, notes) VALUES (?, ?, ?, ?, ?, ?)`,
      [name, payload.phone, payload.email, payload.document, payload.vehicles, payload.notes]
    );
    const client = await getQuery('SELECT * FROM clients WHERE id = ?', [result.lastID]);
    res.status(201).json(client);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao criar cliente.' });
  }
});

app.put('/api/clients/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Nome é obrigatório.' });
  }

  try {
    const result = await runQuery(
      `UPDATE clients SET name = ?, phone = ?, email = ?, document = ?, vehicles = ?, notes = ? WHERE id = ?`,
      [
        name,
        req.body.phone ?? null,
        req.body.email ?? null,
        req.body.document ?? null,
        req.body.vehicles ?? null,
        req.body.notes ?? null,
        id
      ]
    );

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Cliente não encontrado.' });
    }

    const client = await getQuery('SELECT * FROM clients WHERE id = ?', [id]);
    res.json(client);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao atualizar cliente.' });
  }
});

app.delete('/api/clients/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await runQuery('DELETE FROM clients WHERE id = ?', [id]);
    if (result.changes === 0) {
      return res.status(404).json({ message: 'Cliente não encontrado.' });
    }

    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao remover cliente.' });
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

app.post('/api/inventory', async (req, res) => {
  const { code, description } = req.body;

  if (!code || !description) {
    return res.status(400).json({ message: 'Código e descrição são obrigatórios.' });
  }

  const quantity = normalizeNumber(req.body.quantity, 0);
  const minQuantity = normalizeNumber(req.body.minQuantity, 0);
  const unitCost = normalizeNumber(req.body.unitCost, 0);
  const location = req.body.location ?? null;
  const supplier = req.body.supplier ?? null;

  try {
    const result = await runQuery(
      `INSERT INTO inventory (code, description, quantity, minQuantity, unitCost, location, supplier)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [code, description, quantity, minQuantity, unitCost, location, supplier]
    );

    const item = await getQuery('SELECT * FROM inventory WHERE id = ?', [result.lastID]);
    res.status(201).json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao criar item de estoque.' });
  }
});

app.put('/api/inventory/:id', async (req, res) => {
  const { id } = req.params;
  const { code, description } = req.body;

  if (!code || !description) {
    return res.status(400).json({ message: 'Código e descrição são obrigatórios.' });
  }

  const quantity = normalizeNumber(req.body.quantity, 0);
  const minQuantity = normalizeNumber(req.body.minQuantity, 0);
  const unitCost = normalizeNumber(req.body.unitCost, 0);

  try {
    const result = await runQuery(
      `UPDATE inventory
       SET code = ?, description = ?, quantity = ?, minQuantity = ?, unitCost = ?, location = ?, supplier = ?
       WHERE id = ?`,
      [
        code,
        description,
        quantity,
        minQuantity,
        unitCost,
        req.body.location ?? null,
        req.body.supplier ?? null,
        id
      ]
    );

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Item não encontrado.' });
    }

    const item = await getQuery('SELECT * FROM inventory WHERE id = ?', [id]);
    res.json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao atualizar item de estoque.' });
  }
});

app.delete('/api/inventory/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await runQuery('DELETE FROM inventory WHERE id = ?', [id]);
    if (result.changes === 0) {
      return res.status(404).json({ message: 'Item não encontrado.' });
    }

    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao remover item de estoque.' });
  }
});

if (fs.existsSync(staticAssetsPath)) {
  app.use(express.static(staticAssetsPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }

    const indexFile = path.join(staticAssetsPath, 'index.html');
    if (fs.existsSync(indexFile)) {
      return res.sendFile(indexFile);
    }

    return res.status(404).send('Aplicação cliente não foi construída.');
  });
}

initializeDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`API de oficina mecânica executando na porta ${port}`);
    });
  })
  .catch((error) => {
    console.error('Falha ao inicializar o banco de dados.', error);
    process.exit(1);
  });
