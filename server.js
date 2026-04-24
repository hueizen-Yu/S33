require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Simple Auth Middleware
const crypto = require('crypto');
const tokens = new Map(); // token -> username

function verifyToken(req, res, next) {
    const auth = req.headers['authorization'];
    if (auth && auth.startsWith('Bearer ')) {
        const token = auth.split(' ')[1];
        if (tokens.has(token)) {
            req.username = tokens.get(token);
            return next();
        }
    }
    res.status(401).json({ error: 'Unauthorized' });
}

// Initialize PostgreSQL database
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_pZSMuW9F2aBI@ep-lingering-union-an0xpv9b.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require',
    ssl: {
        rejectUnauthorized: false
    }
});

pool.connect((err) => {
    if (err) {
        console.error('等待輸入 PostgreSQL 連線字串中...');
    } else {
        console.log('Connected to the PostgreSQL database.');
        
        // Initialize Tables
        pool.query(`
            CREATE TABLE IF NOT EXISTS records (
                id SERIAL PRIMARY KEY,
                username TEXT,
                height REAL NOT NULL,
                weight REAL NOT NULL,
                age INTEGER NOT NULL,
                bmi REAL NOT NULL,
                date TEXT NOT NULL
            );
        `).catch(e => console.error(e));

        pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                gender TEXT NOT NULL
            );
        `).catch(e => console.error(e));
    }
});

app.post('/api/register', async (req, res) => {
    const { username, password, gender } = req.body;
    if (!username || !password || !gender) {
        return res.status(400).json({ error: '請填寫所有欄位' });
    }
    
    try {
        const sql = 'INSERT INTO users (username, password, gender) VALUES ($1, $2, $3)';
        await pool.query(sql, [username, password, gender]);
        res.json({ message: '註冊成功' });
    } catch (err) {
        return res.status(400).json({ error: '使用者名稱已被註冊！' });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: '帳號或密碼錯誤' });
        }
        const token = crypto.randomBytes(16).toString('hex');
        tokens.set(token, username);
        res.json({ token, username });
    } catch (err) {
        res.status(500).json({ error: '伺服器錯誤' });
    }
});

// API endpoint to get all records
app.get('/api/records', verifyToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM records ORDER BY id DESC');
        res.json({ data: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API endpoint to add a new record
app.post('/api/records', verifyToken, async (req, res) => {
    const { height, weight, age } = req.body;
    if (!height || !weight || !age) {
        res.status(400).json({ error: 'Missing data' });
        return;
    }

    // Calculate BMI: weight (kg) / (height (m) * height (m))
    const heightInMeters = height / 100;
    const bmi = (weight / (heightInMeters * heightInMeters)).toFixed(2);
    
    // Get current date
    const date = new Date().toLocaleString();

    try {
        const sql = 'INSERT INTO records (username, height, weight, age, bmi, date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id';
        const result = await pool.query(sql, [req.username, height, weight, age, bmi, date]);
        res.json({
            message: 'success',
            data: { id: result.rows[0].id, username: req.username, height, weight, age, bmi, date }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
