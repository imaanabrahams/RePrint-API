import 'dotenv/config';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import { pathToFileURL } from 'url';

export const createPool = () => mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'reprint_api',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 5,
});

// Idempotent insert: skips the row when a matching key row already exists.
// With an empty keyCols it always inserts (used for rows guarded elsewhere).
const insertIfMissing = async (pool, table, cols, values, keyCols) => {
  const placeholders = cols.map(() => '?').join(',');

  if (keyCols.length === 0) {
    const [result] = await pool.query(
      `INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders})`,
      values
    );
    return result.insertId;
  }

  const where = keyCols.map(k => `${k} = ?`).join(' AND ');
  const [existing] = await pool.query(
    `SELECT id FROM ${table} WHERE ${where} LIMIT 1`,
    keyCols.map(k => values[cols.indexOf(k)])
  );
  if (existing.length > 0) return existing[0].id;

  const [result] = await pool.query(
    `INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders})`,
    values
  );
  return result.insertId;
};

// Resolves a set of rows by a stable column (email/name) into a { value: id } map.
const idMap = async (pool, table, column) => {
  const [rows] = await pool.query(`SELECT id, ${column} FROM ${table}`);
  const map = {};
  for (const row of rows) map[row[column]] = row.id;
  return map;
};

// Order group seeding keyed on the unique invoice number so re-runs never duplicate.
const insertOrder = async (pool, order, invoiceNumber) => {
  const [existing] = await pool.query(
    'SELECT id FROM invoices WHERE invoice_number = ? LIMIT 1',
    [invoiceNumber]
  );
  if (existing.length > 0) return existing[0].id;

  const orderId = await insertIfMissing(
    pool,
    'orders',
    ['user_id', 'design_id', 'product_id', 'material_id', 'quantity', 'customizations', 'total_price', 'status', 'shipping_address', 'tracking_number', 'notes'],
    [order.user_id, order.design_id, order.product_id, order.material_id, order.quantity, JSON.stringify(order.customizations), order.total_price, order.status, order.shipping_address, order.tracking_number, order.notes || null],
    []
  );

  await insertIfMissing(
    pool,
    'payments',
    ['order_id', 'user_id', 'amount', 'method', 'status', 'transaction_id', 'billing_name', 'billing_email'],
    [orderId, order.user_id, order.total_price, order.method, order.payment_status, order.transaction_id, order.billing_name, order.billing_email],
    ['transaction_id']
  );

  await insertIfMissing(
    pool,
    'invoices',
    ['invoice_number', 'order_id', 'user_id', 'subtotal', 'tax', 'total', 'status', 'due_date'],
    [invoiceNumber, orderId, order.user_id, order.subtotal, order.tax, order.total, order.invoice_status, order.due_date],
    ['invoice_number']
  );
  return orderId;
};

export const seed = async () => {
  const pool = createPool();
  console.log('Seeding MySQL database...');

  const password = await bcrypt.hash('password123', 10);

  try {
    const users = [
      ['Admin User', 'admin@reprint.com', password, 'admin', null, null],
      ['John Doe', 'john@example.com', password, 'customer', '555-0101', '123 Main St, Springfield, IL 62701'],
      ['Jane Smith', 'jane@example.com', password, 'customer', '555-0102', '456 Oak Ave, Chicago, IL 60601'],
      ['Bob Wilson', 'bob@example.com', password, 'customer', '555-0103', '789 Pine Rd, Milwaukee, WI 53201'],
      ['Sarah van der Merwe', 'sarah@example.com', password, 'customer', '555-0104', '10 Beach Rd, Cape Town'],
      ['David Naidoo', 'david@example.com', password, 'customer', '555-0105', '88 Loop St, Cape Town'],
      ['Lerato Mokoena', 'lerato@example.com', password, 'customer', '555-0106', '12 Freedom Way, Johannesburg'],
      ['Tom Peters', 'tom@example.com', password, 'customer', '555-0107', '5 High St, Durban'],
      ['Priya Singh', 'priya@example.com', password, 'customer', '555-0108', '22 Lotus Park, Umhlanga'],
    ];
    for (const u of users) {
      await insertIfMissing(
        pool,
        'users',
        ['name', 'email', 'password', 'role', 'phone', 'address'],
        u,
        ['email']
      );
    }
    const userId = await idMap(pool, 'users', 'email');
    console.log('Seeded users');

    const materials = [
      ['PLA', 'Biodegradable thermoplastic, great for prototypes', 'Various', 0.03, '{"strength":"medium","flexibility":"low","heat_resistance":"low","food_safe":false}'],
      ['ABS', 'Durable thermoplastic for functional parts', 'Various', 0.04, '{"strength":"high","flexibility":"medium","heat_resistance":"high","food_safe":false}'],
      ['PETG', 'Chemical resistant, easy to print', 'Various', 0.05, '{"strength":"high","flexibility":"medium","heat_resistance":"medium","food_safe":true}'],
      ['Resin', 'High detail SLA resin for miniatures', 'Various', 0.08, '{"strength":"medium","flexibility":"low","heat_resistance":"low","food_safe":false}'],
      ['TPU', 'Flexible rubber-like material', 'Various', 0.06, '{"strength":"medium","flexibility":"high","heat_resistance":"low","food_safe":false}'],
      ['Nylon', 'Strong and lightweight engineering material', 'White', 0.07, '{"strength":"very_high","flexibility":"high","heat_resistance":"high","food_safe":false}'],
      ['PC (Polycarbonate)', 'Impact-resistant engineering plastic for demanding parts', 'Various', 0.09, '{"strength":"very_high","flexibility":"low","heat_resistance":"very_high","food_safe":false}'],
      ['Woodfill PLA', 'Wood-infused filament with a matte timber finish', 'Brown', 0.05, '{"strength":"medium","flexibility":"low","heat_resistance":"low","food_safe":false}'],
    ];
    for (const m of materials) {
      await insertIfMissing(
        pool,
        'materials',
        ['name', 'description', 'color', 'price_per_gram', 'properties'],
        m,
        ['name']
      );
    }
    const materialId = await idMap(pool, 'materials', 'name');
    console.log('Seeded materials');

    const products = [
      {
        name: 'Paper Towel Holder',
        description: 'A modern, 3D-printed paper towel holder that looks great in any kitchen. Sturdy, easy to load and built to last.',
        category: 'Home Decor', base_price: 549, image_url: '/images/p1.png',
        customizable: 1, estimated_days: 3, rating: 4.8, reviews: 126, featured: 0,
        options: JSON.stringify(['Single', 'Set of 2']),
      },
      {
        name: 'Sunglass Organiser',
        description: 'A neat, 3D-printed organiser that keeps your sunglasses safe, scratch-free and easy to grab.',
        category: 'Home Decor', base_price: 449, image_url: '/images/p2.png',
        customizable: 1, estimated_days: 3, rating: 4.6, reviews: 203, featured: 0,
        options: JSON.stringify(['Small', 'Medium', 'Large']),
      },
      {
        name: 'Outlet Box',
        description: 'A practical, 3D-printed outlet box that tidies cables and adds extra storage beside your power points. Neatly organised and easy to install.',
        category: 'Home Decor', base_price: 799, image_url: '/images/p3.png',
        customizable: 1, estimated_days: 3, rating: 4.9, reviews: 88, featured: 0,
        options: JSON.stringify(['Single', 'Double']),
      },
      {
        name: 'Desk Accessories',
        description: 'Stylish, printed desk accessories that keep your workspace tidy. From pen pots to cable clips, built to be both practical and good-looking.',
        category: 'Office', base_price: 899, image_url: '/images/p4.png',
        customizable: 1, estimated_days: 3, rating: 4.7, reviews: 152, featured: 0,
        options: JSON.stringify(['Starter', 'Complete', 'Deluxe']),
      },
      {
        name: 'Headphones & Watch Holder',
        description: 'A compact, 3D-printed holder that stores your headphones and watch together in one tidy spot. Keeps them off the desk and always within reach.',
        category: 'Home Decor', base_price: 349, image_url: '/images/p5.png',
        customizable: 1, estimated_days: 3, rating: 4.5, reviews: 319, featured: 0,
        options: JSON.stringify(['Black', 'White', 'Green']),
      },
      {
        name: 'Eco-Friendly Plant Pot',
        description: 'A sustainable, 3D-printed plant pot made from eco-friendly materials. Stylish, durable and perfect for your favourite plants.',
        category: 'Garden', base_price: 299, image_url: '/images/p6.png',
        customizable: 1, estimated_days: 3, rating: 4.4, reviews: 241, featured: 0,
        options: JSON.stringify(['Small', 'Medium', 'Large']),
      },
      {
        name: 'Fidget Toy',
        description: 'A fun, 3D-printed animal fidget toy. Satisfying to twist, pop and play with to keep your hands busy.',
        category: 'Toys', base_price: 179, image_url: '/images/fidget.png',
        customizable: 1, estimated_days: 3, rating: 4.8, reviews: 126, featured: 1,
        options: JSON.stringify(['Rabbit', 'Cat', 'Bear']),
      },
      {
        name: 'Keyring',
        description: 'A cute, 3D-printed animal keyring. Fun to handle and handy to clip onto your keys or bag.',
        category: 'Toys', base_price: 179, image_url: '/images/keyring.png',
        customizable: 1, estimated_days: 3, rating: 4.7, reviews: 118, featured: 1,
        options: JSON.stringify(['Rabbit', 'Cat', 'Bear']),
      },
      {
        name: 'Jewellery Holder',
        description: 'A stylish, 3D-printed jewellery holder that keeps your rings, earrings and necklaces organised, tangle-free and easy to grab.',
        category: 'Home Decor', base_price: 449, image_url: '/images/best2.png',
        customizable: 1, estimated_days: 3, rating: 4.6, reviews: 203, featured: 1,
        options: JSON.stringify(['Small', 'Medium', 'Large']),
      },
      {
        name: 'Game Controller Stand',
        description: 'A sturdy, 3D-printed stand that holds your game controller neatly when you are done playing. Keeps your setup tidy and your controller safe.',
        category: 'Gaming', base_price: 549, image_url: '/images/best3.png',
        customizable: 1, estimated_days: 3, rating: 4.9, reviews: 88, featured: 1,
        options: JSON.stringify(['Single', 'Double']),
      },
      {
        name: 'Sweet Dispenser',
        description: 'A fun, 3D-printed sweet dispenser that makes it easy to hand out your favourite treats. Perfect for parties, kids and playful kitchens.',
        category: 'Toys', base_price: 199, image_url: '/images/p7.png',
        customizable: 1, estimated_days: 3, rating: 4.6, reviews: 98, featured: 0,
        options: JSON.stringify(['Small', 'Large']),
      },
      {
        name: 'Custom Phone Ring Holder',
        description: 'A slim, 3D-printed phone ring holder that clips onto your case and adds a comfortable grip. Available in playful patterns.',
        category: 'Accessories', base_price: 249, image_url: '/images/best1.png',
        customizable: 1, estimated_days: 2, rating: 4.5, reviews: 76, featured: 0,
        options: JSON.stringify(['Plain', 'Pattern', 'Custom text']),
      },
      {
        name: 'Modular Drawer Organiser',
        description: 'Mix and match 3D-printed trays to build the perfect drawer organiser for pens, tools, makeup or bits and bobs.',
        category: 'Office', base_price: 699, image_url: '/images/p8.png',
        customizable: 1, estimated_days: 4, rating: 4.7, reviews: 54, featured: 0,
        options: JSON.stringify(['Starter', 'Complete', 'Deluxe']),
      },
    ];
    for (const p of products) {
      await insertIfMissing(
        pool,
        'products',
        ['name', 'description', 'category', 'base_price', 'image_url', 'customizable', 'estimated_days', 'rating', 'reviews', 'featured', 'options'],
        [p.name, p.description, p.category, p.base_price, p.image_url, p.customizable, p.estimated_days, p.rating, p.reviews, p.featured, p.options],
        ['name']
      );
    }
    const productId = await idMap(pool, 'products', 'name');
    console.log('Seeded products');

    const P = productId;
    const M = materialId;
    const designs = [
      { userId: 'john@example.com', name: 'My Logo Keychain', description: 'Keychain version of my business logo', product: 'Keyring', material: 'PLA', dimensions: '{"x":5,"y":3,"z":1}', customizations: '{"text":"RePrint","font":"bold","infill":100}', estimated_price: 8.99, status: 'approved' },
      { userId: 'jane@example.com', name: 'Custom Phone Case Design', description: 'Geometric pattern phone case for iPhone 15', product: 'Paper Towel Holder', material: 'PLA', dimensions: '{"x":7.5,"y":15,"z":1.2}', customizations: '{"pattern":"geometric","color":"blue","thickness":1.2}', estimated_price: 22.5, status: 'submitted' },
      { userId: 'bob@example.com', name: 'Dragon Miniature', description: 'Detailed dragon for D&D campaign', product: 'Desk Accessories', material: 'Resin', dimensions: '{"x":5,"y":5,"z":8}', customizations: '{"detail_level":"high","base":"included"}', estimated_price: 35, status: 'printing' },
      { userId: 'sarah@example.com', name: 'Wedding Table Numbers', description: 'Elegant table numbers for 20 tables', product: 'Outlet Box', material: 'Nylon', dimensions: '{"x":9,"y":9,"z":2}', customizations: '{"font":"script","color":"gold"}', estimated_price: 45, status: 'submitted' },
      { userId: 'david@example.com', name: 'Night Lamp Shade', description: 'Wavy lampshade for a bedside lamp', product: 'Fidget Toy', material: 'ABS', dimensions: '{"x":12,"y":12,"z":15}', customizations: '{"pattern":"waves","color":"warm_white"}', estimated_price: 30, status: 'approved' },
      { userId: 'lerato@example.com', name: 'Enclosure For Electronics', description: 'Custom case for an Arduino project', product: 'Custom Phone Ring Holder', material: 'PLA', dimensions: '{"x":60,"y":45,"z":20}', customizations: '{"wall_thickness":2,"ventilation":true}', estimated_price: 38, status: 'completed' },
    ];
    for (const d of designs) {
      await insertIfMissing(
        pool,
        'designs',
        ['user_id', 'name', 'description', 'product_id', 'material_id', 'dimensions', 'customizations', 'estimated_price', 'status'],
        [userId[d.userId], d.name, d.description, P[d.product], M[d.material], d.dimensions, d.customizations, d.estimated_price, d.status],
        ['user_id', 'name']
      );
    }
    console.log('Seeded designs');

    const orders = [
      { user: 'john@example.com', design: null, product: 'Keyring', material: 'PLA', quantity: 5, customizations: { text: 'JOHN D', color: 'red' }, total_price: 29.95, status: 'delivered', shipping_address: '123 Main St, Springfield, IL 62701', tracking_number: 'USP123456789', method: 'credit_card', payment_status: 'completed', transaction_id: 'TXN-001-ABC123', billing_name: 'John Doe', billing_email: 'john@example.com', subtotal: 29.95, tax: 2.4, total: 32.35, invoice_status: 'paid', due_date: '2024-02-15', notes: null },
      { user: 'jane@example.com', design: null, product: 'Paper Towel Holder', material: 'PLA', quantity: 1, customizations: { phone_model: 'iPhone 15', color: 'blue' }, total_price: 18.99, status: 'shipped', shipping_address: '456 Oak Ave, Chicago, IL 60601', tracking_number: 'USP987654321', method: 'paypal', payment_status: 'completed', transaction_id: 'TXN-002-DEF456', billing_name: 'Jane Smith', billing_email: 'jane@example.com', subtotal: 18.99, tax: 1.52, total: 20.51, invoice_status: 'paid', due_date: '2024-02-20', notes: null },
      { user: 'bob@example.com', design: null, product: 'Outlet Box', material: 'Resin', quantity: 1, customizations: { resolution: 'high', color: 'grey' }, total_price: 38.0, status: 'printing', shipping_address: '789 Pine Rd, Milwaukee, WI 53201', tracking_number: null, method: 'stripe', payment_status: 'completed', transaction_id: 'TXN-003-GHI789', billing_name: 'Bob Wilson', billing_email: 'bob@example.com', subtotal: 38.0, tax: 3.04, total: 41.04, invoice_status: 'unpaid', due_date: '2024-03-10', notes: null },
      { user: 'john@example.com', design: null, product: 'Outlet Box', material: 'Resin', quantity: 1, customizations: { photo: 'family_portrait.jpg', size: '6x8' }, total_price: 27.99, status: 'confirmed', shipping_address: '123 Main St, Springfield, IL 62701', tracking_number: null, method: 'credit_card', payment_status: 'completed', transaction_id: 'TXN-004-JKL012', billing_name: 'John Doe', billing_email: 'john@example.com', subtotal: 27.99, tax: 2.24, total: 30.23, invoice_status: 'paid', due_date: '2024-03-12', notes: null },
      { user: 'jane@example.com', design: null, product: 'Headphones & Watch Holder', material: 'PLA', quantity: 2, customizations: { style: 'geometric', size: 'medium' }, total_price: 22.98, status: 'pending', shipping_address: '456 Oak Ave, Chicago, IL 60601', tracking_number: null, method: 'debit_card', payment_status: 'pending', transaction_id: 'TXN-005-MNO345', billing_name: 'Jane Smith', billing_email: 'jane@example.com', subtotal: 22.98, tax: 1.84, total: 24.82, invoice_status: 'unpaid', due_date: '2024-03-15', notes: null },
      { user: 'sarah@example.com', design: null, product: 'Sweet Dispenser', material: 'ABS', quantity: 3, customizations: { text: 'The Smiths', size: 'large' }, total_price: 44.0, status: 'printing', shipping_address: '10 Beach Rd, Cape Town', tracking_number: null, method: 'credit_card', payment_status: 'completed', transaction_id: 'TXN-006-PQR678', billing_name: 'Sarah van der Merwe', billing_email: 'sarah@example.com', subtotal: 44.0, tax: 3.52, total: 47.52, invoice_status: 'paid', due_date: '2024-03-18', notes: null },
      { user: 'david@example.com', design: null, product: 'Fidget Toy', material: 'PLA', quantity: 2, customizations: { animal: 'cat', color: 'grey' }, total_price: 17.0, status: 'quality_check', shipping_address: '88 Loop St, Cape Town', tracking_number: null, method: 'paypal', payment_status: 'completed', transaction_id: 'TXN-007-STU901', billing_name: 'David Naidoo', billing_email: 'david@example.com', subtotal: 17.0, tax: 1.36, total: 18.36, invoice_status: 'paid', due_date: '2024-03-20', notes: null },
      { user: 'lerato@example.com', design: null, product: 'Jewellery Holder', material: 'PETG', quantity: 1, customizations: { size: 'medium', finish: 'matte' }, total_price: 89.99, status: 'confirmed', shipping_address: '12 Freedom Way, Johannesburg', tracking_number: null, method: 'bank_transfer', payment_status: 'completed', transaction_id: 'TXN-008-VWX234', billing_name: 'Lerato Mokoena', billing_email: 'lerato@example.com', subtotal: 89.99, tax: 7.2, total: 97.19, invoice_status: 'paid', due_date: '2024-03-22', notes: null },
      { user: 'tom@example.com', design: null, product: 'Game Controller Stand', material: 'PLA', quantity: 1, customizations: { type: 'double', color: 'black' }, total_price: 54.99, status: 'pending', shipping_address: '5 High St, Durban', tracking_number: null, method: 'credit_card', payment_status: 'pending', transaction_id: 'TXN-009-YZA567', billing_name: 'Tom Peters', billing_email: 'tom@example.com', subtotal: 54.99, tax: 4.4, total: 59.39, invoice_status: 'unpaid', due_date: '2024-03-25', notes: null },
      { user: 'priya@example.com', design: null, product: 'Sunglass Organiser', material: 'TPU', quantity: 4, customizations: { size: 'small', color: 'white' }, total_price: 39.96, status: 'shipped', shipping_address: '22 Lotus Park, Umhlanga', tracking_number: 'USP111222333', method: 'stripe', payment_status: 'completed', transaction_id: 'TXN-010-BCD890', billing_name: 'Priya Singh', billing_email: 'priya@example.com', subtotal: 39.96, tax: 3.2, total: 43.16, invoice_status: 'paid', due_date: '2024-03-28', notes: null },
      { user: 'jane@example.com', design: null, product: 'Custom Phone Ring Holder', material: 'Nylon', quantity: 2, customizations: { style: 'plain', color: 'black' }, total_price: 49.98, status: 'cancelled', shipping_address: '456 Oak Ave, Chicago, IL 60601', tracking_number: null, method: 'paypal', payment_status: 'refunded', transaction_id: 'TXN-011-CDE123', billing_name: 'Jane Smith', billing_email: 'jane@example.com', subtotal: 49.98, tax: 4.0, total: 53.98, invoice_status: 'cancelled', due_date: '2024-03-30', notes: 'Customer cancelled - ordered wrong size' },
      { user: 'bob@example.com', design: null, product: 'Modular Drawer Organiser', material: 'PLA', quantity: 1, customizations: { set: 'complete' }, total_price: 69.99, status: 'quality_check', shipping_address: '789 Pine Rd, Milwaukee, WI 53201', tracking_number: null, method: 'debit_card', payment_status: 'completed', transaction_id: 'TXN-012-EFG456', billing_name: 'Bob Wilson', billing_email: 'bob@example.com', subtotal: 69.99, tax: 5.6, total: 75.59, invoice_status: 'paid', due_date: '2024-04-02', notes: null },
      { user: 'john@example.com', design: null, product: 'Keyring', material: 'PETG', quantity: 3, customizations: { animal: 'bear', color: 'blue' }, total_price: 14.97, status: 'delivered', shipping_address: '123 Main St, Springfield, IL 62701', tracking_number: 'USP444555666', method: 'credit_card', payment_status: 'completed', transaction_id: 'TXN-013-GHI789', billing_name: 'John Doe', billing_email: 'john@example.com', subtotal: 14.97, tax: 1.2, total: 16.17, invoice_status: 'paid', due_date: '2024-04-05', notes: null },
      { user: 'sarah@example.com', design: null, product: 'Desk Accessories', material: 'Resin', quantity: 1, customizations: { theme: 'stationery', size: 'medium' }, total_price: 32.95, status: 'confirmed', shipping_address: '10 Beach Rd, Cape Town', tracking_number: null, method: 'stripe', payment_status: 'completed', transaction_id: 'TXN-014-JKL012', billing_name: 'Sarah van der Merwe', billing_email: 'sarah@example.com', subtotal: 32.95, tax: 2.64, total: 35.59, invoice_status: 'paid', due_date: '2024-04-08', notes: null },
    ];
    let invoiceNo = 1;
    for (const o of orders) {
      const number = `RP-${String(invoiceNo).padStart(3, '0')}-INV`;
      invoiceNo++;
      await insertOrder(pool, {
        user_id: userId[o.user],
        design_id: o.design,
        product_id: P[o.product],
        material_id: M[o.material],
        quantity: o.quantity,
        customizations: o.customizations,
        total_price: o.total_price,
        status: o.status,
        shipping_address: o.shipping_address,
        tracking_number: o.tracking_number,
        method: o.method,
        payment_status: o.payment_status,
        transaction_id: o.transaction_id,
        billing_name: o.billing_name,
        billing_email: o.billing_email,
        subtotal: o.subtotal,
        tax: o.tax,
        total: o.total,
        invoice_status: o.invoice_status,
        due_date: o.due_date,
        notes: o.notes,
      }, number);
    }
    console.log('Seeded orders, payments and invoices');

    const reviews = [
      { user: 'john@example.com', product: 'Keyring', rating: 5, comment: 'Perfect keychain! Exactly what I wanted.' },
      { user: 'jane@example.com', product: 'Paper Towel Holder', rating: 4, comment: 'Great quality phone case, took a bit longer than expected.' },
      { user: 'bob@example.com', product: 'Fidget Toy', rating: 5, comment: 'Incredible prototyping service, brought my idea to life!' },
      { user: 'sarah@example.com', product: 'Sweet Dispenser', rating: 5, comment: 'The sweet dispenser was a hit at the party.' },
      { user: 'david@example.com', product: 'Fidget Toy', rating: 4, comment: 'Cute fidget toys, one had a small layer line.' },
      { user: 'lerato@example.com', product: 'Jewellery Holder', rating: 5, comment: 'Gorgeous jewellery holder, very well finished.' },
      { user: 'tom@example.com', product: 'Game Controller Stand', rating: 4, comment: 'Sturdy controller stand, easy to assemble.' },
      { user: 'priya@example.com', product: 'Sunglass Organiser', rating: 5, comment: 'Lovely sunglass organiser, looks great on the desk.' },
    ];
    for (const r of reviews) {
      await insertIfMissing(
        pool,
        'reviews',
        ['user_id', 'product_id', 'rating', 'comment'],
        [userId[r.user], P[r.product], r.rating, r.comment],
        ['user_id', 'product_id', 'comment']
      );
    }
    console.log('Seeded reviews');

    const employees = [
      ['EMP-001', 'CEO', 'management', '2022-01-15', 95000, 'full_time', 'active', 'Derek Adams', '555-0201'],
      ['EMP-002', '3D Print Technician', 'production', '2023-03-10', 52000, 'full_time', 'active', 'Sarah Mokoena', '555-0202'],
      ['EMP-003', 'Design Specialist', 'design', '2023-06-22', 58000, 'full_time', 'active', 'Liam Adams', '555-0203'],
      ['EMP-004', 'Production Manager', 'production', '2023-08-01', 68000, 'full_time', 'active', 'Andile Botha', '555-0204'],
      ['EMP-005', 'Sales Representative', 'sales', '2024-01-09', 45000, 'full_time', 'active', 'Nonkululeko Dlamini', '555-0205'],
      ['EMP-006', 'HR Coordinator', 'hr', '2024-02-19', 50000, 'part_time', 'active', 'Mari van Wyk', '555-0206'],
      ['EMP-007', 'Junior Designer', 'design', '2024-04-01', 32000, 'contract', 'active', 'Thandi Nkosi', '555-0207'],
      ['EMP-008', 'Support Engineer', 'support', '2024-05-27', 39000, 'full_time', 'on_leave', 'Jess Jacobs', '555-0208'],
      ['EMP-009', 'Finance Officer', 'hr', '2024-07-15', 47000, 'full_time', 'active', 'Pieter Fourie', '555-0209'],
      ['EMP-010', 'Warehouse Associate', 'production', '2024-09-02', 30000, 'part_time', 'on_leave', 'Gugu Mthembu', '555-0210'],
    ];
    for (const e of employees) {
      await insertIfMissing(
        pool,
        'employees',
        ['user_id', 'employee_id', 'position', 'department', 'hire_date', 'salary', 'employment_type', 'status', 'emergency_contact', 'emergency_phone'],
        [1, e[0], e[1], e[2], e[3], e[4], e[5], e[6], e[7], e[8]],
        ['employee_id']
      );
    }
    console.log('Seeded employees');

    const [empRows] = await pool.query('SELECT id, employee_id, department FROM employees ORDER BY id');
    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr);
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));

    let shiftCount = 0;
    for (const emp of empRows) {
      const start = emp.department === 'production' ? '08:00' : '09:00';
      const end = emp.department === 'production' ? '16:00' : '17:00';
      const weekdayBreaks = emp.department === 'production' ? 30 : 60;

      for (let i = 0; i < 9; i++) {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() - 2 + i);
        const dow = day.getDay();
        if (dow === 0) continue;
        if (dow === 6 && emp.department !== 'production') continue;

        const dateStr = day.toISOString().split('T')[0];
        const isPast = dateStr < todayStr;
        const isToday = dateStr === todayStr;
        const status = isPast ? 'completed' : (isToday ? 'confirmed' : 'scheduled');

        await insertIfMissing(
          pool,
          'shifts',
          ['employee_id', 'shift_date', 'start_time', 'end_time', 'break_minutes', 'status'],
          [emp.id, dateStr, start, end, weekdayBreaks, status],
          ['employee_id', 'shift_date', 'start_time']
        );
        shiftCount++;
      }
    }
    console.log(`Seeded shifts (${shiftCount} generated)`);

    const consultations = [
      { user: 'john@example.com', name: 'John Doe', email: 'john@example.com', phone: '555-0101', topic: 'Product Prototyping', description: 'Need help designing a custom enclosure for electronics project', preferred_date: '2024-03-01', preferred_time: '10:00', consultation_type: 'video', status: 'confirmed' },
      { user: 'jane@example.com', name: 'Jane Smith', email: 'jane@example.com', phone: '555-0102', topic: 'Bulk Order Inquiry', description: 'Looking to order 50 custom phone cases for a corporate event', preferred_date: '2024-03-05', preferred_time: '14:00', consultation_type: 'phone', status: 'pending' },
      { user: null, name: 'Alex Guest', email: 'alex@guest.com', phone: '555-0199', topic: 'Material Consultation', description: 'Not sure which material is best for outdoor use', preferred_date: '2024-03-03', preferred_time: '11:00', consultation_type: 'chat', status: 'completed' },
      { user: 'sarah@example.com', name: 'Sarah van der Merwe', email: 'sarah@example.com', phone: '555-0104', topic: 'Custom Wedding Favours', description: 'Need 40 custom printed favours for a wedding in June', preferred_date: '2024-04-10', preferred_time: '09:30', consultation_type: 'video', status: 'confirmed' },
      { user: 'lerato@example.com', name: 'Lerato Mokoena', email: 'lerato@example.com', phone: '555-0106', topic: 'Material Consultation', description: 'Comparing PETG vs ABS for an outdoor planter project', preferred_date: '2024-04-12', preferred_time: '13:00', consultation_type: 'phone', status: 'pending' },
      { user: 'priya@example.com', name: 'Priya Singh', email: 'priya@example.com', phone: '555-0108', topic: 'Product Prototyping', description: 'Prototype a modular medicine organiser', preferred_date: '2024-04-15', preferred_time: '15:00', consultation_type: 'in_person', status: 'completed' },
      { user: 'david@example.com', name: 'David Naidoo', email: 'david@example.com', phone: '555-0105', topic: 'Bulk Order Inquiry', description: '250 branded phone ring holders for a campus store', preferred_date: '2024-04-18', preferred_time: '10:30', consultation_type: 'chat', status: 'cancelled' },
    ];
    for (const c of consultations) {
      await insertIfMissing(
        pool,
        'consultations',
        ['user_id', 'name', 'email', 'phone', 'topic', 'description', 'preferred_date', 'preferred_time', 'consultation_type', 'status'],
        [c.user ? userId[c.user] : null, c.name, c.email, c.phone, c.topic, c.description, c.preferred_date, c.preferred_time, c.consultation_type, c.status],
        ['email', 'topic']
      );
    }
    console.log('Seeded consultations');

    const notifications = [
      { user: 'john@example.com', title: 'Order Shipped', message: 'Your order #2 has been shipped! Track: USP123456789', type: 'order' },
      { user: 'jane@example.com', title: 'Consultation Confirmed', message: 'Your consultation about Bulk Order Inquiry has been confirmed for 2024-03-05 at 14:00', type: 'consultation' },
      { user: 'john@example.com', title: 'Payment Received', message: 'Your payment of R29.95 for order #1 was successful', type: 'payment' },
      { user: 'sarah@example.com', title: 'Order Ready', message: 'Your order #6 is ready for collection', type: 'order' },
      { user: 'david@example.com', title: 'Design Approved', message: 'Your Night Lamp Shade design was approved', type: 'info' },
      { user: 'lerato@example.com', title: 'Payment Received', message: 'Your payment of R97.19 for order #8 was successful', type: 'payment' },
    ];
    for (const n of notifications) {
      await insertIfMissing(
        pool,
        'notifications',
        ['user_id', 'title', 'message', 'type'],
        [userId[n.user], n.title, n.message, n.type],
        ['user_id', 'title']
      );
    }
    console.log('Seeded notifications');

    console.log('Database seeded successfully!');
  } catch (err) {
    console.error('Seeding error:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  seed()
    .then(() => console.log('done'))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}