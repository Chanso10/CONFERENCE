const Pool = require("pg").Pool;
const pool= new Pool({
    user:"bconf",
    password:"g0valp0",
    host:"localhost",
    port:5432,
    database:"bconf"
});

module.exports = pool;