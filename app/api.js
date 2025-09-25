const CircularJSON = require('circular-json')
const router = require('koa-router')()
const koaBody = require('koa-body')()
const Sql = require('./Sql')

const Responser = (ctx, res, code) => {
    ctx.status = code
    ctx.body = typeof res == "string" ? res : CircularJSON.stringify(res)
}

//搜索配件的品牌和类型
router.post('/api/getAscriptionInfo', koaBody, async ctx => {
    let conn
    let { ascriptionId } = ctx.request.body || {}
    try {
        if(!ascriptionId){
            Responser(ctx, 'ascriptionId is empty', 500)
        }else{
            conn = await Sql.getConn()
            let data = await Sql.query(conn, {
                sql: 'CALL getAscriptionInfo(?)',
                params: [ascriptionId]
            })
            Responser(ctx, data, 200)
        }
    } catch(err) {
        console.error('Gettin Song error: ' + err)
        Responser(ctx, err, 500)
    } finally {
        conn && conn.release()
    }
})

//搜索产品
router.post('/api/getProductInfo', koaBody, async ctx => {
    let conn
    let { classifyFilter, keyWord = '', sort, limit = 20, page = 0} = ctx.request.body || {}
    try {
        let start = limit * page,
            end = start + limit,
            sql

        conn = await Sql.getConn()
        if(sort == 0 || sort == 1) {
            sql = `SELECT * FROM CPU WHERE classify = IF(? = '',classify,?) AND title LIKE CONCAT('%', ?, '%') Order BY price+0 ${sort == 0 ? 'ASC' : 'DESC'} LIMIT ?, ?;`
        } else {
            sql = `SELECT * FROM CPU WHERE classify = IF(? = '',classify,?) AND title LIKE CONCAT('%', ?, '%') LIMIT ?, ?;`
        }
        let data = await Sql.query(conn, {
            sql,
            params: [classifyFilter, classifyFilter, keyWord, start, end]
        })
        Responser(ctx, data, 200)
        
    } catch(err) {
        console.error('Gettin Song error: ' + err)
        Responser(ctx, err, 500)
    } finally {
        conn && conn.release()
    }
})

// //获取型号名
// router.get('/api/getType', koaBody, async ctx => {
//     let conn
//     try {
//         conn = await Sql.getConn()
//         let data = await Sql.query(conn, {
//             sql: `SELECT * FROM type;`
//         })
//         Responser(ctx, data, 200)
//     } catch(err) {
//         console.error('Gettin Song error: ' + err)
//         Responser(ctx, err, 500)
//     } finally {
//         conn && conn.release()
//     }
// })

// //获取品牌
// router.get('/api/getBrand', async ctx => {
//     let conn
//     try {
//         conn = await Sql.getConn()
//         let data = await Sql.query(conn, {
//             sql: `SELECT * FROM brand;`
//         })
//         Responser(ctx, data, 200)
//     } catch (err) {
//         console.error('Gettin Song error: ' + err)
//         Responser(ctx, err, 500)
//     } finally {
//         conn && conn.release()
//     }
// })

// //添加品牌
// router.post('/api/addBrand', koaBody, async ctx => {
//     let conn
//     const { text } = ctx.request.body || {}
//     try {
//         if(!text){
//             Responser(ctx, 'brandName is empty', 500)
//         }else{
//             conn = await Sql.getConn()
//             let data = await Sql.query(conn, {
//                 sql: `INSERT INTO brand VALUES(UUID(), ?);`,
//                 params: [text]
//             })
//             Responser(ctx, data, 200)
//         }
//     } catch(err) {
//         console.error('Gettin Song error: ' + err)
//         Responser(ctx, err, 500)
//     } finally {
//         conn && conn.release()
//     }
// })

// //获取品牌
// router.get('/api/getPacking', async ctx => {
//     let conn
//     try {
//         conn = await Sql.getConn()
//         let data = await Sql.query(conn, {
//             sql: `SELECT * FROM packing;`
//         })
//         Responser(ctx, data, 200)
//     } catch (err) {
//         console.error('Gettin Song error: ' + err)
//         Responser(ctx, err, 500)
//     } finally {
//         conn && conn.release()
//     }
// })

// //添加品牌
// router.post('/api/addPacking', koaBody, async ctx => {
//     let conn
//     const { text } = ctx.request.body || {}
//     try {
//         if(!text){
//             Responser(ctx, 'brandName is empty', 500)
//         }else{
//             conn = await Sql.getConn()
//             let data = await Sql.query(conn, {
//                 sql: `INSERT INTO packing VALUES(UUID(), ?);`,
//                 params: [text]
//             })
//             Responser(ctx, data, 200)
//         }
//     } catch(err) {
//         console.error('Gettin Song error: ' + err)
//         Responser(ctx, err, 500)
//     } finally {
//         conn && conn.release()
//     }
// })

// //添加型号
// router.post('/api/addType', koaBody, async ctx => {
//     let conn
//     const { typeName, brandId, packingId } = ctx.request.body || {}
//     try {
//         if(!typeName || !brandId || !packingId){
//             Responser(ctx, 'typeName, brandId, packingId is empty', 500)
//         }else{
//             conn = await Sql.getConn()
//             let data = await Sql.query(conn, {
//                 sql: `INSERT INTO type VALUES(UUID(), ?, ?, ?);`,
//                 params: [typeName, brandId, packingId]
//             })
//             Responser(ctx, data, 200)
//         }
//     } catch(err) {
//         console.error('Gettin Song error: ' + err)
//         Responser(ctx, err, 500)
//     } finally {
//         conn && conn.release()
//     }
// })

// //查询型号
// router.post('/api/searchType', koaBody, async ctx => {
//     let conn
//     const { brandId, packingId } = ctx.request.body || {}
//     try {
//         conn = await Sql.getConn()
//         let data = await Sql.query(conn, {
//             sql: 'CALL searchType(?, ?);',
//             params: [brandId, packingId]
//         })
//         Responser(ctx, data, 200)
//     } catch(err) {
//         console.error('Gettin Song error: ' + err)
//         Responser(ctx, err, 500)
//     } finally {
//         conn && conn.release()
//     }
// })

// //模糊搜地址
// router.post('/api/searchAdress', koaBody, async ctx => {
//     let conn
//     const { keyWord } = ctx.request.body || {}
//     try {
//         if(!keyWord){
//             Responser(ctx, 'keyWord is empty', 500)
//         }else{
//             conn = await Sql.getConn()
//             let data = await Sql.query(conn, {
//                 sql: `SELECT * FROM adress WHERE adress LIKE CONCAT('%', ?, '%');`,
//                 params: [keyWord]
//             })
//             Responser(ctx, data, 200)
//         }
//     } catch(err) {
//         console.error('Gettin Song error: ' + err)
//         Responser(ctx, err, 500)
//     } finally {
//         conn && conn.release()
//     }
// })

// //添加订单
// router.post('/api/addOrder', koaBody, async ctx => {
//     let conn
//     let { typeId, adress, adressId, count, price } = ctx.request.body || {}
//     try {
//         if(!typeId || !adress || !count || !price){
//             Responser(ctx, 'keyWord is empty', 500)
//         }else{
//             let data
//             conn = await Sql.getConn()
//             if(!adressId) {
//                 data = await Sql.query(conn, {
//                     sql: `CALL addOrderWithoutAdressId(?, ?, ?, ?);`,
//                     params: [typeId, adress, count, price]
//                 })
//             } else {
//                 data = await Sql.query(conn, {
//                     sql: `CALL addOrder(?, ?, ?, ?);`,
//                     params: [typeId, adressId, count, price]
//                 })
//             }
//             Responser(ctx, data, 200)
//         }
//     } catch(err) {
//         console.error('Gettin Song error: ' + err)
//         Responser(ctx, err, 500)
//     } finally {
//         conn && conn.release()
//     }
// })

// //搜索订单
// router.post('/api/searchOrder', koaBody, async ctx => {
//     let conn
//     let { typeId, adressId, startDate, endDate } = ctx.request.body || {}
//     try {
//         let data
//         conn = await Sql.getConn()
//         if(!startDate || !endDate) {
//             data = await Sql.query(conn, {
//                 sql: `CALL searchOrder(?, ?);`,
//                 params: [typeId, adressId]
//             })
//         } else {
//             data = await Sql.query(conn, {
//                 sql: `CALL searchOrderWithDate(?, ?, ?, ?);`,
//                 params: [typeId, adressId, startDate, endDate]
//             })
//         }
//         Responser(ctx, data, 200)
//     } catch(err) {
//         console.error('Gettin Song error: ' + err)
//         Responser(ctx, err, 500)
//     } finally {
//         conn && conn.release()
//     }
// })


module.exports = router