const dotenv = require("dotenv");
const Pool = require("pg").Pool;

dotenv.config();

const pool = new Pool({
    user: process.env.DB_USER || "bconf",
    password: process.env.DB_PASSWORD || "g0valp0",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || "bconf"
});

module.exports = pool;