
import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult, Invoice, InventoryItem, ChatMessage, InvoiceStatus } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const MODEL_ID = "gemini-2.5-flash";

export const analyzeInvoiceImage = async (base64Image: string): Promise<AIAnalysisResult> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg", // Assuming JPEG for simplicity, can be dynamic
              data: base64Image
            }
          },
          {
            text: "Analyze this document (invoice or bill) image and extract the following details: Vendor/Issuer Name, Invoice/Bill Number, Date, Total Amount, and line items. If a field is missing, make a best guess or leave blank."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            vendorName: { type: Type.STRING, description: "Name of the business or person issuing the document" },
            invoiceNumber: { type: Type.STRING, description: "Unique identifier for the document" },
            date: { type: Type.STRING, description: "Date of the document in YYYY-MM-DD format" },
            totalAmount: { type: Type.NUMBER, description: "Grand total amount" },
            items: {
              type: Type.ARRAY,
              description: "List of items or services",
              items: {
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  price: { type: Type.NUMBER }
                }
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    return JSON.parse(text) as AIAnalysisResult;

  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    throw error;
  }
};

export const generateBusinessReport = async (transactions: Invoice[], inventory: InventoryItem[]): Promise<string> => {
  try {
    // Categorize transactions
    const sales = transactions.filter(t => t.type === 'SALE');
    const purchases = transactions.filter(t => t.type === 'PURCHASE');

    // Financial calculations
    const totalRevenue = sales.reduce((sum, t) => sum + t.totalAmount, 0);
    const totalExpense = purchases.reduce((sum, t) => sum + t.totalAmount, 0);
    const netProfit = totalRevenue - totalExpense;
    const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;

    // Payment status breakdown
    const pendingPayments = sales.filter(t => t.status === InvoiceStatus.PENDING);
    const overduePayments = sales.filter(t => t.status === InvoiceStatus.OVERDUE);
    const pendingAmount = pendingPayments.reduce((sum, t) => sum + t.totalAmount, 0);
    const overdueAmount = overduePayments.reduce((sum, t) => sum + t.totalAmount, 0);

    // Inventory analysis
    const lowStockItems = inventory.filter(i => i.quantity > 0 && i.quantity <= 5);
    const outOfStockItems = inventory.filter(i => i.quantity <= 0);
    const wellStockedItems = inventory.filter(i => i.quantity > 20);

    // Format inventory data
    const inventoryBreakdown = inventory
      .map(i => {
        const stockStatus = i.quantity <= 0 ? '🔴 OUT OF STOCK' : i.quantity <= 5 ? '🟡 LOW STOCK' : '🟢 OK';
        return `• ${i.name}: ${i.quantity} units | Cost: ₹${i.averageCost.toFixed(0)} | Sell: ₹${i.sellingPrice.toFixed(0)} | Status: ${stockStatus}`;
      })
      .join('\n');

    // Top customers/vendors
    const customerSpending: Record<string, number> = {};
    sales.forEach(t => {
      customerSpending[t.partyName] = (customerSpending[t.partyName] || 0) + t.totalAmount;
    });
    const topCustomers = Object.entries(customerSpending)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, amount]) => `• ${name}: ₹${amount.toLocaleString('en-IN')}`)
      .join('\n');

    // Recent activity
    const recentActivity = transactions
      .slice(0, 8)
      .map(t => `• ${t.date} | ${t.type === 'SALE' ? '💰 SALE' : '📦 PURCHASE'} | ${t.partyName} | ₹${t.totalAmount.toLocaleString('en-IN')}`)
      .join('\n');

    const prompt = `
You are a professional business analyst generating a monthly performance report for "Billventory", a billing and inventory management system for a small business in India.

═══════════════════════════════════════════════════
📊 BUSINESS DATA SNAPSHOT
═══════════════════════════════════════════════════

💵 FINANCIAL SUMMARY:
• Total Sales (Revenue): ₹${totalRevenue.toLocaleString('en-IN')}
• Total Purchases (Expenses): ₹${totalExpense.toLocaleString('en-IN')}
• Net Profit: ₹${netProfit.toLocaleString('en-IN')}
• Profit Margin: ${profitMargin}%
• Number of Sales: ${sales.length}
• Number of Purchases: ${purchases.length}

💳 PAYMENT STATUS:
• Pending Payments: ${pendingPayments.length} invoices worth ₹${pendingAmount.toLocaleString('en-IN')}
• Overdue Payments: ${overduePayments.length} invoices worth ₹${overdueAmount.toLocaleString('en-IN')}

📦 INVENTORY STATUS:
• Total Products: ${inventory.length}
• Out of Stock Items: ${outOfStockItems.length}
• Low Stock Items (≤5 units): ${lowStockItems.length}
• Well Stocked Items (>20 units): ${wellStockedItems.length}

Inventory Details:
${inventoryBreakdown || 'No inventory data available'}

👥 TOP CUSTOMERS BY REVENUE:
${topCustomers || 'No customer data available'}

📋 RECENT TRANSACTIONS:
${recentActivity || 'No recent transactions'}

═══════════════════════════════════════════════════

Based on the above ACTUAL data, generate a professional monthly business report with the following structure. Be SPECIFIC to the numbers provided - do not make up data or give generic advice.

**REPORT STRUCTURE:**

1. **📈 Executive Summary** (2-3 sentences)
   - Overall business health rating (Excellent/Good/Needs Attention/Critical)
   - Key highlight of the month

2. **💰 Financial Analysis**
   - Comment on profit margin (is it healthy for retail?)
   - Revenue vs Expense ratio analysis
   - Cash flow observation

3. **📦 Inventory Insights**
   - List specific items that need restocking (by name)
   - Identify any overstocked items
   - Stock turnover observation

4. **⚠️ Alerts & Concerns**
   - Overdue payments that need follow-up (mention customer names if available)
   - Stock-outs affecting potential sales
   - Any unusual patterns

5. **✅ Action Items This Week**
   - 3-5 specific, actionable tasks based on the data
   - Prioritize by urgency

Keep the report concise (under 400 words), use bullet points, and focus on actionable insights derived from the actual data provided. Use Indian Rupee (₹) formatting.
`;

    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: prompt
    });

    return response.text || "Could not generate report.";
  } catch (error) {
    console.error("Report Generation Failed:", error);
    return "Failed to generate report due to an error.";
  }
};

export const getChatResponse = async (
  history: ChatMessage[],
  userMessage: string,
  transactions: Invoice[],
  inventory: InventoryItem[]
): Promise<string> => {
  try {
    // Context Construction
    const inventoryContext = inventory.map(i => `${i.name} (Qty: ${i.quantity}, Price: ₹${i.sellingPrice})`).join('; ');
    const pendingBills = transactions.filter(t => t.status === 'Pending').map(t => `${t.partyName} owes ₹${t.totalAmount}`).join('; ');

    const systemInstruction = `
      You are Billventory AI, a helpful assistant for a business owner.
      Current Data Context:
      - Inventory: [${inventoryContext}]
      - Pending Payments to Collect: [${pendingBills}]
      - Total Transactions Count: ${transactions.length}
      
      Answer the user's questions about their business data. 
      If they ask about stock, check the Inventory context.
      If they ask about money owed, check Pending Payments.
      Keep answers short, professional, and helpful. 
      Currency is Indian Rupee (₹).
    `;

    const chat = ai.chats.create({
      model: MODEL_ID,
      config: {
        systemInstruction: systemInstruction
      },
      history: history.map(h => ({
        role: h.role,
        parts: [{ text: h.content }]
      }))
    });

    const result = await chat.sendMessage({
      message: userMessage
    });

    return result.text || "I'm sorry, I couldn't process that.";
  } catch (error) {
    console.error("Chat Failed:", error);
    return "I'm having trouble connecting to the AI right now.";
  }
};
