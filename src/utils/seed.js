import 'dotenv/config';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const createPool = () => mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'reprint_api',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 5,
});

const seed = async () => {
  const pool = createPool();
  console.log('Seeding MySQL database...');

  const password = await bcrypt.hash('password123', 10);

  try {
    await pool.query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      ['Admin User', 'admin@reprint.com', password, 'admin']);
    await pool.query('INSERT INTO users (name, email, password, role, phone, address) VALUES (?, ?, ?, ?, ?, ?)',
      ['John Doe', 'john@example.com', password, 'customer', '555-0101', '123 Main St, Springfield, IL 62701']);
    await pool.query('INSERT INTO users (name, email, password, role, phone, address) VALUES (?, ?, ?, ?, ?, ?)',
      ['Jane Smith', 'jane@example.com', password, 'customer', '555-0102', '456 Oak Ave, Chicago, IL 60601']);
    await pool.query('INSERT INTO users (name, email, password, role, phone, address) VALUES (?, ?, ?, ?, ?, ?)',
      ['Bob Wilson', 'bob@example.com', password, 'customer', '555-0103', '789 Pine Rd, Milwaukee, WI 53201']);
    console.log('Seeded users');

    const materials = [
      ['PLA', 'Biodegradable thermoplastic, great for prototypes', 'Various', 0.03, '{"strength":"medium","flexibility":"low","heat_resistance":"low","food_safe":false}'],
      ['ABS', 'Durable thermoplastic for functional parts', 'Various', 0.04, '{"strength":"high","flexibility":"medium","heat_resistance":"high","food_safe":false}'],
      ['PETG', 'Chemical resistant, easy to print', 'Various', 0.05, '{"strength":"high","flexibility":"medium","heat_resistance":"medium","food_safe":true}'],
      ['Resin', 'High detail SLA resin for miniatures', 'Various', 0.08, '{"strength":"medium","flexibility":"low","heat_resistance":"low","food_safe":false}'],
      ['TPU', 'Flexible rubber-like material', 'Various', 0.06, '{"strength":"medium","flexibility":"high","heat_resistance":"low","food_safe":false}'],
      ['Nylon', 'Strong and lightweight engineering material', 'White', 0.07, '{"strength":"very_high","flexibility":"high","heat_resistance":"high","food_safe":false}'],
    ];
    for (const m of materials) {
      await pool.query('INSERT INTO materials (name, description, color, price_per_gram, properties) VALUES (?, ?, ?, ?, ?)', m);
    }
    console.log('Seeded materials');

    const products = [
      {
        name: 'Paper Towel Holder',
        description: 'A modern, 3D-printed paper towel holder that looks great in any kitchen. Sturdy, easy to load and built to last.',
        category: 'Home Decor',
        base_price: 549,
        image_url: '/images/p1.png',
        customizable: 1,
        estimated_days: 3,
        rating: 4.8,
        reviews: 126,
        featured: 0,
        options: JSON.stringify(['Single', 'Set of 2']),
      },
      {
        name: 'Sunglass Organiser',
        description: 'A neat, 3D-printed organiser that keeps your sunglasses safe, scratch-free and easy to grab.',
        category: 'Home Decor',
        base_price: 449,
        image_url: '/images/p2.png',
        customizable: 1,
        estimated_days: 3,
        rating: 4.6,
        reviews: 203,
        featured: 0,
        options: JSON.stringify(['Small', 'Medium', 'Large']),
      },
      {
        name: 'Outlet Box',
        description: 'A practical, 3D-printed outlet box that tidies cables and adds extra storage beside your power points. Neatly organised and easy to install.',
        category: 'Home Decor',
        base_price: 799,
        image_url: '/images/p3.png',
        customizable: 1,
        estimated_days: 3,
        rating: 4.9,
        reviews: 88,
        featured: 0,
        options: JSON.stringify(['Single', 'Double']),
      },
      {
        name: 'Desk Accessories',
        description: 'Stylish, printed desk accessories that keep your workspace tidy. From pen pots to cable clips, built to be both practical and good-looking.',
        category: 'Office',
        base_price: 899,
        image_url: '/images/p4.png',
        customizable: 1,
        estimated_days: 3,
        rating: 4.7,
        reviews: 152,
        featured: 0,
        options: JSON.stringify(['Starter', 'Complete', 'Deluxe']),
      },
      {
        name: 'Headphones & Watch Holder',
        description: 'A compact, 3D-printed holder that stores your headphones and watch together in one tidy spot. Keeps them off the desk and always within reach.',
        category: 'Home Decor',
        base_price: 349,
        image_url: '/images/p5.png',
        customizable: 1,
        estimated_days: 3,
        rating: 4.5,
        reviews: 319,
        featured: 0,
        options: JSON.stringify(['Black', 'White', 'Green']),
      },
      {
        name: 'Eco-Friendly Plant Pot',
        description: 'A sustainable, 3D-printed plant pot made from eco-friendly materials. Stylish, durable and perfect for your favourite plants.',
        category: 'Garden',
        base_price: 299,
        image_url: '/images/p6.png',
        customizable: 1,
        estimated_days: 3,
        rating: 4.4,
        reviews: 241,
        featured: 0,
        options: JSON.stringify(['Small', 'Medium', 'Large']),
      },
      {
        name: 'Animal Fidget & Keyring',
        description: 'A fun, 3D-printed animal fidget and keyring in one. Satisfying to play with and handy to clip onto your keys or bag.',
        category: 'Toys',
        base_price: 179,
        image_url: '/images/best1.png',
        customizable: 1,
        estimated_days: 3,
        rating: 4.8,
        reviews: 126,
        featured: 1,
        options: JSON.stringify(['Rabbit', 'Cat', 'Bear']),
      },
      {
        name: 'Jewellery Holder',
        description: 'A stylish, 3D-printed jewellery holder that keeps your rings, earrings and necklaces organised, tangle-free and easy to grab.',
        category: 'Home Decor',
        base_price: 449,
        image_url: '/images/best2.png',
        customizable: 1,
        estimated_days: 3,
        rating: 4.6,
        reviews: 203,
        featured: 1,
        options: JSON.stringify(['Small', 'Medium', 'Large']),
      },
      {
        name: 'Game Controller Stand',
        description: 'A sturdy, 3D-printed stand that holds your game controller neatly when you are done playing. Keeps your setup tidy and your controller safe.',
        category: 'Gaming',
        base_price: 549,
        image_url: '/images/best3.png',
        customizable: 1,
        estimated_days: 3,
        rating: 4.9,
        reviews: 88,
        featured: 1,
        options: JSON.stringify(['Single', 'Double']),
      },
      {
        name: 'Sweet Dispenser',
        description: 'A fun, 3D-printed sweet dispenser that makes it easy to hand out your favourite treats. Perfect for parties, kids and playful kitchens.',
        category: 'Toys',
        base_price: 199,
        image_url: '/images/p7.png',
        customizable: 1,
        estimated_days: 3,
        rating: 4.6,
        reviews: 98,
        featured: 0,
        options: JSON.stringify(['Small', 'Large']),
      },
    ];
    for (const p of products) {
      await pool.query(
        'INSERT INTO products (name, description, category, base_price, image_url, customizable, estimated_days, rating, reviews, featured, options) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [p.name, p.description, p.category, p.base_price, p.image_url, p.customizable, p.estimated_days, p.rating, p.reviews, p.featured, p.options]
      );
    }
    console.log('Seeded products');

    const designs = [
      [2, 'My Logo Keychain', 'Keychain version of my business logo', 6, 1, '{"x":5,"y":3,"z":1}', '{"text":"RePrint","font":"bold","infill":100}', 8.99, 'approved'],
      [3, 'Custom Phone Case Design', 'Geometric pattern phone case for iPhone 15', 1, 1, '{"x":7.5,"y":15,"z":1.2}', '{"pattern":"geometric","color":"blue","thickness":1.2}', 22.50, 'submitted'],
      [4, 'Dragon Miniature', 'Detailed dragon for D&D campaign', 4, 4, '{"x":5,"y":5,"z":8}', '{"detail_level":"high","base":"included"}', 35.00, 'printing'],
    ];
    for (const d of designs) {
      await pool.query('INSERT INTO designs (user_id, name, description, product_id, material_id, dimensions, customizations, estimated_price, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', d);
    }
    console.log('Seeded designs');

    const orders = [
      [2, 6, null, 1, 5, '{"text":"JOHN D","color":"red"}', 29.95, 'delivered', '123 Main St, Springfield, IL 62701', null],
      [3, 1, null, 1, 1, '{"phone_model":"iPhone 15","color":"blue"}', 18.99, 'shipped', '456 Oak Ave, Chicago, IL 60601', 'USP123456789'],
      [4, null, 3, 4, 1, '{"resolution":"high","color":"grey"}', 38.00, 'printing', '789 Pine Rd, Milwaukee, WI 53201', null],
      [2, 3, null, 4, 1, '{"photo":"family_portrait.jpg","size":"6x8"}', 27.99, 'confirmed', '123 Main St, Springfield, IL 62701', null],
      [3, 5, null, 1, 2, '{"style":"geometric","size":"medium"}', 22.98, 'pending', '456 Oak Ave, Chicago, IL 60601', null],
    ];
    for (const o of orders) {
      await pool.query(
        'INSERT INTO orders (user_id, product_id, design_id, material_id, quantity, customizations, total_price, status, shipping_address, tracking_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        o
      );
    }
    console.log('Seeded orders');

    const reviews = [
      [2, 6, 5, 'Perfect keychain! Exactly what I wanted.'],
      [3, 1, 4, 'Great quality phone case, took a bit longer than expected.'],
      [4, 7, 5, 'Incredible prototyping service, brought my idea to life!'],
    ];
    for (const r of reviews) {
      await pool.query('INSERT INTO reviews (user_id, product_id, rating, comment) VALUES (?, ?, ?, ?)', r);
    }
    console.log('Seeded reviews');

    await pool.query('INSERT INTO employees (user_id, employee_id, position, department, hire_date, salary, employment_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [1, 'EMP-001', 'CEO', 'management', '2022-01-15', 95000, 'full_time']);
    await pool.query('INSERT INTO employees (user_id, employee_id, position, department, hire_date, salary, employment_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [1, 'EMP-002', '3D Print Technician', 'production', '2023-03-10', 52000, 'full_time']);
    await pool.query('INSERT INTO employees (user_id, employee_id, position, department, hire_date, salary, employment_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [1, 'EMP-003', 'Design Specialist', 'design', '2023-06-22', 58000, 'full_time']);
    console.log('Seeded employees');

    const today = new Date().toISOString().split('T')[0];
    await pool.query('INSERT INTO shifts (employee_id, shift_date, start_time, end_time, break_minutes, status) VALUES (?, ?, ?, ?, ?, ?)',
      [1, today, '09:00', '17:00', 60, 'scheduled']);
    await pool.query('INSERT INTO shifts (employee_id, shift_date, start_time, end_time, break_minutes, status) VALUES (?, ?, ?, ?, ?, ?)',
      [2, today, '08:00', '16:00', 30, 'scheduled']);
    await pool.query('INSERT INTO shifts (employee_id, shift_date, start_time, end_time, break_minutes, status) VALUES (?, ?, ?, ?, ?, ?)',
      [3, today, '10:00', '18:00', 30, 'scheduled']);
    console.log('Seeded shifts');

    await pool.query('INSERT INTO payments (order_id, user_id, amount, method, status, transaction_id, billing_name, billing_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [1, 2, 29.95, 'credit_card', 'completed', 'TXN-001-ABC123', 'John Doe', 'john@example.com']);
    await pool.query('INSERT INTO payments (order_id, user_id, amount, method, status, transaction_id, billing_name, billing_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [2, 3, 18.99, 'paypal', 'completed', 'TXN-002-DEF456', 'Jane Smith', 'jane@example.com']);
    await pool.query('INSERT INTO payments (order_id, user_id, amount, method, status, transaction_id, billing_name, billing_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [3, 4, 38.00, 'stripe', 'completed', 'TXN-003-GHI789', 'Bob Wilson', 'bob@example.com']);
    await pool.query('INSERT INTO payments (order_id, user_id, amount, method, status, transaction_id, billing_name, billing_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [4, 2, 27.99, 'credit_card', 'completed', 'TXN-004-JKL012', 'John Doe', 'john@example.com']);
    await pool.query('INSERT INTO payments (order_id, user_id, amount, method, status, billing_name, billing_email) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [5, 3, 22.98, 'debit_card', 'pending', 'Jane Smith', 'jane@example.com']);
    console.log('Seeded payments');

    await pool.query('INSERT INTO invoices (invoice_number, order_id, user_id, subtotal, tax, total, status, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['RP-001-INV', 1, 2, 29.95, 2.40, 32.35, 'paid', '2024-02-15']);
    await pool.query('INSERT INTO invoices (invoice_number, order_id, user_id, subtotal, tax, total, status, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['RP-002-INV', 2, 3, 18.99, 1.52, 20.51, 'paid', '2024-02-20']);
    await pool.query('INSERT INTO invoices (invoice_number, order_id, user_id, subtotal, tax, total, status, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['RP-003-INV', 3, 4, 38.00, 3.04, 41.04, 'unpaid', '2024-03-10']);
    console.log('Seeded invoices');

    await pool.query('INSERT INTO consultations (user_id, name, email, phone, topic, description, preferred_date, preferred_time, consultation_type, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [2, 'John Doe', 'john@example.com', '555-0101', 'Product Prototyping', 'Need help designing a custom enclosure for electronics project', '2024-03-01', '10:00', 'video', 'confirmed']);
    await pool.query('INSERT INTO consultations (user_id, name, email, phone, topic, description, preferred_date, preferred_time, consultation_type, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [3, 'Jane Smith', 'jane@example.com', '555-0102', 'Bulk Order Inquiry', 'Looking to order 50 custom phone cases for a corporate event', '2024-03-05', '14:00', 'phone', 'pending']);
    await pool.query('INSERT INTO consultations (name, email, phone, topic, description, preferred_date, preferred_time, consultation_type, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ['Alex Guest', 'alex@guest.com', '555-0199', 'Material Consultation', 'Not sure which material is best for outdoor use', '2024-03-03', '11:00', 'chat', 'completed']);
    console.log('Seeded consultations');

    await pool.query('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
      [2, 'Order Shipped', 'Your order #2 has been shipped! Track: USP123456789', 'order']);
    await pool.query('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
      [3, 'Consultation Confirmed', 'Your consultation about Bulk Order Inquiry has been confirmed for 2024-03-05 at 14:00', 'consultation']);
    await pool.query('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
      [2, 'Payment Received', 'Your payment of $29.95 for order #1 was successful', 'payment']);
    console.log('Seeded notifications');

    console.log('Database seeded successfully!');
  } catch (err) {
    console.error('Seeding error:', err.message);
  } finally {
    await pool.end();
  }
};

seed();
