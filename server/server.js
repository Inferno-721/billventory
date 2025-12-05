
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { Inventory, Transaction } from './models.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log('MongoDB Connection Error:', err));

// Routes

// Get all transactions
app.get('/api/transactions', async (req, res) => {
    try {
        const transactions = await Transaction.find().sort({ date: -1 });
        res.json(transactions);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/transactions
app.post('/api/transactions', async (req, res) => {
    try {
        const transaction = req.body;

        // Check if existing to determine if we need to adjust inventory
        const existing = await Transaction.findOne({ id: transaction.id });

        // Only adjust inventory if it's a NEW transaction (simple logic for now)
        if (!existing) {
            for (const item of transaction.items) {
                const productId = item.description.trim().toLowerCase();
                let invItem = await Inventory.findOne({ id: productId });

                if (!invItem) {
                    invItem = new Inventory({
                        id: productId,
                        name: item.description,
                        quantity: 0,
                        averageCost: 0,
                        sellingPrice: 0,
                        lastUpdated: transaction.date,
                    });
                }

                if (transaction.type === 'PURCHASE') {
                    const currentTotalValue = invItem.quantity * invItem.averageCost;
                    const newItemsValue = item.quantity * item.price;
                    invItem.quantity += item.quantity;
                    if (invItem.quantity > 0) {
                        invItem.averageCost = (currentTotalValue + newItemsValue) / invItem.quantity;
                    }
                } else if (transaction.type === 'SALE') {
                    invItem.quantity -= item.quantity;
                    invItem.sellingPrice = item.price;
                }

                invItem.lastUpdated = transaction.date;
                await invItem.save();
            }
        }

        // Upsert transaction
        const saved = await Transaction.findOneAndUpdate(
            { id: transaction.id },
            transaction,
            { new: true, upsert: true }
        );

        res.json({ transaction: saved });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});

// DELETE /api/transactions/:id
app.delete('/api/transactions/:id', async (req, res) => {
    try {
        await Transaction.deleteOne({ id: req.params.id });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/inventory
app.post('/api/inventory', async (req, res) => {
    try {
        const item = req.body;
        const saved = await Inventory.findOneAndUpdate(
            { id: item.id },
            item,
            { new: true, upsert: true }
        );
        res.json({ item: saved }); // frontend expects single updated item
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
