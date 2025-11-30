const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();
const Groq = require('groq-sdk');

const app = express();
const PORT = process.env.PORT || 8000;

// Initialize Groq
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Middleware
app.use(cors());
app.use(express.json());

// In-memory database
const db = {
  users: {},
  bank_accounts: {},
  products: [],
  transactions: [],
  activities: {}
};

// Initialize data
function initializeData() {
  // Users
  const users = [
    { id: '1', name: 'Alice', email: 'alice@mail.com', password: 'alice123', phone: '+1234567890', account_id: 'acc1', balance: 15000 },
    { id: '2', name: 'Bob', email: 'bob@mail.com', password: 'bob123', phone: '+1234567891', account_id: 'acc2', balance: 8000 },
    { id: '3', name: 'Carol', email: 'carol@mail.com', password: 'carol123', phone: '+1234567892', account_id: 'acc3', balance: 12000 }
  ];

  users.forEach(u => {
    db.users[u.id] = u;
    db.bank_accounts[u.account_id] = {
      id: u.account_id,
      user_id: u.id,
      user_name: u.name,
      balance: u.balance,
      bank: u.id === '1' ? 'TechBank' : u.id === '2' ? 'InnoBank' : 'SmartBank'
    };
    db.activities[u.id] = [];
  });

  // Products
  db.products = [
    { id: 'p1', name: 'Wireless Mouse', price: 29.99, rating: 4.5, store: 'TechPro', description: 'Ergonomic wireless mouse' },
    { id: 'p2', name: 'Mechanical Keyboard', price: 89.99, rating: 4.8, store: 'TechPro', description: 'RGB mechanical keyboard' },
    { id: 'p3', name: 'USB-C Hub', price: 45.99, rating: 4.3, store: 'GadgetX', description: '7-in-1 USB-C hub' },
    { id: 'p4', name: '4K Monitor', price: 349.99, rating: 4.7, store: 'TechPro', description: '27-inch 4K monitor' },
    { id: 'p5', name: 'Laptop Stand', price: 39.99, rating: 4.6, store: 'GadgetX', description: 'Adjustable aluminum stand' },
    { id: 'p6', name: 'TechPro UltraBook Pro', price: 1299.99, rating: 4.8, store: 'TechPro', description: 'Premium laptop' },
    { id: 'p7', name: 'Gaming Laptop X1', price: 1899.99, rating: 4.9, store: 'TechPro', description: 'High-performance gaming' },
    { id: 'p8', name: 'GadgetX Business Laptop', price: 899.99, rating: 4.5, store: 'GadgetX', description: 'Business laptop' },
    { id: 'p9', name: 'GadgetX Student Laptop', price: 499.99, rating: 4.3, store: 'GadgetX', description: 'Affordable laptop' },
    { id: 'p10', name: 'Creator Laptop Pro', price: 2299.99, rating: 4.9, store: 'TechPro', description: 'Content creation powerhouse' }
  ];
}

initializeData();

// Auth middleware
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ detail: 'Missing/invalid auth header' });
  }
  const token = auth.split(' ')[1];
  const user = Object.values(db.users).find(u => u.email === token);
  if (!user) {
    return res.status(401).json({ detail: 'Invalid token' });
  }
  req.userId = user.id;
  next();
}

// Routes
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = Object.values(db.users).find(u => u.email === email && u.password === password);
  
  if (!user) {
    return res.status(401).json({ detail: 'Invalid credentials' });
  }
  
  res.json({
    token: user.email,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      balance: db.bank_accounts[user.account_id].balance
    }
  });
});

app.get('/products', authMiddleware, (req, res) => {
  res.json(db.products);
});

app.get('/balances/:user_id', authMiddleware, (req, res) => {
  const user = db.users[req.params.user_id];
  if (!user) return res.status(404).json({ detail: 'User not found' });
  
  const account = db.bank_accounts[user.account_id];
  res.json({ balance: account.balance });
});

app.get('/transactions/:user_id', authMiddleware, (req, res) => {
  const userTransactions = db.transactions.filter(t => 
    t.from === req.params.user_id || t.to === req.params.user_id
  );
  res.json(userTransactions);
});

app.get('/activities/:user_id', authMiddleware, (req, res) => {
  const activities = db.activities[req.params.user_id] || [];
  res.json(activities);
});

app.get('/banks', authMiddleware, (req, res) => {
  const banks = {};
  
  Object.values(db.bank_accounts).forEach(acc => {
    const bankName = acc.bank;
    if (!banks[bankName]) {
      banks[bankName] = { id: bankName, name: bankName, accounts: [] };
    }
    banks[bankName].accounts.push(acc);
  });
  
  const result = Object.values(banks).map(bank => ({
    ...bank,
    total_balance: bank.accounts.reduce((sum, acc) => sum + acc.balance, 0)
  }));
  
  res.json(result);
});

app.post('/agent', authMiddleware, async (req, res) => {
  try {
    const { message } = req.body;
    
    // Simple NLP using Groq
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a shopping assistant. Parse user requests into JSON with action (search/buy/transfer/balance), item, price_max, price_min, rating_min, prefer_cheap, prefer_expensive, to_phone, amount.'
        },
        { role: 'user', content: message }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3
    });
    
    let command;
    try {
      command = JSON.parse(completion.choices[0].message.content);
    } catch {
      return res.json({ ok: false, reason: 'Could not understand request' });
    }
    
    // Handle actions
    if (command.action === 'balance') {
      const user = db.users[req.userId];
      const balance = db.bank_accounts[user.account_id].balance;
      return res.json({ ok: true, reply: `Your current balance is $${balance.toFixed(2)}` });
    }
    
    if (command.action === 'search') {
      let products = db.products.filter(p => {
        const nameMatch = !command.item || p.name.toLowerCase().includes(command.item.toLowerCase());
        const priceMatch = (!command.price_max || p.price <= command.price_max) &&
                          (!command.price_min || p.price >= command.price_min);
        const ratingMatch = !command.rating_min || p.rating >= command.rating_min;
        return nameMatch && priceMatch && ratingMatch;
      });
      
      if (command.prefer_cheap) products.sort((a, b) => a.price - b.price);
      if (command.prefer_expensive) products.sort((a, b) => b.price - a.price);
      
      if (products.length === 0) {
        return res.json({ ok: false, reason: 'No matching products found' });
      }
      
      const productList = products.slice(0, 5).map(p => 
        `${p.name} - $${p.price} (${p.rating}⭐) at ${p.store}`
      ).join('\\n');
      
      return res.json({ ok: true, reply: `Found ${products.length} products:\\n${productList}` });
    }
    
    if (command.action === 'buy') {
      const product = db.products.find(p => 
        p.name.toLowerCase().includes(command.item.toLowerCase())
      );
      
      if (!product) {
        return res.json({ ok: false, reason: 'Product not found' });
      }
      
      const user = db.users[req.userId];
      const account = db.bank_accounts[user.account_id];
      
      if (account.balance < product.price) {
        return res.json({ ok: false, reason: 'Insufficient funds' });
      }
      
      account.balance -= product.price;
      
      const transaction = {
        id: uuidv4(),
        from: req.userId,
        type: 'purchase',
        amount: product.price,
        item: product.name,
        ts: Date.now()
      };
      
      db.transactions.push(transaction);
      db.activities[req.userId].push({
        type: 'purchase',
        amount: product.price,
        item_name: product.name,
        timestamp: Date.now()
      });
      
      return res.json({
        ok: true,
        reply: `Successfully purchased ${product.name} for $${product.price.toFixed(2)}`,
        order: { id: transaction.id, item: product.name, price: product.price }
      });
    }
    
    if (command.action === 'transfer') {
      const recipient = Object.values(db.users).find(u => u.phone === command.to_phone);
      if (!recipient) {
        return res.json({ ok: false, reason: 'Recipient not found' });
      }
      
      const sender = db.users[req.userId];
      const senderAccount = db.bank_accounts[sender.account_id];
      const recipientAccount = db.bank_accounts[recipient.account_id];
      
      if (senderAccount.balance < command.amount) {
        return res.json({ ok: false, reason: 'Insufficient funds' });
      }
      
      senderAccount.balance -= command.amount;
      recipientAccount.balance += command.amount;
      
      const transaction = {
        id: uuidv4(),
        from: req.userId,
        to: recipient.id,
        amount: command.amount,
        type: 'transfer',
        ts: Date.now()
      };
      
      db.transactions.push(transaction);
      
      return res.json({
        ok: true,
        reply: `Successfully transferred $${command.amount.toFixed(2)} to ${recipient.name}`
      });
    }
    
    res.json({ ok: false, reason: 'Unknown action' });
    
  } catch (error) {
    console.error('Agent error:', error);
    res.status(500).json({ ok: false, reason: 'AI service error' });
  }
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  const frontendDist = path.join(__dirname, '../frontend/dist');
  
  app.use(express.static(frontendDist));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
