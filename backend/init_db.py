import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "workshop.db"

def main() -> None:
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.execute("PRAGMA foreign_keys = ON;")

    cur.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            password TEXT NOT NULL,
            role TEXT NOT NULL,
            full_name TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT,
            email TEXT,
            address TEXT
        );

        CREATE TABLE IF NOT EXISTS inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            quantity INTEGER NOT NULL DEFAULT 0,
            unit_price REAL NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            vehicle TEXT,
            description TEXT,
            labor_cost REAL NOT NULL DEFAULT 0,
            parts_cost REAL NOT NULL DEFAULT 0,
            additional_cost REAL NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'em_andamento',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            notes TEXT,
            services TEXT,
            parts TEXT,
            FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
        );
        """
    )

    cur.execute("SELECT COUNT(*) FROM users")
    if cur.fetchone()[0] == 0:
        cur.executemany(
            "INSERT INTO users (username, password, role, full_name) VALUES (?, ?, ?, ?)",
            [
                ("admin", "admin123", "admin", "Administrador"),
                ("mecanico", "mecanico123", "mecanico", "Mecânico"),
            ],
        )

    cur.execute("SELECT COUNT(*) FROM clients")
    if cur.fetchone()[0] == 0:
        cur.executemany(
            "INSERT INTO clients (name, phone, email, address) VALUES (?, ?, ?, ?)",
            [
                ("João da Silva", "11999999999", "joao@example.com", "Rua das Flores, 123"),
                ("Maria Oliveira", "11888888888", "maria@example.com", "Avenida Central, 456"),
                ("Carlos Souza", "11777777777", "carlos@example.com", "Rua do Motor, 789"),
            ],
        )

    cur.execute("SELECT COUNT(*) FROM inventory")
    if cur.fetchone()[0] == 0:
        cur.executemany(
            "INSERT INTO inventory (name, description, quantity, unit_price) VALUES (?, ?, ?, ?)",
            [
                ("Filtro de Óleo", "Compatível com modelos X e Y", 15, 35.0),
                ("Pastilha de Freio", "Conjunto dianteiro", 20, 120.0),
                ("Correia Dentada", "Linha Sedan", 10, 250.0),
            ],
        )

    cur.execute("SELECT COUNT(*) FROM orders")
    if cur.fetchone()[0] == 0:
        cur.executemany(
            """
            INSERT INTO orders (
                client_id, vehicle, description, labor_cost, parts_cost, additional_cost,
                status, created_at, updated_at, notes, services, parts
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?, ?, ?)
            """,
            [
                (
                    1,
                    "Fiat Uno 2010",
                    "Troca de óleo e revisão básica",
                    150.0,
                    100.0,
                    0.0,
                    "em_andamento",
                    "Cliente solicitou revisão completa",
                    "Troca de óleo; Revisão de filtros",
                    "Filtro de Óleo",
                ),
                (
                    2,
                    "Chevrolet Onix 2018",
                    "Substituição de pastilhas de freio",
                    200.0,
                    240.0,
                    30.0,
                    "aguardando_aprovacao",
                    "Aguardando aprovação do orçamento",
                    "Substituição de pastilhas",
                    "Pastilha de Freio",
                ),
                (
                    3,
                    "Volkswagen Gol 2012",
                    "Troca de correia dentada",
                    300.0,
                    250.0,
                    50.0,
                    "entregue",
                    "Serviço concluído e entregue",
                    "Troca de correia",
                    "Correia Dentada",
                ),
            ],
        )

    conn.commit()
    conn.close()

    print(f"Banco inicializado em {DB_PATH}")

if __name__ == "__main__":
    main()
