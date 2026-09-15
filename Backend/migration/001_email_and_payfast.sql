USE reprint_api;

ALTER TABLE users
  ADD COLUMN email_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN verification_token VARCHAR(255) NULL,
  ADD COLUMN verification_token_expires DATETIME NULL,
  ADD COLUMN reset_token VARCHAR(255) NULL,
  ADD COLUMN reset_token_expires DATETIME NULL;

ALTER TABLE payments
  MODIFY COLUMN method ENUM('credit_card','debit_card','paypal','stripe','bank_transfer','payfast') NOT NULL,
  ADD COLUMN pf_payment_id VARCHAR(255) NULL,
  ADD COLUMN gateway_response JSON NULL,
  ADD COLUMN order_ids JSON NULL;