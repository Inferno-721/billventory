
import mongoose from 'mongoose';

const InventorySchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, default: 0 },
    averageCost: { type: Number, required: true, default: 0 },
    sellingPrice: { type: Number, required: true, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
});

const ItemSchema = new mongoose.Schema({
    id: String,
    description: String,
    quantity: Number,
    price: Number
}, { _id: false });

const TransactionSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    type: { type: String, required: true, enum: ['PURCHASE', 'SALE'] },
    invoiceNumber: { type: String, required: true },
    partyName: { type: String, required: true }, // Vendor or Customer
    date: { type: Date, required: true },
    dueDate: { type: Date },
    status: { type: String, required: true },
    items: [ItemSchema],
    totalAmount: { type: Number, required: true },
    notes: String
}, { schema: true });

export const Inventory = mongoose.model('Inventory', InventorySchema);
export const Transaction = mongoose.model('Transaction', TransactionSchema);
