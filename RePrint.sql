
CREATE DATABASE IF NOT EXISTS reprint_api;
USE reprint_api;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('customer', 'admin') DEFAULT 'customer',
  phone VARCHAR(50),
  address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS materials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(100),
  price_per_gram DECIMAL(10,4) NOT NULL,
  properties JSON,
  in_stock BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  base_price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  rating DECIMAL(2,1) DEFAULT 4.5,
  reviews INT DEFAULT 0,
  featured BOOLEAN DEFAULT FALSE,
  options JSON,
  customizable BOOLEAN DEFAULT TRUE,
  estimated_days INT DEFAULT 3,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS designs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  file_url TEXT,
  product_id INT,
  material_id INT,
  dimensions JSON,
  customizations JSON,
  estimated_price DECIMAL(10,2),
  preview_url TEXT,
  status ENUM('draft', 'submitted', 'approved', 'rejected', 'printing', 'completed') DEFAULT 'draft',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  design_id INT,
  product_id INT,
  material_id INT,
  quantity INT DEFAULT 1,
  customizations JSON,
  total_price DECIMAL(10,2) NOT NULL,
  status ENUM('pending', 'confirmed', 'printing', 'quality_check', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
  shipping_address TEXT,
  tracking_number VARCHAR(255),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (design_id) REFERENCES designs(id) ON DELETE SET NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  user_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  method ENUM('credit_card','debit_card','paypal','stripe','bank_transfer') NOT NULL,
  status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
  transaction_id VARCHAR(255),
  card_last4 VARCHAR(4),
  billing_name VARCHAR(255),
  billing_email VARCHAR(255),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(100) UNIQUE NOT NULL,
  order_id INT NOT NULL,
  user_id INT NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  tax DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  status ENUM('unpaid', 'paid', 'overdue', 'cancelled') DEFAULT 'unpaid',
  due_date DATE,
  paid_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  
);

CREATE TABLE IF NOT EXISTS consultations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  topic VARCHAR(255) NOT NULL,
  description TEXT,
  preferred_date DATE,
  preferred_time TIME,
  consultation_type ENUM('video', 'phone', 'in_person', 'chat') DEFAULT 'video',
  status ENUM('pending', 'confirmed', 'completed', 'cancelled', 'no_show') DEFAULT 'pending',
  assigned_to INT,
  notes TEXT,
  outcome TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  employee_id VARCHAR(50) UNIQUE NOT NULL,
  position VARCHAR(255) NOT NULL,
  department ENUM('production', 'design', 'sales', 'hr', 'management', 'support') NOT NULL,
  hire_date DATE NOT NULL,
  salary DECIMAL(10,2),
  employment_type ENUM('full_time', 'part_time', 'contract', 'intern') DEFAULT 'full_time',
  status ENUM('active', 'on_leave', 'terminated') DEFAULT 'active',
  emergency_contact VARCHAR(255),
  emergency_phone VARCHAR(50),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS shifts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_minutes INT DEFAULT 30,
  status ENUM('scheduled', 'confirmed', 'completed', 'missed', 'cancelled') DEFAULT 'scheduled',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('info', 'order', 'payment', 'consultation', 'system') DEFAULT 'info',
  `read` BOOLEAN DEFAULT FALSE,
  link TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wishlist (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_wishlist (user_id, product_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

INSERT INTO users (name, email, password, role, phone, address) VALUES
('Admin User', 'admin@reprint.com', '$2b$10$QMAQEp7solF0NFtXQoPZveZe6H/ctVlpvlOGmuSFRXrev7FBYAAN2', 'admin', '555-0100', NULL),
('John Doe', 'john@example.com', '$2b$10$QMAQEp7solF0NFtXQoPZveZe6H/ctVlpvlOGmuSFRXrev7FBYAAN2', 'customer', '555-0101', '123 Main St, Springfield, IL 62701'),
('Jane Smith', 'jane@example.com', '$2b$10$QMAQEp7solF0NFtXQoPZveZe6H/ctVlpvlOGmuSFRXrev7FBYAAN2', 'customer', '555-0102', '456 Oak Ave, Chicago, IL 60601'),
('Bob Wilson', 'bob@example.com', '$2b$10$QMAQEp7solF0NFtXQoPZveZe6H/ctVlpvlOGmuSFRXrev7FBYAAN2', 'customer', '555-0103', '789 Pine Rd, Milwaukee, WI 53201');

INSERT INTO users (name, email, password, role, phone) VALUES
('Sarah Print', 'sarah@reprint.com', '$2b$10$QMAQEp7solF0NFtXQoPZveZe6H/ctVlpvlOGmuSFRXrev7FBYAAN2', 'customer', '555-0201'),
('Mike Layer', 'mike@reprint.com', '$2b$10$QMAQEp7solF0NFtXQoPZveZe6H/ctVlpvlOGmuSFRXrev7FBYAAN2', 'customer', '555-0202'),
('Dana Design', 'dana@reprint.com', '$2b$10$QMAQEp7solF0NFtXQoPZveZe6H/ctVlpvlOGmuSFRXrev7FBYAAN2', 'customer', '555-0203');

INSERT INTO materials (name, description, color, price_per_gram, properties) VALUES
('PLA', 'Biodegradable thermoplastic, great for prototypes', 'Various', 0.03, '{"strength":"medium","flexibility":"low","heat_resistance":"low","food_safe":false}'),
('ABS', 'Durable thermoplastic for functional parts', 'Various', 0.04, '{"strength":"high","flexibility":"medium","heat_resistance":"high","food_safe":false}'),
('PETG', 'Chemical resistant, easy to print', 'Various', 0.05, '{"strength":"high","flexibility":"medium","heat_resistance":"medium","food_safe":true}'),
('Resin', 'High detail SLA resin for miniatures', 'Various', 0.08, '{"strength":"medium","flexibility":"low","heat_resistance":"low","food_safe":false}'),
('TPU', 'Flexible rubber-like material', 'Various', 0.06, '{"strength":"medium","flexibility":"high","heat_resistance":"low","food_safe":false}'),
('Nylon', 'Strong and lightweight engineering material', 'White', 0.07, '{"strength":"very_high","flexibility":"high","heat_resistance":"high","food_safe":false}');

INSERT INTO products (name, description, category, base_price, image_url, customizable, estimated_days, rating, reviews, featured, options) VALUES
('Paper Towel Holder', 'A modern, 3D-printed paper towel holder that looks great in any kitchen.', 'Home Decor', 549, '/images/p1.png', 1, 3, 4.8, 126, 0, '["Single","Set of 2"]'),
('Sunglass Organiser', 'A neat, 3D-printed organiser that keeps your sunglasses safe and scratch-free.', 'Home Decor', 449, '/images/p2.png', 1, 3, 4.6, 203, 0, '["Small","Medium","Large"]'),
('Outlet Box', 'A practical, 3D-printed outlet box that tidies cables beside your power points.', 'Home Decor', 799, '/images/p3.png', 1, 3, 4.9, 88, 0, '["Single","Double"]'),
('Desk Accessories', 'Stylish, printed desk accessories that keep your workspace tidy.', 'Office', 899, '/images/p4.png', 1, 3, 4.7, 152, 0, '["Starter","Complete","Deluxe"]'),
('Headphones & Watch Holder', 'A compact holder that stores your headphones and watch together.', 'Home Decor', 349, '/images/p5.png', 1, 3, 4.5, 319, 0, '["Black","White","Green"]'),
('Eco-Friendly Plant Pot', 'A sustainable, 3D-printed plant pot made from eco-friendly materials.', 'Garden', 299, '/images/p6.png', 1, 3, 4.4, 241, 0, '["Small","Medium","Large"]'),
('Fidget Toy', 'A fun, 3D-printed animal fidget toy.', 'Toys', 179, '/images/fidget.png', 1, 3, 4.8, 126, 1, '["Rabbit","Cat","Bear"]'),
('Keyring', 'A cute, 3D-printed animal keyring.', 'Toys', 179, '/images/keyring.png', 1, 3, 4.7, 118, 1, '["Rabbit","Cat","Bear"]'),
('Jewellery Holder', 'A stylish holder that keeps rings, earrings and necklaces organised.', 'Home Decor', 449, '/images/best2.png', 1, 3, 4.6, 203, 1, '["Small","Medium","Large"]'),
('Game Controller Stand', 'A sturdy stand that holds your game controller neatly.', 'Gaming', 549, '/images/best3.png', 1, 3, 4.9, 88, 1, '["Single","Double"]'),
('Sweet Dispenser', 'A fun, 3D-printed sweet dispenser, perfect for parties.', 'Toys', 199, '/images/p7.png', 1, 3, 4.6, 98, 0, '["Small","Large"]');

INSERT INTO employees (user_id, employee_id, position, department, hire_date, salary, employment_type) VALUES
(1, 'EMP-001', 'CEO', 'management', '2022-01-15', 95000, 'full_time'),
(5, 'EMP-002', '3D Print Technician', 'production', '2023-03-10', 52000, 'full_time'),
(6, 'EMP-003', 'Design Specialist', 'design', '2023-06-22', 58000, 'full_time'),
(7, 'EMP-004', 'Sales Associate', 'sales', '2023-09-01', 48000, 'full_time');

INSERT INTO shifts (employee_id, shift_date, start_time, end_time, break_minutes, status) VALUES
(1, CURDATE(), '09:00', '17:00', 60, 'scheduled'),
(2, CURDATE(), '08:00', '16:00', 30, 'scheduled'),
(3, CURDATE(), '10:00', '18:00', 30, 'scheduled'),
(4, CURDATE(), '09:00', '17:00', 30, 'scheduled');

INSERT INTO orders (user_id, product_id, material_id, quantity, total_price, status, shipping_address, tracking_number) VALUES
(2, 6, 1, 1, 29.95, 'delivered', '123 Main St, Springfield, IL 62701', 'USP111111111'),
(3, 1, 1, 1, 18.99, 'shipped', '456 Oak Ave, Chicago, IL 60601', 'USP123456789'),
(4, 3, 4, 1, 38.00, 'printing', '789 Pine Rd, Milwaukee, WI 53201', NULL),
(2, 4, 1, 1, 27.99, 'confirmed', '123 Main St, Springfield, IL 62701', NULL),
(3, 5, 2, 1, 22.98, 'pending', '456 Oak Ave, Chicago, IL 60601', NULL);

INSERT INTO reviews (user_id, product_id, rating, comment) VALUES
(2, 6, 5, 'Perfect keychain! Exactly what I wanted.'),
(3, 1, 4, 'Great quality, took a bit longer than expected.'),
(4, 7, 5, 'Incredible service, brought my idea to life!');

INSERT INTO payments (order_id, user_id, amount, method, status, transaction_id, billing_name, billing_email) VALUES
(1, 2, 29.95, 'credit_card', 'completed', 'TXN-001-ABC123', 'John Doe', 'john@example.com'),
(2, 3, 18.99, 'paypal', 'completed', 'TXN-002-DEF456', 'Jane Smith', 'jane@example.com'),
(3, 4, 38.00, 'stripe', 'completed', 'TXN-003-GHI789', 'Bob Wilson', 'bob@example.com'),
(4, 2, 27.99, 'credit_card', 'completed', 'TXN-004-JKL012', 'John Doe', 'john@example.com'),
(5, 3, 22.98, 'debit_card', 'pending', NULL, 'Jane Smith', 'jane@example.com');

INSERT INTO invoices (invoice_number, order_id, user_id, subtotal, tax, total, status, due_date) VALUES
('RP-001-INV', 1, 2, 29.95, 2.40, 32.35, 'paid', '2026-10-15'),
('RP-002-INV', 2, 3, 18.99, 1.52, 20.51, 'paid', '2026-10-20'),
('RP-003-INV', 3, 4, 38.00, 3.04, 41.04, 'unpaid', '2026-11-01');

INSERT INTO consultations (user_id, name, email, phone, topic, description, preferred_date, preferred_time, consultation_type, status) VALUES
(2, 'John Doe', 'john@example.com', '555-0101', 'Product Prototyping', 'Need help designing a custom enclosure for an electronics project', '2026-10-01', '10:00', 'video', 'confirmed'),
(3, 'Jane Smith', 'jane@example.com', '555-0102', 'Bulk Order Inquiry', 'Looking to order 50 custom phone cases for a corporate event', '2026-10-05', '14:00', 'phone', 'pending');


INSERT INTO notifications (user_id, title, message, type) VALUES
(2, 'Order Shipped', 'Your order has been shipped! Track: USP123456789', 'order'),
(3, 'Consultation Confirmed', 'Your consultation about Bulk Order Inquiry has been confirmed', 'consultation'),
(2, 'Payment Received', 'Your payment of $29.95 was successful', 'payment');