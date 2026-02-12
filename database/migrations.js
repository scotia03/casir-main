const db = require("./db");

db.serialize(() => {
  // Tabel Users
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT
    )
  `);

  // Tabel Products
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      price INTEGER NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0
    )
  `);

  // Tabel Attendance
  db.run(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      check_in TEXT,
      check_out TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Tabel Sales (header transaksi)
  db.run(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      total_amount INTEGER NOT NULL,
      paid_amount INTEGER NOT NULL,
      change_amount INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Tabel Sales Items (detail transaksi)
  db.run(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      price INTEGER NOT NULL,
      qty INTEGER NOT NULL,
      subtotal INTEGER NOT NULL,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  db.run(`
    INSERT OR IGNORE INTO users (id, username, password, role)
    VALUES (1, 'admin', 'admin123', 'admin')
  `);

  db.run(`
    INSERT OR IGNORE INTO users (id, username, password, role)
    VALUES (2, 'kasir', 'kasir123', 'cashier')
  `);

  const seedProducts = [
    ["Air Mineral 600ml", 4000, 100],
    ["Mie Instan", 3500, 120],
    ["Roti Cokelat", 7000, 60],
    ["Kopi Sachet", 2500, 200]
  ];

  seedProducts.forEach(([name, price, stock]) => {
    db.run(
      `
      INSERT INTO products (name, price, stock)
      SELECT ?, ?, ?
      WHERE NOT EXISTS (
        SELECT 1 FROM products WHERE name = ?
      )
      `,
      [name, price, stock, name]
    );
  });

  console.log("Tabel database siap");
});
