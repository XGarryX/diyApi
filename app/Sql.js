const OptPool = require('./Clienter')
const optPool = new OptPool();
const pool = optPool.getPool();

const Sql = {
    getConn: async _ => {
        return new Promise((reslove, reject) => {
            pool.getConnection(function (err, conn) {
                err && reject(err) || reslove(conn)
            });
        })
    },
    query: async (conn, option) => {
        return new Promise((reslove, reject) => {
            conn.query(option.sql, option.params, function (err, rs) {
                err && reject(err) || reslove(rs)
            })
        })
    }
}

module.exports = Sql