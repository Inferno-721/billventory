import { Invoice, InventoryItem } from '../types';

const API_URL = 'http://localhost:5000/api';

export const MongoService = {

  // GET all transactions
  async getTransactions(): Promise<Invoice[]> {
    try {
      const response = await fetch(`${API_URL}/transactions`);
      if (!response.ok) throw new Error('Failed to fetch transactions');

      const data = await response.json();
      return data.transactions || data;   // supports both formats
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
  },

  // SAVE one transaction
  async saveTransaction(transaction: Invoice): Promise<Invoice> {
    try {
      const response = await fetch(`${API_URL}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transaction),
      });

      if (!response.ok) throw new Error('Failed to save transaction');

      const data = await response.json();
      return data.transaction || data;   // supports both formats
    } catch (error) {
      console.error('Error saving transaction:', error);
      throw error;
    }
  },

  // DELETE one transaction
  async deleteTransaction(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/transactions/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete transaction');

      return true;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  },

  // GET inventory
  async getInventory(): Promise<InventoryItem[]> {
    try {
      const response = await fetch(`${API_URL}/inventory`);
      if (!response.ok) throw new Error('Failed to fetch inventory');

      const data = await response.json();
      return data.inventory || data;
    } catch (error) {
      console.error('Error fetching inventory:', error);
      return [];
    }
  },

  // UPDATE inventory item
  async updateInventoryItem(item: InventoryItem): Promise<InventoryItem> {
    try {
      const response = await fetch(`${API_URL}/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });

      if (!response.ok) throw new Error('Failed to update inventory');

      const data = await response.json();
      return data.item || data;
    } catch (error) {
      console.error('Error updating inventory:', error);
      throw error;
    }
  }
};
