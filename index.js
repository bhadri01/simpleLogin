const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Define the path for the database
const dbPath = path.join(__dirname, 'mydatabase.db');

// Connect to the SQLite database, or create it if it doesn't exist
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('Could not connect to database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        createTable();
    }
});

// Create the users table if it doesn't exist
function createTable() {
    const sql = `
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        gender TEXT,
        dob DATE,
        branch TEXT,
        mail TEXT UNIQUE,
        phone TEXT,
        password TEXT,
        role TEXT
    )`;

    db.run(sql, (err) => {
        if (err) {
            console.error("Error creating table:", err.message);
        } else {
            console.log("Table created or already exists.");
        }
    });
}
app.get('/test', (req, res) => {
    res.send('This is a test route!');
});


// Handle GET request for user data
app.get('/users', (req, res) => {
    const sql = "SELECT * FROM users";
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(400).send("Error fetching users");
            console.error(err.message);
            return;
        }
        res.json(rows);
    });
});


// Register new users
app.post('/register', async (req, res) => {
    const { name, gender, dob, branch, mail, phone, password, role } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = 'INSERT INTO users (name, gender, dob, branch, mail, phone, password, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
        db.run(sql, [name, gender, dob, branch, mail, phone, hashedPassword, role], function(err) {
            if (err) {
                console.error(err.message);
                res.status(500).send('Error registering new user');
            } else {
                console.log(`A new row has been inserted with rowid ${this.lastID}`);
                res.status(201).send('Registered successfully');
            }
        });
    } catch {
        res.status(500).send();
    }
});

// Login users
app.post('/login', (req, res) => {
    const { mail, password } = req.body;
    const sql = 'SELECT * FROM users WHERE mail = ?';
    db.get(sql, [mail], async (err, user) => {
        if (err) {
            console.error(err.message);
            res.status(500).send('Error logging in');
        } else if (!user) {
            res.status(400).send('Cannot find user');
        } else {
            try {
                if (await bcrypt.compare(password, user.password)) {
                    res.send('Success');
                } else {
                    res.send('Not Allowed');
                }
            } catch {
                res.status(500).send();
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

process.on('SIGINT', () => {
    db.close(() => {
        console.log('Database connection closed.');
        process.exit(0);
    });
});
