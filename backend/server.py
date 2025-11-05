from __future__ import annotations

import json
import re
import sqlite3
from datetime import datetime
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

DB_PATH = Path(__file__).resolve().parent / "workshop.db"

STATUS_MESSAGES = {
    "em_andamento": "Em andamento",
    "aguardando_aprovacao": "Aguardando aprovação",
    "aprovado": "Aprovado",
    "concluido": "Concluído",
    "entregue": "Entregue",
    "cancelado": "Cancelado",
}


def dict_factory(cursor: sqlite3.Cursor, row: Tuple[Any, ...]) -> Dict[str, Any]:
    return {col[0]: row[idx] for idx, col in enumerate(cursor.description)}


def execute_query(query: str, params: Tuple[Any, ...] = ()) -> list[Dict[str, Any]]:
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = dict_factory
        cur = conn.cursor()
        cur.execute(query, params)
        return cur.fetchall()


def execute_non_query(query: str, params: Tuple[Any, ...] = ()) -> int:
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.cursor()
        cur.execute(query, params)
        conn.commit()
        return cur.lastrowid


def build_order_summary(order: Dict[str, Any]) -> Dict[str, Any]:
    total = (order.get("labor_cost") or 0) + (order.get("parts_cost") or 0) + (order.get("additional_cost") or 0)
    order_summary = dict(order)
    order_summary["status_label"] = STATUS_MESSAGES.get(order.get("status"), order.get("status"))
    order_summary["total"] = round(total, 2)
    return order_summary


class WorkshopHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def end_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        super().end_headers()

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(HTTPStatus.NO_CONTENT)
        self.end_headers()

    def do_POST(self) -> None:  # noqa: N802
        if self.path == "/api/login":
            self.handle_login()
        elif self.path == "/api/orders":
            self.handle_create_order()
        elif self.path == "/api/clients":
            self.handle_create_client()
        elif self.path == "/api/inventory":
            self.handle_create_inventory_item()
        else:
            self.send_error(HTTPStatus.NOT_FOUND, "Endpoint não encontrado")

    def do_GET(self) -> None:  # noqa: N802
        if self.path.startswith("/api/orders/"):
            match = re.fullmatch(r"/api/orders/(\d+)", self.path)
            if match:
                self.handle_get_order(int(match.group(1)))
                return
        elif self.path.startswith("/api/orders"):
            self.handle_list_orders()
            return
        elif self.path.startswith("/api/clients"):
            self.handle_list_clients()
            return
        elif self.path.startswith("/api/inventory"):
            self.handle_list_inventory()
            return
        elif self.path == "/api/dashboard":
            self.handle_dashboard()
            return

        self.send_error(HTTPStatus.NOT_FOUND, "Endpoint não encontrado")

    def do_PUT(self) -> None:  # noqa: N802
        if self.path.startswith("/api/orders/"):
            match = re.fullmatch(r"/api/orders/(\d+)", self.path)
            if match:
                self.handle_update_order(int(match.group(1)))
                return
        elif self.path.startswith("/api/clients/"):
            match = re.fullmatch(r"/api/clients/(\d+)", self.path)
            if match:
                self.handle_update_client(int(match.group(1)))
                return
        elif self.path.startswith("/api/inventory/"):
            match = re.fullmatch(r"/api/inventory/(\d+)", self.path)
            if match:
                self.handle_update_inventory_item(int(match.group(1)))
                return

        self.send_error(HTTPStatus.NOT_FOUND, "Endpoint não encontrado")

    def do_DELETE(self) -> None:  # noqa: N802
        if self.path.startswith("/api/orders/"):
            match = re.fullmatch(r"/api/orders/(\d+)", self.path)
            if match:
                self.handle_delete_order(int(match.group(1)))
                return
        elif self.path.startswith("/api/clients/"):
            match = re.fullmatch(r"/api/clients/(\d+)", self.path)
            if match:
                self.handle_delete_client(int(match.group(1)))
                return
        elif self.path.startswith("/api/inventory/"):
            match = re.fullmatch(r"/api/inventory/(\d+)", self.path)
            if match:
                self.handle_delete_inventory_item(int(match.group(1)))
                return

        self.send_error(HTTPStatus.NOT_FOUND, "Endpoint não encontrado")

    # Helpers
    def parse_body(self) -> Dict[str, Any]:
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length == 0:
            return {}
        body = self.rfile.read(content_length)
        if not body:
            return {}
        return json.loads(body)

    def send_json(self, data: Any, status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    # Endpoint handlers
    def handle_login(self) -> None:
        payload = self.parse_body()
        username = payload.get("username")
        password = payload.get("password")
        if not username or not password:
            self.send_error(HTTPStatus.BAD_REQUEST, "Usuário e senha são obrigatórios")
            return

        users = execute_query(
            "SELECT username, role, full_name FROM users WHERE username = ? AND password = ?",
            (username, password),
        )
        if not users:
            self.send_error(HTTPStatus.UNAUTHORIZED, "Credenciais inválidas")
            return

        self.send_json({"user": users[0]})

    def handle_list_orders(self) -> None:
        query = self.path.split("?", 1)
        params: Dict[str, str] = {}
        if len(query) == 2:
            for part in query[1].split("&"):
                if "=" in part:
                    key, value = part.split("=", 1)
                    params[key] = value

        filters: list[str] = []
        values: list[Any] = []
        if search := params.get("search"):
            search_like = f"%{search.replace('+', ' ')}%"
            filters.append("(o.description LIKE ? OR o.vehicle LIKE ? OR c.name LIKE ?)")
            values.extend([search_like, search_like, search_like])
        if status := params.get("status"):
            filters.append("o.status = ?")
            values.append(status)

        where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""

        orders = execute_query(
            f"""
            SELECT o.*, c.name AS client_name, c.phone AS client_phone
            FROM orders o
            JOIN clients c ON c.id = o.client_id
            {where_clause}
            ORDER BY o.created_at DESC
            """,
            tuple(values),
        )
        self.send_json([build_order_summary(order) for order in orders])

    def handle_get_order(self, order_id: int) -> None:
        orders = execute_query(
            """
            SELECT o.*, c.name AS client_name, c.phone AS client_phone, c.email AS client_email, c.address AS client_address
            FROM orders o
            JOIN clients c ON c.id = o.client_id
            WHERE o.id = ?
            """,
            (order_id,),
        )
        if not orders:
            self.send_error(HTTPStatus.NOT_FOUND, "Ordem de serviço não encontrada")
            return
        self.send_json(build_order_summary(orders[0]))

    def handle_create_order(self) -> None:
        payload = self.parse_body()
        required = ["client_id", "description", "status"]
        if not all(payload.get(field) for field in required):
            self.send_error(HTTPStatus.BAD_REQUEST, "Campos obrigatórios ausentes")
            return

        now = datetime.utcnow().isoformat()
        order_id = execute_non_query(
            """
            INSERT INTO orders (
                client_id, vehicle, description, labor_cost, parts_cost, additional_cost, status,
                created_at, updated_at, notes, services, parts
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload.get("client_id"),
                payload.get("vehicle"),
                payload.get("description"),
                payload.get("labor_cost", 0.0),
                payload.get("parts_cost", 0.0),
                payload.get("additional_cost", 0.0),
                payload.get("status", "em_andamento"),
                now,
                now,
                payload.get("notes"),
                payload.get("services"),
                payload.get("parts"),
            ),
        )
        self.handle_get_order(order_id)

    def handle_update_order(self, order_id: int) -> None:
        payload = self.parse_body()
        fields = [
            "client_id",
            "vehicle",
            "description",
            "labor_cost",
            "parts_cost",
            "additional_cost",
            "status",
            "notes",
            "services",
            "parts",
        ]
        sets = []
        values: list[Any] = []
        for field in fields:
            if field in payload:
                sets.append(f"{field} = ?")
                values.append(payload[field])
        if not sets:
            self.send_error(HTTPStatus.BAD_REQUEST, "Nenhum campo para atualizar")
            return
        sets.append("updated_at = ?")
        values.append(datetime.utcnow().isoformat())
        values.append(order_id)

        execute_non_query(
            f"UPDATE orders SET {', '.join(sets)} WHERE id = ?",
            tuple(values),
        )
        self.handle_get_order(order_id)

    def handle_delete_order(self, order_id: int) -> None:
        execute_non_query("DELETE FROM orders WHERE id = ?", (order_id,))
        self.send_json({"deleted": True})

    def handle_list_clients(self) -> None:
        query = self.path.split("?", 1)
        params: Dict[str, str] = {}
        if len(query) == 2:
            for part in query[1].split("&"):
                if "=" in part:
                    key, value = part.split("=", 1)
                    params[key] = value
        filters = []
        values: list[Any] = []
        if search := params.get("search"):
            search_like = f"%{search.replace('+', ' ')}%"
            filters.append("(name LIKE ? OR phone LIKE ? OR email LIKE ?)")
            values.extend([search_like, search_like, search_like])
        where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""
        clients = execute_query(
            f"SELECT * FROM clients {where_clause} ORDER BY name COLLATE NOCASE",
            tuple(values),
        )
        self.send_json(clients)

    def handle_create_client(self) -> None:
        payload = self.parse_body()
        if not payload.get("name"):
            self.send_error(HTTPStatus.BAD_REQUEST, "Nome é obrigatório")
            return
        client_id = execute_non_query(
            "INSERT INTO clients (name, phone, email, address) VALUES (?, ?, ?, ?)",
            (
                payload.get("name"),
                payload.get("phone"),
                payload.get("email"),
                payload.get("address"),
            ),
        )
        self.handle_list_clients()

    def handle_update_client(self, client_id: int) -> None:
        payload = self.parse_body()
        fields = ["name", "phone", "email", "address"]
        sets = []
        values: list[Any] = []
        for field in fields:
            if field in payload:
                sets.append(f"{field} = ?")
                values.append(payload[field])
        if not sets:
            self.send_error(HTTPStatus.BAD_REQUEST, "Nenhum campo para atualizar")
            return
        values.append(client_id)
        execute_non_query(
            f"UPDATE clients SET {', '.join(sets)} WHERE id = ?",
            tuple(values),
        )
        self.handle_list_clients()

    def handle_delete_client(self, client_id: int) -> None:
        execute_non_query("DELETE FROM clients WHERE id = ?", (client_id,))
        self.send_json({"deleted": True})

    def handle_list_inventory(self) -> None:
        query = self.path.split("?", 1)
        params: Dict[str, str] = {}
        if len(query) == 2:
            for part in query[1].split("&"):
                if "=" in part:
                    key, value = part.split("=", 1)
                    params[key] = value
        filters = []
        values: list[Any] = []
        if search := params.get("search"):
            search_like = f"%{search.replace('+', ' ')}%"
            filters.append("(name LIKE ? OR description LIKE ?)")
            values.extend([search_like, search_like])
        where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""
        items = execute_query(
            f"SELECT * FROM inventory {where_clause} ORDER BY name COLLATE NOCASE",
            tuple(values),
        )
        self.send_json(items)

    def handle_create_inventory_item(self) -> None:
        payload = self.parse_body()
        if not payload.get("name"):
            self.send_error(HTTPStatus.BAD_REQUEST, "Nome é obrigatório")
            return
        execute_non_query(
            "INSERT INTO inventory (name, description, quantity, unit_price) VALUES (?, ?, ?, ?)",
            (
                payload.get("name"),
                payload.get("description"),
                payload.get("quantity", 0),
                payload.get("unit_price", 0.0),
            ),
        )
        self.handle_list_inventory()

    def handle_update_inventory_item(self, item_id: int) -> None:
        payload = self.parse_body()
        fields = ["name", "description", "quantity", "unit_price"]
        sets = []
        values: list[Any] = []
        for field in fields:
            if field in payload:
                sets.append(f"{field} = ?")
                values.append(payload[field])
        if not sets:
            self.send_error(HTTPStatus.BAD_REQUEST, "Nenhum campo para atualizar")
            return
        values.append(item_id)
        execute_non_query(
            f"UPDATE inventory SET {', '.join(sets)} WHERE id = ?",
            tuple(values),
        )
        self.handle_list_inventory()

    def handle_delete_inventory_item(self, item_id: int) -> None:
        execute_non_query("DELETE FROM inventory WHERE id = ?", (item_id,))
        self.send_json({"deleted": True})

    def handle_dashboard(self) -> None:
        data = execute_query(
            "SELECT status, COUNT(*) AS total FROM orders GROUP BY status"
        )
        summary = {row["status"]: row["total"] for row in data}
        total_orders = sum(summary.values())
        recent_orders = execute_query(
            """
            SELECT o.id, o.description, o.status, o.created_at, c.name AS client_name
            FROM orders o
            JOIN clients c ON c.id = o.client_id
            ORDER BY o.created_at DESC
            LIMIT 5
            """
        )
        financials = execute_query(
            """
            SELECT SUM(labor_cost) AS labor, SUM(parts_cost) AS parts, SUM(additional_cost) AS additional
            FROM orders
            """
        )
        financial = financials[0] if financials else {"labor": 0, "parts": 0, "additional": 0}
        financial = {k: round(v or 0, 2) for k, v in financial.items()}
        financial["total"] = round(sum(financial.values()), 2)
        self.send_json(
            {
                "status_summary": summary,
                "total_orders": total_orders,
                "recent_orders": [build_order_summary(order) for order in recent_orders],
                "financial": financial,
            }
        )


def run_server(host: str = "0.0.0.0", port: int = 8000) -> None:
    server_address = (host, port)
    httpd = HTTPServer(server_address, WorkshopHandler)
    print(f"Servidor iniciado em http://{host}:{port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("Encerrando servidor...")
    finally:
        httpd.server_close()


if __name__ == "__main__":
    if not DB_PATH.exists():
        from init_db import main as init_main

        init_main()
    run_server()
