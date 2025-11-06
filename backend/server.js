const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'database.json');

const STATUS_LABELS = {
  aguardando_aprovacao: 'Aguardando aprovação',
  em_andamento: 'Em andamento',
  finalizada: 'Finalizada',
  entregue: 'Entregue'
};

const readDatabase = () => {
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(raw);
};

const writeDatabase = (data) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

const sendJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(payload));
};

const sendNoContent = (res) => {
  res.writeHead(204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end();
};

const parseBody = (req) =>
  new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk.toString();
    });
    req.on('end', () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(err);
      }
    });
  });

const computeSummary = (order) => {
  const services = order.services.map((service) => {
    const total = Number((service.hours * service.rate).toFixed(2));
    return { ...service, total };
  });

  const parts = order.parts.map((part) => {
    const total = Number((part.quantity * part.unitPrice).toFixed(2));
    return { ...part, total };
  });

  const labor = Number(services.reduce((sum, item) => sum + item.total, 0).toFixed(2));
  const partsTotal = Number(parts.reduce((sum, item) => sum + item.total, 0).toFixed(2));
  const discount = Number((order.discount ?? 0).toFixed(2));
  const total = Number((labor + partsTotal - discount).toFixed(2));

  return {
    services,
    parts,
    summary: { labor, parts: partsTotal, discount, total }
  };
};

const hydrateOrder = (order, db) => {
  const client = db.clients.find((item) => item.id === order.clientId) || null;
  const { services, parts, summary } = computeSummary(order);
  return {
    ...order,
    services,
    parts,
    summary,
    statusLabel: STATUS_LABELS[order.status] || order.status,
    client
  };
};

const updateInventoryLevels = (db, parts) => {
  parts.forEach((part) => {
    if (!part.inventoryItemId) {
      return;
    }
    const inventoryItem = db.inventory.find((item) => item.id === part.inventoryItemId);
    if (inventoryItem) {
      inventoryItem.quantity = Math.max(0, inventoryItem.quantity - part.quantity);
    }
  });
};

const generateOrderCode = (orders) => {
  const year = new Date().getFullYear();
  const sequential = orders.length ? Math.max(...orders.map((o) => o.id)) + 1 : 1;
  return `OS-${year}-${String(sequential).padStart(4, '0')}`;
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') {
    return sendNoContent(res);
  }

  try {
    const db = readDatabase();

    if (req.method === 'POST' && url.pathname === '/api/login') {
      const body = await parseBody(req);
      const user = db.users.find(
        (item) => item.username === body.username && item.password === body.password
      );
      if (!user) {
        return sendJson(res, 401, { message: 'Credenciais inválidas.' });
      }
      const { password, ...safeUser } = user;
      return sendJson(res, 200, safeUser);
    }

    if (req.method === 'GET' && url.pathname === '/api/clients') {
      return sendJson(res, 200, db.clients);
    }

    if (req.method === 'POST' && url.pathname === '/api/clients') {
      const body = await parseBody(req);
      const nextId = db.clients.length ? Math.max(...db.clients.map((c) => c.id)) + 1 : 1;
      const client = { id: nextId, ...body };
      db.clients.push(client);
      writeDatabase(db);
      return sendJson(res, 201, client);
    }

    const clientIdMatch = url.pathname.match(/^\/api\/clients\/(\d+)$/);
    if (clientIdMatch) {
      const clientId = Number(clientIdMatch[1]);
      const clientIndex = db.clients.findIndex((client) => client.id === clientId);
      if (clientIndex === -1) {
        return sendJson(res, 404, { message: 'Cliente não encontrado.' });
      }

      if (req.method === 'PUT') {
        const body = await parseBody(req);
        db.clients[clientIndex] = { id: clientId, ...body };
        writeDatabase(db);
        return sendJson(res, 200, db.clients[clientIndex]);
      }

      if (req.method === 'DELETE') {
        db.clients.splice(clientIndex, 1);
        writeDatabase(db);
        return sendNoContent(res);
      }
    }

    if (req.method === 'GET' && url.pathname === '/api/inventory') {
      return sendJson(res, 200, db.inventory);
    }

    if (req.method === 'POST' && url.pathname === '/api/inventory') {
      const body = await parseBody(req);
      const nextId = db.inventory.length ? Math.max(...db.inventory.map((i) => i.id)) + 1 : 1;
      const item = { id: nextId, ...body };
      db.inventory.push(item);
      writeDatabase(db);
      return sendJson(res, 201, item);
    }

    const inventoryMatch = url.pathname.match(/^\/api\/inventory\/(\d+)$/);
    if (inventoryMatch) {
      const inventoryId = Number(inventoryMatch[1]);
      const index = db.inventory.findIndex((item) => item.id === inventoryId);
      if (index === -1) {
        return sendJson(res, 404, { message: 'Item não encontrado.' });
      }

      if (req.method === 'PUT') {
        const body = await parseBody(req);
        db.inventory[index] = { id: inventoryId, ...body };
        writeDatabase(db);
        return sendJson(res, 200, db.inventory[index]);
      }

      if (req.method === 'DELETE') {
        db.inventory.splice(index, 1);
        writeDatabase(db);
        return sendNoContent(res);
      }
    }

    if (req.method === 'GET' && url.pathname === '/api/service-orders') {
      const status = url.searchParams.get('status');
      const search = (url.searchParams.get('search') || '').toLowerCase();
      const filtered = db.serviceOrders.filter((order) => {
        const matchesStatus = !status || status === 'todos' || order.status === status;
        const client = db.clients.find((item) => item.id === order.clientId);
        const matchesSearch =
          !search ||
          order.code.toLowerCase().includes(search) ||
          order.vehicle.plate.toLowerCase().includes(search) ||
          order.vehicle.model.toLowerCase().includes(search) ||
          (client && client.name.toLowerCase().includes(search));
        return matchesStatus && matchesSearch;
      });

      return sendJson(res, 200, filtered.map((order) => hydrateOrder(order, db)));
    }

    if (req.method === 'POST' && url.pathname === '/api/service-orders') {
      const body = await parseBody(req);
      const client = db.clients.find((item) => item.id === body.clientId);
      if (!client) {
        return sendJson(res, 400, { message: 'Cliente inválido.' });
      }

      const nextId = db.serviceOrders.length ? Math.max(...db.serviceOrders.map((o) => o.id)) + 1 : 1;
      const code = generateOrderCode(db.serviceOrders);
      const now = new Date().toISOString();
      const order = {
        id: nextId,
        code,
        clientId: body.clientId,
        vehicle: body.vehicle,
        reportedIssue: body.reportedIssue,
        notes: body.notes || '',
        status: body.status || 'aguardando_aprovacao',
        services: body.services || [],
        parts: body.parts || [],
        discount: body.discount || 0,
        createdAt: now,
        updatedAt: now
      };

      const { services, parts, summary } = computeSummary(order);
      order.services = services;
      order.parts = parts;
      order.summary = summary;

      updateInventoryLevels(db, parts);

      db.serviceOrders.unshift(order);
      writeDatabase(db);

      return sendJson(res, 201, hydrateOrder(order, db));
    }

    const orderIdMatch = url.pathname.match(/^\/api\/service-orders\/(\d+)$/);
    if (orderIdMatch) {
      const orderId = Number(orderIdMatch[1]);
      const orderIndex = db.serviceOrders.findIndex((order) => order.id === orderId);
      if (orderIndex === -1) {
        return sendJson(res, 404, { message: 'Ordem de serviço não encontrada.' });
      }

      if (req.method === 'GET') {
        return sendJson(res, 200, hydrateOrder(db.serviceOrders[orderIndex], db));
      }

      if (req.method === 'PUT') {
        const body = await parseBody(req);
        const merged = {
          ...db.serviceOrders[orderIndex],
          ...body,
          updatedAt: new Date().toISOString()
        };
        const { services, parts, summary } = computeSummary(merged);
        merged.services = services;
        merged.parts = parts;
        merged.summary = summary;
        db.serviceOrders[orderIndex] = merged;
        writeDatabase(db);
        return sendJson(res, 200, hydrateOrder(merged, db));
      }

      if (req.method === 'DELETE') {
        db.serviceOrders.splice(orderIndex, 1);
        writeDatabase(db);
        return sendNoContent(res);
      }
    }

    const orderStatusMatch = url.pathname.match(/^\/api\/service-orders\/(\d+)\/status$/);
    if (orderStatusMatch && req.method === 'PATCH') {
      const orderId = Number(orderStatusMatch[1]);
      const orderIndex = db.serviceOrders.findIndex((order) => order.id === orderId);
      if (orderIndex === -1) {
        return sendJson(res, 404, { message: 'Ordem de serviço não encontrada.' });
      }
      const body = await parseBody(req);
      db.serviceOrders[orderIndex].status = body.status;
      db.serviceOrders[orderIndex].updatedAt = new Date().toISOString();
      const updated = db.serviceOrders[orderIndex];
      writeDatabase(db);
      return sendJson(res, 200, hydrateOrder(updated, db));
    }

    sendJson(res, 404, { message: 'Endpoint não encontrado.' });
  } catch (error) {
    console.error('Erro no servidor:', error);
    sendJson(res, 500, { message: 'Erro interno do servidor.' });
  }
});

server.listen(PORT, () => {
  console.log(`API de gestão de oficina executando na porta ${PORT}`);
});
