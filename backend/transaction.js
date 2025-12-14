import express from "express";
import { Client } from "pg"; // Add this import
const router = express.Router();

// PostgreSQL configuration (same as in server.js)
const pgConfig = {
  host: "localhost",
  port: 5432,
  database: "inventorydb",
  user: "postgres",
  password: "your_password_here", // Use same password as in server.js
};

// 🟢 CREATE TRANSACTION - UPDATED WITH POSTGRES STOCK UPDATE
router.post("/", async (req, res) => {
  let pgClient;

  try {
    const db = req.db;
    const { items, total_amount, payment_method = "cash" } = req.body;

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ error: "Items array is required and cannot be empty" });
    }
    if (total_amount === undefined || total_amount === null) {
      return res.status(400).json({ error: "Total amount is required" });
    }

    // Validate payment method
    const validPaymentMethods = ["cash", "gcash"];
    if (!validPaymentMethods.includes(payment_method)) {
      return res.status(400).json({
        error:
          "Invalid payment method. Must be one of: " +
          validPaymentMethods.join(", "),
      });
    }

    // Calculate total cost from items with proper decimal handling
    const total_cost = items.reduce((sum, item) => {
      const itemCost = parseFloat(item.cost) || 0;
      const itemQty = parseInt(item.qty) || 1;
      return sum + itemCost * itemQty;
    }, 0);

    // Connect to PostgreSQL
    pgClient = new Client(pgConfig);
    await pgClient.connect();

    // Start SQLite transaction
    await db.run("BEGIN TRANSACTION");

    try {
      // 1. Insert main transaction
      const transactionResult = await db.run(
        `INSERT INTO transactions (total_amount, total_cost, payment_method) VALUES (?, ?, ?)`,
        [parseFloat(total_amount), parseFloat(total_cost), payment_method]
      );
      const transactionId = transactionResult.lastID;

      // 2. Insert transaction items and update PostgreSQL stock
      for (const item of items) {
        const unit_cost = parseFloat(item.cost) || 0;
        const unit_price = parseFloat(item.price) || 0;
        const item_qty = parseInt(item.qty) || 1;
        const total_item_cost = unit_cost * item_qty;
        const total_item_price = unit_price * item_qty;

        // Insert transaction item
        await db.run(
          `INSERT INTO transaction_items 
          (transaction_id, item_id, variant_id, item_name, category_name, variant_name, qty, 
           unit_price, unit_cost, total_price, total_cost) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            transactionId,
            item.item_id || item.id,
            item.variant_id || null,
            item.name,
            item.categoryName || "Uncategorized",
            item.variant_name || "",
            item_qty,
            unit_price,
            unit_cost,
            total_item_price,
            total_item_cost,
          ]
        );

        // 3. UPDATE STOCK IN POSTGRESQL using stored IDs
        if (item.variant_id) {
          await updatePostgreSQLStock(pgClient, db, item.variant_id, item_qty);
        } else {
          console.warn(`⚠️ No variant_id provided for item: ${item.name}`);
        }
      }

      // Commit both transactions
      await db.run("COMMIT");

      res.status(201).json({
        message: "Transaction created successfully",
        transaction_id: transactionId,
        total_amount: parseFloat(total_amount),
        total_cost: parseFloat(total_cost),
        total_profit: parseFloat(total_amount) - parseFloat(total_cost),
        items_count: items.length,
        payment_method: payment_method,
      });
    } catch (error) {
      await db.run("ROLLBACK");
      throw error;
    }
  } catch (err) {
    console.error("❌ Failed to create transaction:", err);
    res
      .status(500)
      .json({ error: "Failed to create transaction: " + err.message });
  } finally {
    // Close PostgreSQL connection
    if (pgClient) {
      await pgClient.end();
    }
  }
});
// Function to update PostgreSQL stock by decrementing from the earliest expiring batch

async function updatePostgreSQLStock(
  pgClient,
  sqliteDb,
  variantId,
  quantitySold
) {
  try {
    const variant = await sqliteDb.get(
      "SELECT postgres_product_id, postgres_stock_id FROM item_variants WHERE id = ?",
      [variantId]
    );

    if (!variant?.postgres_stock_id) {
      console.warn(`⚠️ No PostgreSQL stock_id found for variant: ${variantId}`);
      return;
    }

    // Use a CTE to handle FIFO decrement and stock update in one transaction
    const updateQuery = `
      WITH available_batches AS (
        SELECT 
          batch_id,
          on_hand,
          expiry_date,
          SUM(on_hand) OVER (ORDER BY expiry_date ASC) as cumulative_on_hand,
          COALESCE(SUM(on_hand) OVER (ORDER BY expiry_date ASC ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0) as prev_cumulative
        FROM product_batch 
        WHERE stock_id = $1 
          AND on_hand > 0 
          AND status IN ('Normal', 'Near Expiry', 'Low Stock')
        ORDER BY expiry_date ASC
      ),
      batch_updates AS (
        SELECT 
          batch_id,
          CASE 
            WHEN cumulative_on_hand <= $2 THEN on_hand  -- All from this batch
            WHEN prev_cumulative < $2 THEN $2 - prev_cumulative  -- Partial from this batch
            ELSE 0  -- Nothing from this batch
          END as to_decrement
        FROM available_batches
        WHERE cumulative_on_hand > prev_cumulative  -- Skip if on_hand = 0
      ),
      update_batches AS (
        UPDATE product_batch pb
        SET on_hand = GREATEST(0, pb.on_hand - bu.to_decrement)
        FROM batch_updates bu
        WHERE pb.batch_id = bu.batch_id
          AND bu.to_decrement > 0
        RETURNING pb.stock_id, bu.to_decrement
      ),
      total_decremented AS (
        SELECT COALESCE(SUM(to_decrement), 0) as total
        FROM update_batches
      )
      UPDATE product_stocks ps
      SET total_on_hand = GREATEST(0, total_on_hand - (SELECT total FROM total_decremented))
      WHERE stock_id = $1
      RETURNING 
        ps.stock_id, 
        ps.product_id, 
        ps.total_on_hand as new_total,
        ps.status,
        (SELECT total FROM total_decremented) as quantity_sold;
    `;

    const result = await pgClient.query(updateQuery, [
      variant.postgres_stock_id,
      quantitySold,
    ]);

    if (result.rows.length === 0) {
      // Check if there's any stock at all
      const stockCheck = await pgClient.query(
        `SELECT 
          COALESCE(SUM(on_hand), 0) as total_available,
          COUNT(*) as batch_count
         FROM product_batch 
         WHERE stock_id = $1 
           AND on_hand > 0 
           AND status IN ('Normal', 'Near Expiry', 'Low Stock')`,
        [variant.postgres_stock_id]
      );

      if (stockCheck.rows[0].batch_count === 0) {
        throw new Error(
          `No batches available for stock_id: ${variant.postgres_stock_id}`
        );
      } else if (stockCheck.rows[0].total_available < quantitySold) {
        throw new Error(
          `Insufficient stock. Requested: ${quantitySold}, Available: ${stockCheck.rows[0].total_available}`
        );
      }
    } else {
      console.log(`✅ Updated PostgreSQL stock (FIFO):`, result.rows[0]);
    }
  } catch (error) {
    console.error("❌ Failed to update PostgreSQL stock:", error);
    throw error;
  }
}

// 🟢 GET ALL TRANSACTIONS
router.get("/", async (req, res) => {
  try {
    const db = req.db;

    const transactions = await db.all(`
      SELECT 
        t.*,
        (t.total_amount - t.total_cost) as total_profit,
        COUNT(ti.id) as items_count
      FROM transactions t
      LEFT JOIN transaction_items ti ON t.id = ti.transaction_id
      GROUP BY t.id
      ORDER BY t.transaction_date DESC
    `);

    res.json(transactions);
  } catch (err) {
    console.error("Failed to fetch transactions:", err);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

// 🟢 GET SINGLE TRANSACTION WITH ITEMS
router.get("/:id", async (req, res) => {
  try {
    const db = req.db;
    const transactionId = req.params.id;

    // Get transaction details
    const transaction = await db.get(
      `SELECT *, (total_amount - total_cost) as total_profit FROM transactions WHERE id = ?`,
      [transactionId]
    );

    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    // Get transaction items with variant info
    const transactionItems = await db.all(
      `
      SELECT 
        ti.*,
        ti.item_name,
        ti.category_name,
        ti.variant_name,
        i.name as current_item_name,
        c.name as current_category_name,
        i.type as item_type,
        (ti.total_price - ti.total_cost) as item_profit
      FROM transaction_items ti
      LEFT JOIN item i ON ti.item_id = i.id
      LEFT JOIN category c ON i.category_id = c.id
      WHERE ti.transaction_id = ?
    `,
      [transactionId]
    );

    res.json({
      ...transaction,
      items: transactionItems,
    });
  } catch (err) {
    console.error("Failed to fetch transaction:", err);
    res.status(500).json({ error: "Failed to fetch transaction" });
  }
});

export default router;
