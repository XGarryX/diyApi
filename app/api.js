const CircularJSON = require('circular-json')
const router = require('koa-router')()
const koaBody = require('koa-body')()
const Sql = require('./Sql')

const Responser = (ctx, res, code) => {
    ctx.status = code
    ctx.body = typeof res == "string" ? res : CircularJSON.stringify(res)
}

function checkCpu(cpuJk, boardJk) {
    if( cpuJk && boardJk && cpuJk != boardJk) {
        return `接口不兼容，CPU【${cpuJk}】，主板【${boardJk}】` 
    }
}
function checkBoard(cpuJk, boardJk) {
    if( cpuJk && boardJk && cpuJk != boardJk) {
        return `接口不兼容，主板【${boardJk}】，CPU【${cpuJk}】` 
    }
}
function checkMemory(ddr, boardDdr) {
    if( ddr && boardDdr && ddr != boardDdr) {
        return `主板和内存接口不兼容，主板【DDR${boardDdr}】，内存【DDR${ddr}】` 
    }
}
function checkGpu(length, xianka) {
    if(length && xianka && length > xianka) {
        return `显卡的长度【${length}cm】 超出机箱限长【 ≤${xianka}cm】`
    }
}
function checkDisk(jiekou, M2) {
    if(jiekou && M2 !== '' && jiekou == 'M.2' && M2 < 1) {
        return `主板和硬盘接口不兼容 主板未配备M.2接口`
    }
}
function checkFan(height, leixing, cpu, shuileng) {
    //判断是否为水冷 支不支持
    if(leixing && leixing.match('冷排')){
        if(shuileng && !shuileng.match('冷排')) {
            return `散热器与机箱不兼容，机箱不支持水冷`   
        } else {
            let fanLen = leixing.match(/\d+(?=冷排)/),
                chassisLen = shuileng.match(/\d+(?=冷排)/)
            
            fanLen = fanLen && fanLen[0] || null
            chassisLen = chassisLen && chassisLen[0] || null
            
            if(fanLen && chassisLen && fanLen > chassisLen) {
                return `散热器与机箱不兼容，散热器为${leixing},机箱为${shuileng}` 
            }
        }
    }


    if(height && cpu && height > cpu) {
        return `散热器与超过机箱高度，散热器【${height}mm】机箱【${cpu}mm】 `
    }
}
function checkChassis(boardSize, mBoardSize) {
    if(boardSize && mBoardSize && boardSize < mBoardSize) {
        return `机箱与主板大小不匹配，主板过大 `
    }
}

function checkPwoer(dygl, allGonglv) {
    if(dygl && allGonglv && dygl < allGonglv ) {
        return`电源功率不足，当前总功耗【${allGonglv}W】，电源功率【${dygl}W】`
    }
}

//搜索配件的品牌和类型
router.post('/api/getAscriptionInfo', koaBody, async ctx => {
    let conn, pool
    let { ascriptionId } = ctx.request.body || {}
    try {
        if(!ascriptionId){
            Responser(ctx, 'ascriptionId is empty', 500)
        }else{
            [conn, pool] = await Sql.getConn()
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
        conn && pool && pool.releaseConnection(conn)
    }
})

//获取cpu
router.post('/api/getCpuInfo', koaBody, async ctx => {
    let conn, pool
    let { classifyFilter, keyWord = '', sort, limit = 20, page = 0, allId = ''} = ctx.request.body || {}
    try {
        let start = limit * page,
            end = start + limit,
            sql

        let { boardId } = JSON.parse(allId)
        
        let req = await Sql.getConn()
        conn = req[0]
        pool = req[1]

        if(sort == 0 || sort == 1) {
            sql = `
                SELECT CPU.*, HistoryPrice.currentPrice as price,
                    (SELECT jk from CPUJk WHERE CPUJk.id = CPU.jk) as cpuJk,
                    (SELECT jk from CPUJk WHERE CPUJk.id = MotherBoard.cpu) as boardJk
                FROM CPU
                    LEFT JOIN MotherBoard ON MotherBoard.id = ?
                    LEFT JOIN HistoryPrice ON HistoryPrice.pid = CPU.id
                WHERE CPU.classify = IF(? = '',CPU.classify,?) AND CPU.title LIKE CONCAT('%', ?, '%') Order BY HistoryPrice.currentPrice ${sort == 0 ? 'ASC' : 'DESC'} LIMIT ?, ?;`
        } else {
            sql = `
                SELECT CPU.*, HistoryPrice.currentPrice as price, 
                    (SELECT jk from CPUJk WHERE CPUJk.id = CPU.jk) as cpuJk,
                    (SELECT jk from CPUJk WHERE CPUJk.id = MotherBoard.cpu) as boardJk
                FROM CPU
                    LEFT JOIN MotherBoard ON MotherBoard.id = ?
                    LEFT JOIN HistoryPrice ON HistoryPrice.pid = CPU.id
                WHERE CPU.classify = IF(? = '',CPU.classify,?) AND CPU.title LIKE CONCAT('%', ?, '%') LIMIT ?, ?;`
        }
        
        let cpuData = await Sql.query(conn, {
            sql,
            params: [boardId, classifyFilter, classifyFilter, keyWord, start, end]
        })
        
        if(boardId) {
            cpuData.forEach(item => {
                let { cpuJk, boardJk } = item,
                    err = checkCpu(cpuJk, boardJk)
                if(err)
                    item.err = err
            })
        }

        Responser(ctx, cpuData, 200)
        
    } catch(err) {
        console.error('Gettin Song error: ' + err)
        Responser(ctx, err, 500)
    } finally {
        conn && pool && pool.releaseConnection(conn)
    }
})

//搜索主板
router.post('/api/getBoardInfo', koaBody, async ctx => {
    let conn, pool
    let { classifyFilter, brandFilter, keyWord = '', sort, limit = 20, page = 0, allId = ''} = ctx.request.body || {}
    try {
        let start = limit * page,
            end = start + limit,
            sql

        let req = await Sql.getConn()
        conn = req[0]
        pool = req[1]

        if(sort == 0 || sort == 1) {
            sql = `
                SELECT MotherBoard.*, HistoryPrice.currentPrice as price,
                    (SELECT jk from CPUJk WHERE CPUJk.id = CPU.jk) as cpuJk,
                    (SELECT jk from CPUJk WHERE CPUJk.id = MotherBoard.cpu) as boardJk,
                    (SELECT BoradSize.sizeName from BoradSize WHERE BoradSize.size  = MotherBoard.size) as boradSize
                FROM MotherBoard
                    LEFT JOIN CPU ON CPU.id = ?
                    LEFT JOIN HistoryPrice ON HistoryPrice.pid = MotherBoard.id
                WHERE MotherBoard.classify = IF(? = '',MotherBoard.classify,?) AND MotherBoard.brand = IF(? = '',MotherBoard.brand,?) AND MotherBoard.title LIKE CONCAT('%', ?, '%') Order BY HistoryPrice.currentPrice ${sort == 0 ? 'ASC' : 'DESC'} LIMIT ?, ?;`
        } else {
            sql = `
                SELECT MotherBoard.*, HistoryPrice.currentPrice as price,
                    (SELECT jk from CPUJk WHERE CPUJk.id = CPU.jk) as cpuJk,
                    (SELECT jk from CPUJk WHERE CPUJk.id = MotherBoard.cpu) as boardJk,
                    (SELECT BoradSize.sizeName from BoradSize WHERE BoradSize.size  = MotherBoard.size) as boradSize
                FROM MotherBoard
                    LEFT JOIN CPU ON CPU.id = ?
                    LEFT JOIN HistoryPrice ON HistoryPrice.pid = MotherBoard.id
                WHERE MotherBoard.classify = IF(? = '',MotherBoard.classify,?) AND MotherBoard.brand = IF(? = '',MotherBoard.brand,?) AND MotherBoard.title LIKE CONCAT('%', ?, '%') LIMIT ?, ?;`
        }
        let { cpuId } = JSON.parse(allId)

        let data = await Sql.query(conn, {
            sql,
            params: [cpuId, classifyFilter, classifyFilter, brandFilter, brandFilter, keyWord, start, end]
        })

        if(cpuId) {
            data.forEach(item => {
                let { cpuJk, boardJk } = item,
                    err = checkBoard(cpuJk, boardJk)
                if(err)
                    item.err = err
            })
        }
        Responser(ctx, data, 200)
        
    } catch(err) {
        console.error('Gettin Song error: ' + err)
        Responser(ctx, err, 500)
    } finally {
        conn && pool && pool.releaseConnection(conn)
    }
})
//内存
router.post('/api/getMemoryInfo', koaBody, async ctx => {
    let conn, pool
    let { classifyFilter, brandFilter, keyWord = '', sort, limit = 20, page = 0, allId = ''} = ctx.request.body || {}
    try {
        let start = limit * page,
            end = start + limit,
            sql

        let req = await Sql.getConn()
        conn = req[0]
        pool = req[1]

        if(sort == 0 || sort == 1) {
            sql = `
                SELECT Memory.*, MotherBoard.ddr AS boardDdr, HistoryPrice.currentPrice as price FROM Memory
                    LEFT JOIN MotherBoard ON MotherBoard.id = ?
                    LEFT JOIN HistoryPrice ON HistoryPrice.pid = Memory.id
                WHERE Memory.classify = IF(? = '',Memory.classify,?) AND Memory.brand = IF(? = '',Memory.brand,?) AND Memory.title LIKE CONCAT('%', ?, '%') Order BY HistoryPrice.currentPrice ${sort == 0 ? 'ASC' : 'DESC'} LIMIT ?, ?;`
        } else {
            sql = `
                SELECT Memory.*, MotherBoard.ddr AS boardDdr, HistoryPrice.currentPrice as price FROM Memory
                    LEFT JOIN MotherBoard ON MotherBoard.id = ?
                    LEFT JOIN HistoryPrice ON HistoryPrice.pid = Memory.id
                WHERE Memory.classify = IF(? = '',Memory.classify,?) AND Memory.brand = IF(? = '',Memory.brand,?) AND Memory.title LIKE CONCAT('%', ?, '%') LIMIT ?, ?;`
        }
        let { boardId } = JSON.parse(allId)

        let data = await Sql.query(conn, {
            sql,
            params: [boardId, classifyFilter, classifyFilter, brandFilter, brandFilter, keyWord, start, end]
        })

        if(boardId) {
            data.forEach(item => {
                let { ddr, boardDdr } = item,
                    err = checkMemory(ddr, boardDdr)
                if(err)
                    item.err = err
            })
        }
    
        Responser(ctx, data, 200)
        
    } catch(err) {
        console.error('Gettin Song error: ' + err)
        Responser(ctx, err, 500)
    } finally {
        conn && pool && pool.releaseConnection(conn)
    }
})

router.post('/api/getGpuInfo', koaBody, async ctx => {
    let conn, pool
    let { classifyFilter, brandFilter, keyWord = '', sort, limit = 20, page = 0, allId = ''} = ctx.request.body || {}
    try {
        let start = limit * page,
            end = start + limit,
            sql

        let req = await Sql.getConn()
        conn = req[0]
        pool = req[1]

        if(sort == 0 || sort == 1) {
            sql = `
                SELECT GPU.*, Chassis.xianka, HistoryPrice.currentPrice as price FROM GPU
                    LEFT JOIN Chassis ON Chassis.id = ?
                    LEFT JOIN HistoryPrice ON HistoryPrice.pid = GPU.id
                WHERE GPU.classify = IF(? = '',GPU.classify,?) AND GPU.brand = IF(? = '',GPU.brand,?) AND GPU.title LIKE CONCAT('%', ?, '%') Order BY HistoryPrice.currentPrice ${sort == 0 ? 'ASC' : 'DESC'} LIMIT ?, ?;`
        } else {
            sql = `
                SELECT GPU.*, Chassis.xianka, HistoryPrice.currentPrice as price FROM GPU
                    LEFT JOIN Chassis ON Chassis.id = ?
                    LEFT JOIN HistoryPrice ON HistoryPrice.pid = GPU.id
                WHERE GPU.classify = IF(? = '',GPU.classify,?) AND GPU.brand = IF(? = '',GPU.brand,?) AND GPU.title LIKE CONCAT('%', ?, '%') LIMIT ?, ?;`
        }
        let { chassisId } = JSON.parse(allId)

        let data = await Sql.query(conn, {
            sql,
            params: [chassisId, classifyFilter, classifyFilter, brandFilter, brandFilter, keyWord, start, end]
        })

        if(chassisId) {
            data.forEach(item => {
                let { length, xianka } = item,
                    err = checkGpu(length, xianka)
                if(err)
                    item.err = err
            })
        }

        Responser(ctx, data, 200)
        
    } catch(err) {
        console.error('Gettin Song error: ' + err)
        Responser(ctx, err, 500)
    } finally {
        conn && pool && pool.releaseConnection(conn)
    }
})

router.post('/api/getDiskInfo', koaBody, async ctx => {
    let conn, pool
    let { classifyFilter, brandFilter, keyWord = '', sort, limit = 20, page = 0, allId} = ctx.request.body || {}
    try {
        let start = limit * page,
            end = start + limit,
            sql

        let req = await Sql.getConn()
        conn = req[0]
        pool = req[1]
        
        if(sort == 0 || sort == 1) {
            sql = `
                SELECT Disk.*, MotherBoard.M2, HistoryPrice.currentPrice as price FROM Disk
                    LEFT JOIN MotherBoard ON MotherBoard.id = ?
                    LEFT JOIN HistoryPrice ON HistoryPrice.pid = Disk.id
                WHERE Disk.classify = IF(? = '',Disk.classify,?) AND Disk.brand = IF(? = '',Disk.brand,?) AND Disk.title LIKE CONCAT('%', ?, '%') Order BY HistoryPrice.currentPrice ${sort == 0 ? 'ASC' : 'DESC'} LIMIT ?, ?;`
        } else {
            sql = `
                SELECT Disk.*, MotherBoard.M2, HistoryPrice.currentPrice as price FROM Disk 
                    LEFT JOIN MotherBoard ON MotherBoard.id = ?
                    LEFT JOIN HistoryPrice ON HistoryPrice.pid = Disk.id
                WHERE Disk.classify = IF(? = '',Disk.classify,?) AND Disk.brand = IF(? = '',Disk.brand,?) AND Disk.title LIKE CONCAT('%', ?, '%') LIMIT ?, ?;`
        }
        let { boardId } = JSON.parse(allId)

        let data = await Sql.query(conn, {
            sql,
            params: [boardId, classifyFilter, classifyFilter, brandFilter, brandFilter, keyWord, start, end]
        })

        if(boardId) {
            data.forEach(item => {
                let { jiekou, M2 } = item,
                    err = checkDisk(jiekou, M2)
                if (err)
                    item.err = err
            })
        }

        Responser(ctx, data, 200)
        
    } catch(err) {
        console.error('Gettin Song error: ' + err)
        Responser(ctx, err, 500)
    } finally {
        conn && pool && pool.releaseConnection(conn)
    }
})

router.post('/api/getPowerInfo', koaBody, async ctx => {
    let conn, pool
    let { classifyFilter, brandFilter, keyWord = '', sort, limit = 20, page = 0, allId = ''} = ctx.request.body || {}
    try {
        let start = limit * page,
            end = start + limit,
            sql

        let req = await Sql.getConn()
        conn = req[0]
        pool = req[1]
        if(sort == 0 || sort == 1) {
            sql = `SELECT Power.*, HistoryPrice.currentPrice as price FROM Power 
                        LEFT JOIN HistoryPrice ON HistoryPrice.pid = Power.id
                    WHERE Power.classify = IF(? = '',Power.classify,?) AND Power.brand = IF(? = '',Power.brand,?) AND Power.title LIKE CONCAT('%', ?, '%') Order BY HistoryPrice.currentPrice ${sort == 0 ? 'ASC' : 'DESC'} LIMIT ?, ?;`
        } else {
            sql = `SELECT Power.*, HistoryPrice.currentPrice as price FROM Power
                        LEFT JOIN HistoryPrice ON HistoryPrice.pid = Power.id
                    WHERE Power.classify = IF(? = '',Power.classify,?) AND Power.brand = IF(? = '',Power.brand,?) AND title LIKE CONCAT('%', ?, '%') LIMIT ?, ?;`
        }
        let data = await Sql.query(conn, {
            sql,
            params: [classifyFilter, classifyFilter, brandFilter, brandFilter, keyWord, start, end]
        })

        let { cpuId, gpuId, memoryId, diskId, fanId } = JSON.parse(allId)
        let ids = [cpuId, gpuId, memoryId, diskId, fanId],
            names = [],
            params = []

        ids.forEach((item, index) => {
            let name
            if(item) {
                switch(index) {
                    case 0:
                        name = 'CPU'
                        break
                    case 1:
                        name = 'GPU'
                        break
                    case 2:
                        name = 'Memory'
                        break
                    case 3:
                        name = 'Disk'
                        break
                    case 4:
                        name = 'Fan'
                        break
                }
                name && names.push(name)
                name && params.push(item)
            }
        })
        
        if(names.length) {
            let getPowerSql =`SELECT SUM(${ names.map(item => item + '.gonglv').join('+')}) AS gonglv FROM ${names[0]}
                ${names.slice(1).map(item => {return `LEFT JOIN ${item} ON ${item}.id = ?`}).join('')}WHERE ${names[0]}.id = ?`,
            b = [...params.slice(1), params[0]]
            
            let res = await Sql.query(conn, {
                sql: getPowerSql,
                params: b
            })

            let allGonglv = res[0] && res[0].gonglv

            data.forEach(item => {
                let { dygl } = item,
                    err = checkPwoer(dygl, allGonglv)
                if(err)
                    item.err = err
            })
        }

        Responser(ctx, data, 200)
        
    } catch(err) {
        console.error('Gettin Song error: ' + err)
        Responser(ctx, err, 500)
    } finally {
        conn && pool && pool.releaseConnection(conn)
    }
})

router.post('/api/getFanInfo', koaBody, async ctx => {
    let conn, pool
    let { classifyFilter, brandFilter, keyWord = '', sort, limit = 20, page = 0, allId} = ctx.request.body || {}
    try {
        let start = limit * page,
            end = start + limit,
            sql

        let req = await Sql.getConn()
        conn = req[0]
        pool = req[1]
        if(sort == 0 || sort == 1) {
            sql = `
                SELECT Fan.*, Chassis.cpu, Chassis.shuileng, HistoryPrice.currentPrice as price FROM Fan 
                    LEFT JOIN Chassis ON Chassis.id = ?
                    LEFT JOIN HistoryPrice ON HistoryPrice.pid = Fan.id
                WHERE Fan.classify = IF(? = '',Fan.classify,?) AND Fan.brand = IF(? = '',Fan.brand,?) AND Fan.title LIKE CONCAT('%', ?, '%') Order BY HistoryPrice.currentPrice ${sort == 0 ? 'ASC' : 'DESC'} LIMIT ?, ?;`
        } else {
            sql = `
                SELECT Fan.*, Chassis.cpu, Chassis.shuileng, HistoryPrice.currentPrice as price FROM Fan
                    LEFT JOIN Chassis ON Chassis.id = ?
                    LEFT JOIN HistoryPrice ON HistoryPrice.pid = Fan.id
                WHERE Fan.classify = IF(? = '',Fan.classify,?) AND Fan.brand = IF(? = '',Fan.brand,?) AND Fan.title LIKE CONCAT('%', ?, '%') LIMIT ?, ?;`
        }
        let { chassisId } = JSON.parse(allId)

        let data = await Sql.query(conn, {
            sql,
            params: [chassisId, classifyFilter, classifyFilter, brandFilter, brandFilter, keyWord, start, end]
        })        

        if(chassisId) {
            data.forEach(item => {
                let { height, leixing, cpu, shuileng } = item,
                    err = checkFan(height, leixing, cpu, shuileng)
                if(err)
                    item.err = err
            })
        }

        Responser(ctx, data, 200)
        
    } catch(err) {
        console.error('Gettin Song error: ' + err)
        Responser(ctx, err, 500)
    } finally {
        conn && pool && pool.releaseConnection(conn)
    }
})

router.post('/api/getChassisInfo', koaBody, async ctx => {
    let conn, pool
    let { classifyFilter, brandFilter, keyWord = '', sort, limit = 20, page = 0, allId} = ctx.request.body || {}
    try {
        let start = limit * page,
            end = start + limit,
            sql

        let req = await Sql.getConn()
        conn = req[0]
        pool = req[1]
        if(sort == 0 || sort == 1) {
            sql = `
                SELECT Chassis.*, MotherBoard.size AS mBoardSize, BoradSize.sizeName, HistoryPrice.currentPrice as price
                FROM Chassis 
                    LEFT JOIN MotherBoard ON MotherBoard.id = ?
                    LEFT JOIN BoradSize ON BoradSize.size = Chassis.boardSize
                    LEFT JOIN HistoryPrice ON HistoryPrice.pid = Chassis.id
                WHERE Chassis.classify = IF(? = '',Chassis.classify,?) AND Chassis.brand = IF(? = '',Chassis.brand,?) AND Chassis.title LIKE CONCAT('%', ?, '%') Order BY HistoryPrice.currentPrice ${sort == 0 ? 'ASC' : 'DESC'} LIMIT ?, ?;`
        } else {
            sql = `
                SELECT Chassis.*, MotherBoard.size AS mBoardSize, BoradSize.sizeName , HistoryPrice.currentPrice as price
                FROM Chassis
                    LEFT JOIN MotherBoard ON MotherBoard.id = ?
                    LEFT JOIN BoradSize ON BoradSize.size = Chassis.boardSize
                    LEFT JOIN HistoryPrice ON HistoryPrice.pid = Chassis.id
                WHERE Chassis.classify = IF(? = '',Chassis.classify,?) AND Chassis.brand = IF(? = '',Chassis.brand,?) AND Chassis.title LIKE CONCAT('%', ?, '%') LIMIT ?, ?;`
        }
        let { boardId } = JSON.parse(allId)

        let data = await Sql.query(conn, {
            sql,
            params: [boardId, classifyFilter, classifyFilter, brandFilter, brandFilter, keyWord, start, end]
        })

        if(boardId) {
            data.forEach(item => {
                let { boardSize, mBoardSize } = item,
                    err = checkChassis(boardSize, mBoardSize)
                if(err)
                    item.err = err
            })
        }

        Responser(ctx, data, 200)
        
    } catch(err) {
        console.error('Gettin Song error: ' + err)
        Responser(ctx, err, 500)
    } finally {
        conn && pool && pool.releaseConnection(conn)
    }
})
//检查兼容性
router.post('/api/checkCompatible', koaBody, async ctx => {
    let conn, pool
    let { allId } = ctx.request.body || {}
    try {
        let req = await Sql.getConn()
        conn = req[0]
        pool = req[1]
        
        let { cpuId, boardId, memoryId, gpuId, diskId, powerId, fanId, chassisId } = JSON.parse(allId)

        let data = await Sql.query(conn, {
            sql: 'call getCcompatibleInfo(?, ?, ?, ?, ?, ?, ?, ?)',
            params: [cpuId, boardId, memoryId, gpuId, diskId, powerId, fanId, chassisId]
        })
        
        let err = [
            allInfo => {
                let { jk } = allInfo[0][0] || {}
                let { jk: boardJk } = allInfo[1][0] || {}
                return checkCpu(jk, boardJk)
            },
            allInfo => {
                let { jk } = allInfo[0]
                let { jk: boardJk } = allInfo[1][0] || {}
                return checkBoard(jk, boardJk)
            },
            allInfo => {
                let { ddr: boardDdr } = allInfo[1][0] || {}
                let { ddr } = allInfo[2][0] || {}
                return checkMemory(ddr, boardDdr)
            },
            allInfo => {
                let { length } = allInfo[3][0] || {}
                let { xianka } = allInfo[7][0] || {}
                return checkGpu(length, xianka)
            },
            allInfo => {
                let { M2 } = allInfo[1][0] || {}
                let { jiekou } = allInfo[4][0] || {}
                return checkDisk(jiekou, M2)
            },
            allInfo => {
                let { dygl } = allInfo[5][0] || {}
                let allGonglv = [...data].reduce((prpo, current) => {
                    let { gonglv = 0 } = current[0] || {}
                    return prpo + gonglv
                }, 0)
                return checkPwoer(dygl, allGonglv)
            },
            allInfo => {
                let { height, leixing } = allInfo[6][0] || {}
                let { cpu, shuileng } = allInfo[7][0] || {}
                return checkFan(height, leixing, cpu, shuileng)
            },
            allInfo => {
                let { size } = allInfo[1][0] || {}
                let { boardSize } = allInfo[7][0] || {}
                return checkChassis(boardSize, size)
            }
        ].map(item => item(data))

        Responser(ctx, err, 200)
        
    } catch(err) {
        console.error('Gettin Song error: ' + err)
        Responser(ctx, err, 500)
    } finally {
        conn && pool && pool.releaseConnection(conn)
    }
})

router.post('/api/getHistoryPrice', koaBody, async ctx => {
    let conn, pool
    let { productId, ascriptionId } = ctx.request.body || {}
    try {
        if(productId == undefined || ascriptionId == undefined) {
            Responser(ctx, 'productId or aid is empty', 500)
        } else {
            let table
            
            switch(ascriptionId) {
                case '1':
                    table = `
                        SELECT CPU.*, 
                            (SELECT jk from CPUJk WHERE CPUJk.id = CPU.jk) as cpuJk
                        FROM CPU WHERE CPU.id = ?;
                    `
                    break
                case '2':
                    table = `
                        SELECT MotherBoard.*,
                            (SELECT jk from CPUJk WHERE CPUJk.id = MotherBoard.cpu) as boardJk,
                            (SELECT BoradSize.sizeName from BoradSize WHERE BoradSize.size  = MotherBoard.size) as boradSize
                        FROM MotherBoard WHERE MotherBoard.id = ?;
                    `
                    break
                case '3':
                    table = `SELECT * FROM Memory WHERE Memory.id = ?;`
                    break
                case '4':
                    table = 'SELECT * FROM GPU WHERE GPU.id = ?;'
                    break
                case '5':
                    table = 'SELECT * FROM Disk WHERE Disk.id = ?;'
                    break
                case '6':
                    table = 'SELECT * FROM Power WHERE Power.id = ?;'
                    break
                case '7':
                    table = 'SELECT * FROM Fan WHERE Fan.id = ?;'
                    break
                case '8':
                    table = `
                        SELECT Chassis.*, BoradSize.sizeName FROM Chassis
                            LEFT JOIN BoradSize ON BoradSize.size = Chassis.boardSize
                        WHERE Chassis.id = ?;
                    `
                    break
            }


            let req = await Sql.getConn()
            conn = req[0]
            pool = req[1]
            let [historyPrice, productInfo] = await Promise.all([
                    Sql.query(conn, {
                        sql: 'SELECT * FROM HistoryPrice WHERE HistoryPrice.pid = ?',
                        params: [productId]
                    }),
                    Sql.query(conn, {
                        sql: table,
                        params: [productId]
                    })
                ])

            historyPrice = historyPrice && historyPrice[0] || {}
            productInfo = productInfo && productInfo[0] || {}

            Responser(ctx, [historyPrice, productInfo], 200)
        }
    } catch(err) {
        console.error('Gettin Song error: ' + err)
        Responser(ctx, err, 500)
    } finally {
        conn && pool && pool.releaseConnection(conn)
    }
})

router.post('/api/getBuilds', koaBody, async ctx => {
    let conn, pool
    let { buildId } = ctx.request.body || {}
    try {
        if(buildId == undefined) {
            Responser(ctx, 'buildId is empty', 500)
        } else {
            let req = await Sql.getConn()
            conn = req[0]
            pool = req[1]

            let data = await Sql.query(conn, {
                sql: 'CALL getBuildInfo(?)',
                params: [buildId]
            })

        data = data[0] || []

        Responser(ctx, data, 200)
        }
    } catch(err) {
        console.error('Gettin Song error: ' + err)
        Responser(ctx, err, 500)
    } finally {
        conn && pool && pool.releaseConnection(conn)
    }
})

module.exports = router