const Pool = require("pg").Pool;
const pool= new Pool({
    user:"perntodo_app",
    password:"g0valp0",
    host:"localhost",
    port:5432,
    database:"perntodo"
});

module.exports = pool;