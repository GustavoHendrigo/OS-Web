"""Servidor HTTP simples para gestão de oficina mecânica.

Executa uma API REST com persistência em SQLite usando apenas bibliotecas padrão.
Para iniciar:

    python server.py

A API será disponibilizada em http://localhost:8000.
"""
from __future__ import annotations

import json
import secrets
import sqlite3
from datetime import datetime
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Dict, Optional, Tuple
from urllib.parse import parse_qs, urlparse

DATABASE_PATH = Path(__file__).with_name('workshop.db')
TOKENS: Dict[str, Dict[str, Any]] = {}


def dict_factory(cursor: sqlite3.Cursor, row: Tuple[Any, ...]) -> Dict[str, Any]:
  """Retorna linhas do SQLite como dicionários."""
  return {col[0]: row[idx] for idx, col in enumerate(cursor.description)}


def get_connection() -> sqlite3.Connection:
  conn = sqlite3.connect(DATABASE_PATH)
  conn.row_factory = dict_factory
  conn.execute('PRAGMA foreign_keys = ON;')
  return conn


def init_db() -> None:
  conn = get_connection()
  cur = conn.cursor()

  cur.executescript(
    """
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      vehicle_info TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      part_number TEXT,
      quantity INTEGER NOT NULL DEFAULT 0,
      minimum_stock INTEGER,
      unit_price REAL NOT NULL DEFAULT 0,
      location TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS service_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      client_id INTEGER NOT NULL,
      vehicle TEXT NOT NULL,
      status TEXT NOT NULL,
      description TEXT NOT NULL,
      mechanic_notes TEXT,
      scheduled_date TEXT,
      approved INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    );

    CREATE TABLE IF NOT EXISTS service_order_labor (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_order_id INTEGER NOT NULL,
      description TEXT NOT NULL,
      hours REAL NOT NULL,
      rate REAL NOT NULL,
      FOREIGN KEY (service_order_id) REFERENCES service_orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS service_order_parts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_order_id INTEGER NOT NULL,
      inventory_id INTEGER,
      description TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      FOREIGN KEY (service_order_id) REFERENCES service_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (inventory_id) REFERENCES inventory(id)
    );
    """
  )

  conn.commit()

  # Usuários padrão
  cur.execute('SELECT COUNT(*) as total FROM users;')
  if cur.fetchone()['total'] == 0:
    cur.executemany(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?);',
      [
        ('admin', 'admin123', 'admin'),
        ('mecanico', 'mec123', 'mecanico'),
      ],
    )

  # Clientes e estoque padrão para demonstração
  cur.execute('SELECT COUNT(*) as total FROM clients;')
  if cur.fetchone()['total'] == 0:
    cur.executemany(
      'INSERT INTO clients (name, phone, email, vehicle_info, notes) VALUES (?, ?, ?, ?, ?);',
      [
        ('Carlos Lima', '(11) 98888-1234', 'carlos@email.com', 'Toyota Corolla 2018 · FGH-3456', 'Cliente recorrente'),
        ('Ana Souza', '(11) 97777-4567', 'ana@email.com', 'Honda Civic 2020 · IJK-9876', 'Troca de pastilhas a cada 6 meses'),
      ],
    )

  cur.execute('SELECT COUNT(*) as total FROM inventory;')
  if cur.fetchone()['total'] == 0:
    cur.executemany(
      'INSERT INTO inventory (name, part_number, quantity, minimum_stock, unit_price, location) VALUES (?, ?, ?, ?, ?, ?);',
      [
        ('Pastilha de freio dianteira', 'PST-001', 12, 6, 120.0, 'Prateleira A2'),
        ('Filtro de óleo sintético', 'FLT-045', 25, 10, 35.5, 'Prateleira B1'),
        ('Óleo 5W30 sintético', 'OIL-5W30', 40, 20, 45.9, 'Tanque 1'),
      ],
    )

  cur.execute('SELECT COUNT(*) as total FROM service_orders;')
  if cur.fetchone()['total'] == 0:
    now = datetime.utcnow().isoformat()
    orders = [
      ('OS-0001', 1, 'Toyota Corolla 2018 · FGH-3456', 'aguardando_aprovacao', 'Revisão completa de 40 mil km', 'Aguardando retorno do cliente', None, 0, now, now),
      ('OS-0002', 2, 'Honda Civic 2020 · IJK-9876', 'em_andamento', 'Troca de pastilhas e balanceamento', 'Fazer teste de rodagem', None, 1, now, now),
    ]
    cur.executemany(
      'INSERT INTO service_orders (code, client_id, vehicle, status, description, mechanic_notes, scheduled_date, approved, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
      orders,
    )

    cur.executemany(
      'INSERT INTO service_order_labor (service_order_id, description, hours, rate) VALUES (?, ?, ?, ?);',
      [
        (1, 'Diagnóstico geral', 1.5, 150.0),
        (2, 'Troca das pastilhas', 2.0, 140.0),
        (2, 'Balanceamento das rodas', 1.5, 120.0),
      ],
    )

    cur.executemany(
      'INSERT INTO service_order_parts (service_order_id, inventory_id, description, quantity, unit_price) VALUES (?, ?, ?, ?, ?);',
      [
        (2, 1, 'Jogo de pastilhas dianteiras', 1, 220.0),
        (2, None, 'Serviço de alinhamento terceiro', 1, 90.0),
      ],
    )

  conn.commit()
  conn.close()


def compute_totals(order_id: int, conn: sqlite3.Connection) -> Tuple[float, float, float]:
  cur = conn.cursor()
  cur.execute('SELECT COALESCE(SUM(hours * rate), 0) AS labor_total FROM service_order_labor WHERE service_order_id = ?;', (order_id,))
  labor_total = cur.fetchone()['labor_total']
  cur.execute('SELECT COALESCE(SUM(quantity * unit_price), 0) AS parts_total FROM service_order_parts WHERE service_order_id = ?;', (order_id,))
  parts_total = cur.fetchone()['parts_total']
  total = labor_total + parts_total
  cur.execute('UPDATE service_orders SET updated_at = CURRENT_TIMESTAMP WHERE id = ?;', (order_id,))
  conn.commit()
  return labor_total, parts_total, total


class WorkshopHandler(BaseHTTPRequestHandler):
  server_version = 'WorkshopServer/1.0'

  def log_message(self, format: str, *args: Any) -> None:  # noqa: A003 - manter compatibilidade
    # Reduz verbosidade em testes automatizados
    return

  def end_headers(self) -> None:
    self.send_header('Access-Control-Allow-Origin', '*')
    self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    super().end_headers()

  def do_OPTIONS(self) -> None:  # noqa: N802 - API do BaseHTTPRequestHandler
    self.send_response(HTTPStatus.NO_CONTENT)
    self.end_headers()

  # Utilidades --------------------------------------------------------------
  def parse_json(self) -> Dict[str, Any]:
    length = int(self.headers.get('Content-Length', '0'))
    if length == 0:
      return {}
    data = self.rfile.read(length)
    try:
      return json.loads(data.decode('utf-8'))
    except json.JSONDecodeError:
      self.send_error(HTTPStatus.BAD_REQUEST, 'JSON inválido')
      raise

  def send_json(self, data: Any, status: HTTPStatus = HTTPStatus.OK) -> None:
    payload = json.dumps(data, ensure_ascii=False, default=str).encode('utf-8')
    self.send_response(status)
    self.send_header('Content-Type', 'application/json; charset=utf-8')
    self.send_header('Content-Length', str(len(payload)))
    self.end_headers()
    self.wfile.write(payload)

  def authenticate(self) -> Optional[Dict[str, Any]]:
    if self.path == '/api/login':
      return None

    auth_header = self.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
      self.send_error(HTTPStatus.UNAUTHORIZED, 'Token ausente')
      return None

    token = auth_header.removeprefix('Bearer ').strip()
    user = TOKENS.get(token)
    if not user:
      self.send_error(HTTPStatus.UNAUTHORIZED, 'Token inválido')
      return None
    return user

  # Rotas ------------------------------------------------------------------
  def do_POST(self) -> None:  # noqa: N802
    parsed = urlparse(self.path)
    if parsed.path == '/api/login':
      self.handle_login()
      return

    user = self.authenticate()
    if user is None:
      return

    if parsed.path == '/api/service-orders':
      self.handle_create_service_order()
    elif parsed.path == '/api/clients':
      self.handle_create_client()
    elif parsed.path == '/api/inventory':
      self.handle_create_inventory()
    else:
      self.send_error(HTTPStatus.NOT_FOUND, 'Endpoint não localizado')

  def do_GET(self) -> None:  # noqa: N802
    parsed = urlparse(self.path)
    path = parsed.path

    if path.startswith('/api/'):
      user = self.authenticate()
      if user is None:
        return

    if path == '/api/dashboard':
      self.handle_dashboard()
    elif path == '/api/clients':
      self.handle_list_clients(parsed.query)
    elif path == '/api/inventory':
      self.handle_list_inventory(parsed.query)
    elif path == '/api/service-orders':
      self.handle_list_service_orders(parsed.query)
    elif path.startswith('/api/service-orders/'):
      self.handle_service_order_detail(path)
    else:
      self.send_error(HTTPStatus.NOT_FOUND, 'Endpoint não localizado')

  def do_PUT(self) -> None:  # noqa: N802
    parsed = urlparse(self.path)
    user = self.authenticate()
    if user is None:
      return

    if parsed.path.startswith('/api/clients/'):
      self.handle_update_client(parsed.path)
    elif parsed.path.startswith('/api/inventory/'):
      self.handle_update_inventory(parsed.path)
    elif parsed.path.startswith('/api/service-orders/'):
      self.handle_update_service_order(parsed.path)
    else:
      self.send_error(HTTPStatus.NOT_FOUND, 'Endpoint não localizado')

  # Implementação das rotas -------------------------------------------------
  def handle_login(self) -> None:
    payload = self.parse_json()
    username = payload.get('username')
    password = payload.get('password')

    if not username or not password:
      self.send_error(HTTPStatus.BAD_REQUEST, 'Usuário e senha são obrigatórios')
      return

    with get_connection() as conn:
      cur = conn.cursor()
      cur.execute('SELECT * FROM users WHERE username = ? AND password = ?;', (username, password))
      user = cur.fetchone()

    if not user:
      self.send_error(HTTPStatus.UNAUTHORIZED, 'Credenciais inválidas')
      return

    token = secrets.token_hex(24)
    TOKENS[token] = {'id': user['id'], 'username': user['username'], 'role': user['role']}

    self.send_json({'id': user['id'], 'username': user['username'], 'role': user['role'], 'token': token})

  def handle_dashboard(self) -> None:
    with get_connection() as conn:
      cur = conn.cursor()
      cur.execute(
        """
        SELECT status,
               COUNT(*) AS count,
               COALESCE(SUM(
                 (SELECT COALESCE(SUM(hours * rate), 0) FROM service_order_labor WHERE service_order_id = so.id) +
                 (SELECT COALESCE(SUM(quantity * unit_price), 0) FROM service_order_parts WHERE service_order_id = so.id)
               ), 0) AS total
        FROM service_orders so
        GROUP BY status
        ORDER BY status;
        """
      )
      status_cards = cur.fetchall()

      cur.execute(
        """
        SELECT so.id,
               so.code,
               so.vehicle,
               so.status,
               so.created_at,
               so.updated_at,
               c.name AS client_name,
               (
                 (SELECT COALESCE(SUM(hours * rate), 0) FROM service_order_labor WHERE service_order_id = so.id) +
                 (SELECT COALESCE(SUM(quantity * unit_price), 0) FROM service_order_parts WHERE service_order_id = so.id)
               ) AS total_cost
        FROM service_orders so
        JOIN clients c ON c.id = so.client_id
        ORDER BY so.updated_at DESC
        LIMIT 8;
        """
      )
      recent = cur.fetchall()

      cur.execute(
        """
        SELECT so.id,
               so.code,
               so.vehicle,
               so.status,
               so.created_at,
               so.updated_at,
               c.name AS client_name,
               (
                 (SELECT COALESCE(SUM(hours * rate), 0) FROM service_order_labor WHERE service_order_id = so.id) +
                 (SELECT COALESCE(SUM(quantity * unit_price), 0) FROM service_order_parts WHERE service_order_id = so.id)
               ) AS total_cost
        FROM service_orders so
        JOIN clients c ON c.id = so.client_id
        WHERE so.status = 'aguardando_aprovacao'
        ORDER BY so.created_at ASC;
        """
      )
      pending = cur.fetchall()

    payload = {
      'statusCards': [
        {
          'status': row['status'],
          'label': row['status'].replace('_', ' ').title(),
          'count': row['count'],
          'total': row['total'],
        }
        for row in status_cards
      ],
      'recentOrders': [
        {
          'id': row['id'],
          'code': row['code'],
          'vehicle': row['vehicle'],
          'status': row['status'],
          'createdAt': row['created_at'],
          'updatedAt': row['updated_at'],
          'clientName': row['client_name'],
          'totalCost': row['total_cost'],
        }
        for row in recent
      ],
      'pendingApprovals': [
        {
          'id': row['id'],
          'code': row['code'],
          'vehicle': row['vehicle'],
          'status': row['status'],
          'createdAt': row['created_at'],
          'updatedAt': row['updated_at'],
          'clientName': row['client_name'],
          'totalCost': row['total_cost'],
        }
        for row in pending
      ],
    }
    self.send_json(payload)

  def handle_list_clients(self, query: str) -> None:
    params = parse_qs(query)
    term = params.get('search', [''])[0].strip()
    sql = 'SELECT * FROM clients'
    args: Tuple[Any, ...] = ()
    if term:
      like = f'%{term.lower()}%'
      sql += ' WHERE lower(name) LIKE ? OR lower(phone) LIKE ? OR lower(email) LIKE ?'
      args = (like, like, like)
    sql += ' ORDER BY name COLLATE NOCASE;'

    with get_connection() as conn:
      cur = conn.cursor()
      cur.execute(sql, args)
      clients = cur.fetchall()

    payload = [
      {
        'id': row['id'],
        'name': row['name'],
        'phone': row['phone'],
        'email': row['email'],
        'vehicleInfo': row['vehicle_info'],
        'notes': row['notes'],
        'createdAt': row['created_at'],
      }
      for row in clients
    ]
    self.send_json(payload)

  def handle_list_inventory(self, query: str) -> None:
    params = parse_qs(query)
    term = params.get('search', [''])[0].strip()
    sql = 'SELECT * FROM inventory'
    args: Tuple[Any, ...] = ()
    if term:
      like = f'%{term.lower()}%'
      sql += ' WHERE lower(name) LIKE ? OR lower(part_number) LIKE ?'
      args = (like, like)
    sql += ' ORDER BY name COLLATE NOCASE;'

    with get_connection() as conn:
      cur = conn.cursor()
      cur.execute(sql, args)
      items = cur.fetchall()

    payload = [
      {
        'id': row['id'],
        'name': row['name'],
        'partNumber': row['part_number'],
        'quantity': row['quantity'],
        'minimumStock': row['minimum_stock'],
        'unitPrice': row['unit_price'],
        'location': row['location'],
        'updatedAt': row['updated_at'],
      }
      for row in items
    ]
    self.send_json(payload)

  def handle_list_service_orders(self, query: str) -> None:
    params = parse_qs(query)
    status = params.get('status', [''])[0]
    term = params.get('search', [''])[0].strip()

    sql = (
      'SELECT so.id, so.code, so.vehicle, so.status, so.created_at, so.updated_at, '
      'c.name AS client_name, '
      'COALESCE((SELECT SUM(hours * rate) FROM service_order_labor WHERE service_order_id = so.id), 0) + '
      'COALESCE((SELECT SUM(quantity * unit_price) FROM service_order_parts WHERE service_order_id = so.id), 0) AS total_cost '
      'FROM service_orders so JOIN clients c ON c.id = so.client_id'
    )
    filters = []
    args: list[Any] = []

    if status:
      filters.append('so.status = ?')
      args.append(status)
    if term:
      like = f'%{term.lower()}%'
      filters.append('(lower(so.code) LIKE ? OR lower(so.vehicle) LIKE ? OR lower(c.name) LIKE ?)')
      args.extend([like, like, like])

    if filters:
      sql += ' WHERE ' + ' AND '.join(filters)

    sql += ' ORDER BY so.updated_at DESC;'

    with get_connection() as conn:
      cur = conn.cursor()
      cur.execute(sql, tuple(args))
      orders = cur.fetchall()

    payload = [
      {
        'id': row['id'],
        'code': row['code'],
        'vehicle': row['vehicle'],
        'status': row['status'],
        'createdAt': row['created_at'],
        'updatedAt': row['updated_at'],
        'clientName': row['client_name'],
        'totalCost': row['total_cost'],
      }
      for row in orders
    ]
    self.send_json(payload)

  def handle_service_order_detail(self, path: str) -> None:
    try:
      order_id = int(path.rsplit('/', 1)[-1])
    except ValueError:
      self.send_error(HTTPStatus.BAD_REQUEST, 'Identificador inválido')
      return

    with get_connection() as conn:
      cur = conn.cursor()
      cur.execute(
        'SELECT so.*, c.name AS client_name FROM service_orders so JOIN clients c ON c.id = so.client_id WHERE so.id = ?;',
        (order_id,),
      )
      order = cur.fetchone()
      if not order:
        self.send_error(HTTPStatus.NOT_FOUND, 'OS não encontrada')
        return

      cur.execute('SELECT * FROM service_order_labor WHERE service_order_id = ?;', (order_id,))
      labor = cur.fetchall()
      cur.execute('SELECT * FROM service_order_parts WHERE service_order_id = ?;', (order_id,))
      parts = cur.fetchall()

      labor_total, parts_total, total = compute_totals(order_id, conn)

    payload = {
      'id': order['id'],
      'code': order['code'],
      'clientId': order['client_id'],
      'clientName': order['client_name'],
      'vehicle': order['vehicle'],
      'status': order['status'],
      'description': order['description'],
      'mechanicNotes': order['mechanic_notes'],
      'scheduledDate': order['scheduled_date'],
      'approved': bool(order['approved']),
      'createdAt': order['created_at'],
      'updatedAt': order['updated_at'],
      'laborCost': labor_total,
      'partsCost': parts_total,
      'totalCost': total,
      'labor': [
        {
          'id': item['id'],
          'description': item['description'],
          'hours': item['hours'],
          'rate': item['rate'],
        }
        for item in labor
      ],
      'parts': [
        {
          'id': item['id'],
          'inventoryId': item['inventory_id'],
          'description': item['description'],
          'quantity': item['quantity'],
          'unitPrice': item['unit_price'],
        }
        for item in parts
      ],
    }
    self.send_json(payload)

  def handle_create_client(self) -> None:
    payload = self.parse_json()
    required = ['name', 'phone', 'email']
    if any(not payload.get(field) for field in required):
      self.send_error(HTTPStatus.BAD_REQUEST, 'Nome, telefone e e-mail são obrigatórios')
      return

    with get_connection() as conn:
      cur = conn.cursor()
      cur.execute(
        'INSERT INTO clients (name, phone, email, vehicle_info, notes) VALUES (?, ?, ?, ?, ?);',
        (
          payload['name'],
          payload['phone'],
          payload['email'],
          payload.get('vehicleInfo'),
          payload.get('notes'),
        ),
      )
      conn.commit()
      client_id = cur.lastrowid
      cur.execute('SELECT * FROM clients WHERE id = ?;', (client_id,))
      client = cur.fetchone()

    self.send_json(
      {
        'id': client['id'],
        'name': client['name'],
        'phone': client['phone'],
        'email': client['email'],
        'vehicleInfo': client['vehicle_info'],
        'notes': client['notes'],
        'createdAt': client['created_at'],
      },
      HTTPStatus.CREATED,
    )

  def handle_update_client(self, path: str) -> None:
    try:
      client_id = int(path.rsplit('/', 1)[-1])
    except ValueError:
      self.send_error(HTTPStatus.BAD_REQUEST, 'Identificador inválido')
      return

    payload = self.parse_json()
    with get_connection() as conn:
      cur = conn.cursor()
      cur.execute(
        'UPDATE clients SET name = ?, phone = ?, email = ?, vehicle_info = ?, notes = ? WHERE id = ?;',
        (
          payload.get('name'),
          payload.get('phone'),
          payload.get('email'),
          payload.get('vehicleInfo'),
          payload.get('notes'),
          client_id,
        ),
      )
      conn.commit()
      cur.execute('SELECT * FROM clients WHERE id = ?;', (client_id,))
      client = cur.fetchone()
      if not client:
        self.send_error(HTTPStatus.NOT_FOUND, 'Cliente não encontrado')
        return

    self.send_json(
      {
        'id': client['id'],
        'name': client['name'],
        'phone': client['phone'],
        'email': client['email'],
        'vehicleInfo': client['vehicle_info'],
        'notes': client['notes'],
        'createdAt': client['created_at'],
      }
    )

  def handle_create_inventory(self) -> None:
    payload = self.parse_json()
    if not payload.get('name'):
      self.send_error(HTTPStatus.BAD_REQUEST, 'Descrição é obrigatória')
      return

    quantity = payload.get('quantity', 0)
    unit_price = payload.get('unitPrice', 0)

    with get_connection() as conn:
      cur = conn.cursor()
      cur.execute(
        'INSERT INTO inventory (name, part_number, quantity, minimum_stock, unit_price, location) VALUES (?, ?, ?, ?, ?, ?);',
        (
          payload['name'],
          payload.get('partNumber'),
          quantity,
          payload.get('minimumStock'),
          unit_price,
          payload.get('location'),
        ),
      )
      conn.commit()
      item_id = cur.lastrowid
      cur.execute('SELECT * FROM inventory WHERE id = ?;', (item_id,))
      item = cur.fetchone()

    self.send_json(
      {
        'id': item['id'],
        'name': item['name'],
        'partNumber': item['part_number'],
        'quantity': item['quantity'],
        'minimumStock': item['minimum_stock'],
        'unitPrice': item['unit_price'],
        'location': item['location'],
        'updatedAt': item['updated_at'],
      },
      HTTPStatus.CREATED,
    )

  def handle_update_inventory(self, path: str) -> None:
    try:
      item_id = int(path.rsplit('/', 1)[-1])
    except ValueError:
      self.send_error(HTTPStatus.BAD_REQUEST, 'Identificador inválido')
      return

    payload = self.parse_json()
    with get_connection() as conn:
      cur = conn.cursor()
      cur.execute(
        'UPDATE inventory SET name = ?, part_number = ?, quantity = ?, minimum_stock = ?, unit_price = ?, location = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;',
        (
          payload.get('name'),
          payload.get('partNumber'),
          payload.get('quantity'),
          payload.get('minimumStock'),
          payload.get('unitPrice'),
          payload.get('location'),
          item_id,
        ),
      )
      conn.commit()
      cur.execute('SELECT * FROM inventory WHERE id = ?;', (item_id,))
      item = cur.fetchone()
      if not item:
        self.send_error(HTTPStatus.NOT_FOUND, 'Item não encontrado')
        return

    self.send_json(
      {
        'id': item['id'],
        'name': item['name'],
        'partNumber': item['part_number'],
        'quantity': item['quantity'],
        'minimumStock': item['minimum_stock'],
        'unitPrice': item['unit_price'],
        'location': item['location'],
        'updatedAt': item['updated_at'],
      }
    )

  def handle_create_service_order(self) -> None:
    payload = self.parse_json()
    required = ['clientId', 'vehicle', 'description']
    if any(not payload.get(field) for field in required):
      self.send_error(HTTPStatus.BAD_REQUEST, 'Cliente, veículo e descrição são obrigatórios')
      return

    status = payload.get('status', 'aguardando_aprovacao')
    with get_connection() as conn:
      cur = conn.cursor()
      cur.execute('SELECT COUNT(*) AS total FROM service_orders;')
      count = cur.fetchone()['total'] + 1
      code = f'OS-{count:04d}'
      cur.execute(
        'INSERT INTO service_orders (code, client_id, vehicle, status, description, mechanic_notes, scheduled_date, approved) VALUES (?, ?, ?, ?, ?, ?, ?, ?);',
        (
          code,
          payload['clientId'],
          payload['vehicle'],
          status,
          payload['description'],
          payload.get('mechanicNotes'),
          payload.get('scheduledDate'),
          1 if payload.get('approved') else 0,
        ),
      )
      order_id = cur.lastrowid

      for labor in payload.get('labor', []):
        cur.execute(
          'INSERT INTO service_order_labor (service_order_id, description, hours, rate) VALUES (?, ?, ?, ?);',
          (order_id, labor.get('description', ''), labor.get('hours', 0), labor.get('rate', 0)),
        )

      for part in payload.get('parts', []):
        cur.execute(
          'INSERT INTO service_order_parts (service_order_id, inventory_id, description, quantity, unit_price) VALUES (?, ?, ?, ?, ?);',
          (
            order_id,
            part.get('inventoryId'),
            part.get('description', ''),
            part.get('quantity', 0),
            part.get('unitPrice', 0),
          ),
        )

      labor_total, parts_total, total = compute_totals(order_id, conn)
      conn.commit()

      cur.execute('SELECT * FROM service_orders WHERE id = ?;', (order_id,))
      order = cur.fetchone()

    payload = {
      'id': order['id'],
      'code': order['code'],
      'clientId': order['client_id'],
      'vehicle': order['vehicle'],
      'status': order['status'],
      'description': order['description'],
      'mechanicNotes': order['mechanic_notes'],
      'scheduledDate': order['scheduled_date'],
      'approved': bool(order['approved']),
      'createdAt': order['created_at'],
      'updatedAt': order['updated_at'],
      'laborCost': labor_total,
      'partsCost': parts_total,
      'totalCost': total,
    }
    self.send_json(payload, HTTPStatus.CREATED)

  def handle_update_service_order(self, path: str) -> None:
    try:
      order_id = int(path.rsplit('/', 1)[-1])
    except ValueError:
      self.send_error(HTTPStatus.BAD_REQUEST, 'Identificador inválido')
      return

    payload = self.parse_json()

    columns = []
    values: list[Any] = []
    for field, column in [
      ('status', 'status'),
      ('description', 'description'),
      ('mechanicNotes', 'mechanic_notes'),
      ('scheduledDate', 'scheduled_date'),
      ('approved', 'approved'),
    ]:
      if field in payload:
        if field == 'approved':
          values.append(1 if payload[field] else 0)
        else:
          values.append(payload[field])
        columns.append(f'{column} = ?')

    if columns:
      sql = 'UPDATE service_orders SET ' + ', '.join(columns) + ', updated_at = CURRENT_TIMESTAMP WHERE id = ?;'
      values.append(order_id)
      with get_connection() as conn:
        cur = conn.cursor()
        cur.execute(sql, tuple(values))

        # Atualiza mão de obra e peças se enviados
        if 'labor' in payload:
          cur.execute('DELETE FROM service_order_labor WHERE service_order_id = ?;', (order_id,))
          for labor in payload['labor']:
            cur.execute(
              'INSERT INTO service_order_labor (service_order_id, description, hours, rate) VALUES (?, ?, ?, ?);',
              (order_id, labor.get('description', ''), labor.get('hours', 0), labor.get('rate', 0)),
            )

        if 'parts' in payload:
          cur.execute('DELETE FROM service_order_parts WHERE service_order_id = ?;', (order_id,))
          for part in payload['parts']:
            cur.execute(
              'INSERT INTO service_order_parts (service_order_id, inventory_id, description, quantity, unit_price) VALUES (?, ?, ?, ?, ?);',
              (
                order_id,
                part.get('inventoryId'),
                part.get('description', ''),
                part.get('quantity', 0),
                part.get('unitPrice', 0),
              ),
            )

        labor_total, parts_total, total = compute_totals(order_id, conn)
        cur.execute('SELECT * FROM service_orders WHERE id = ?;', (order_id,))
        order = cur.fetchone()
        cur.execute('SELECT * FROM service_order_labor WHERE service_order_id = ?;', (order_id,))
        labor = cur.fetchall()
        cur.execute('SELECT * FROM service_order_parts WHERE service_order_id = ?;', (order_id,))
        parts = cur.fetchall()
        conn.commit()
    else:
      self.send_error(HTTPStatus.BAD_REQUEST, 'Nenhum campo para atualizar')
      return

    payload = {
      'id': order['id'],
      'code': order['code'],
      'clientId': order['client_id'],
      'vehicle': order['vehicle'],
      'status': order['status'],
      'description': order['description'],
      'mechanicNotes': order['mechanic_notes'],
      'scheduledDate': order['scheduled_date'],
      'approved': bool(order['approved']),
      'createdAt': order['created_at'],
      'updatedAt': order['updated_at'],
      'laborCost': labor_total,
      'partsCost': parts_total,
      'totalCost': total,
      'labor': [
        {
          'id': item['id'],
          'description': item['description'],
          'hours': item['hours'],
          'rate': item['rate'],
        }
        for item in labor
      ],
      'parts': [
        {
          'id': item['id'],
          'inventoryId': item['inventory_id'],
          'description': item['description'],
          'quantity': item['quantity'],
          'unitPrice': item['unit_price'],
        }
        for item in parts
      ],
    }

    self.send_json(payload)


def run(server_class=ThreadingHTTPServer, handler_class=WorkshopHandler, port: int = 8000) -> None:
  init_db()
  server_address = ('', port)
  httpd = server_class(server_address, handler_class)
  print(f'Servidor em execução em http://localhost:{port}')
  try:
    httpd.serve_forever()
  except KeyboardInterrupt:
    print('\nEncerrando servidor...')
  finally:
    httpd.server_close()


if __name__ == '__main__':
  run()
