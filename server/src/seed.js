import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '../data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL
    )
  `);

  db.run(`
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

  db.run(`
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

  db.run(`
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

  db.run(`
    CREATE TABLE IF NOT EXISTS order_labor (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orderId INTEGER NOT NULL,
      description TEXT NOT NULL,
      hours REAL NOT NULL,
      rate REAL NOT NULL,
      FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE
    )
  `);

  db.run(`
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

  db.run('DELETE FROM users');
  db.run('DELETE FROM clients');
  db.run('DELETE FROM inventory');
  db.run('DELETE FROM orders');
  db.run('DELETE FROM order_labor');
  db.run('DELETE FROM order_parts');

  const userStmt = db.prepare('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)');
  userStmt.run('admin', 'admin123', 'Administrador Geral', 'admin');
  userStmt.run('mecanico', 'mecanico123', 'Equipe Mecânica', 'mecanico');
  userStmt.finalize();

  const clients = [
    ['João da Silva', '(11) 98888-0000', 'joao@email.com', '123.456.789-00', 'Honda Civic 2018', 'Prefere contato por WhatsApp'],
    ['Maria Oliveira', '(11) 97777-0000', 'maria@email.com', '987.654.321-00', 'Toyota Corolla 2020', 'Cliente VIP'],
    ['Carlos Santos', '(11) 96666-0000', 'carlos@email.com', '456.789.123-00', 'Ford Ranger 2017', 'Revisão a cada 10.000 km']
  ];

  const clientStmt = db.prepare(
    'INSERT INTO clients (name, phone, email, document, vehicles, notes) VALUES (?, ?, ?, ?, ?, ?)'
  );
  clients.forEach((client) => clientStmt.run(client));
  clientStmt.finalize();

  const inventoryItems = [
    ['OL-5W30', 'Óleo sintético 5W30', 35, 10, 85.0, 'Prateleira A1', 'Mobil'],
    ['FLT-AR', 'Filtro de ar', 20, 5, 45.5, 'Prateleira B2', 'Bosch'],
    ['PST-FREIO', 'Pastilha de freio dianteira', 15, 6, 120.0, 'Prateleira C3', 'TRW'],
    ['COR-DENT', 'Correia dentada', 8, 4, 230.0, 'Prateleira D1', 'Gates'],
    ['BAT-60', 'Bateria 60Ah', 12, 5, 420.0, 'Área externa', 'Moura']
  ];

  const inventoryStmt = db.prepare(
    'INSERT INTO inventory (code, description, quantity, minQuantity, unitCost, location, supplier) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  inventoryItems.forEach((item) => inventoryStmt.run(item));
  inventoryStmt.finalize();

  const orders = [
    {
      code: 'OS-1001',
      clientId: 1,
      vehicle: 'Honda Civic 2018',
      description: 'Revisão completa com troca de óleo e filtros',
      status: 'em_andamento',
      createdAt: new Date().toISOString(),
      promisedDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      laborTotal: 450,
      partsTotal: 280,
      discounts: 0,
      additionalFees: 50,
      total: 780,
      notes: 'Cliente aguarda orçamento detalhado',
      approvedByClient: 1
    },
    {
      code: 'OS-1002',
      clientId: 2,
      vehicle: 'Toyota Corolla 2020',
      description: 'Substituição de pastilhas de freio e revisão de suspensão',
      status: 'aguardando_aprovacao',
      createdAt: new Date().toISOString(),
      promisedDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      laborTotal: 380,
      partsTotal: 450,
      discounts: 50,
      additionalFees: 0,
      total: 780,
      notes: 'Aguardando aprovação do cliente para compra das peças',
      approvedByClient: 0
    },
    {
      code: 'OS-1003',
      clientId: 3,
      vehicle: 'Ford Ranger 2017',
      description: 'Diagnóstico de falha na injeção eletrônica',
      status: 'aberta',
      createdAt: new Date().toISOString(),
      promisedDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      laborTotal: 250,
      partsTotal: 0,
      discounts: 0,
      additionalFees: 0,
      total: 250,
      notes: 'Veículo chegou guinchado',
      approvedByClient: 0
    }
  ];

  const orderStmt = db.prepare(
    `INSERT INTO orders (code, clientId, vehicle, description, status, createdAt, promisedDate, laborTotal, partsTotal, discounts, additionalFees, total, notes, approvedByClient)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  orders.forEach((order) =>
    orderStmt.run([
      order.code,
      order.clientId,
      order.vehicle,
      order.description,
      order.status,
      order.createdAt,
      order.promisedDate,
      order.laborTotal,
      order.partsTotal,
      order.discounts,
      order.additionalFees,
      order.total,
      order.notes,
      order.approvedByClient
    ])
  );
  orderStmt.finalize();

  const laborStmt = db.prepare(
    'INSERT INTO order_labor (orderId, description, hours, rate) VALUES (?, ?, ?, ?)'
  );
  laborStmt.run(1, 'Troca de óleo e filtro', 1.5, 120);
  laborStmt.run(1, 'Checklist de revisão', 2, 105);
  laborStmt.run(2, 'Substituição de pastilhas', 2.5, 120);
  laborStmt.run(3, 'Diagnóstico eletrônico', 2, 125);
  laborStmt.finalize();

  const partsStmt = db.prepare(
    'INSERT INTO order_parts (orderId, inventoryId, description, quantity, unitPrice) VALUES (?, ?, ?, ?, ?)'
  );
  partsStmt.run(1, 1, 'Óleo sintético 5W30', 4, 85);
  partsStmt.run(1, 2, 'Filtro de ar', 1, 45.5);
  partsStmt.run(2, 3, 'Pastilha de freio dianteira', 1, 120);
  partsStmt.run(2, null, 'Mão de obra especializada', 1, 310);
  partsStmt.finalize();

  console.log('Banco de dados preparado com dados iniciais.');
});
