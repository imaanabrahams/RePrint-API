import express from "express";
import db from "../config/db.js";
import { auth, adminOnly } from "../middleware/auth.js";
import { sendMarketingEmail } from "../services/email.js";

const router = express.Router();
const categories = ["advertisements", "reviews", "deals"];

const validEmail = (email) =>
  typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

router.post("/subscribe", (req, res) => {
  const { email, preferences = {} } = req.body;
  if (!validEmail(email))
    return res.status(400).json({ error: "A valid email is required" });

  const values = categories.map((category) =>
    preferences[category] === true ? 1 : 0,
  );
  if (!values.some(Boolean))
    return res
      .status(400)
      .json({ error: "Choose at least one email preference" });

  db.run(
    `INSERT INTO marketing_subscriptions (email, advertisements, reviews, deals)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE advertisements = VALUES(advertisements), reviews = VALUES(reviews), deals = VALUES(deals)`,
    [email.trim().toLowerCase(), ...values],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: "Email preferences saved" });
    },
  );
});

router.get("/preferences", auth, (req, res) => {
  db.get(
    "SELECT email, advertisements, reviews, deals FROM marketing_subscriptions WHERE email = ?",
    [req.user.email],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(
        row || {
          email: req.user.email,
          advertisements: 0,
          reviews: 0,
          deals: 0,
        },
      );
    },
  );
});

router.post("/send", auth, adminOnly, async (req, res) => {
  const { category, subject, text, html } = req.body;
  if (!categories.includes(category) || !subject || (!text && !html)) {
    return res
      .status(400)
      .json({ error: "Category, subject, and email content are required" });
  }

  db.all(
    `SELECT email FROM marketing_subscriptions WHERE ${category} = 1`,
    async (err, subscribers) => {
      if (err) return res.status(500).json({ error: err.message });
      try {
        await Promise.all(
          subscribers.map(({ email }) =>
            sendMarketingEmail({ to: email, subject, text, html }),
          ),
        );
        res.json({
          message: "Marketing email sent",
          recipients: subscribers.length,
        });
      } catch (sendError) {
        res.status(503).json({ error: sendError.message });
      }
    },
  );
});

export default router;
