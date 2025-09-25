const axios = require('axios')

const Nv = require('./code')

const Sql = require('./app/Sql')

const limit = 20

const { BoradSize, BrandData } = require('./DATA')

function sleep(time) {
    return new Promise(res => {
        setTimeout(res, time)
    })
}

let jkList = {
    "Socket AM5": 1,
    "Socket AM4": 2,
    "LGA 1200": 3,
    "LGA2011-3": 4,
    "LGA 1151": 5,
    "LGA 1851": 6,
    "LGA 1700": 7
}

let CPU = {
        "classify":1,
        "classify1":0,
}

let Bord = {
    "classify":2,
    "classify1":0,
    "cpu_jiekou": "",
}

let Card = {
    "classify": 4
}

let Disk = {
    "classify": 5
}

let Power = {
    "classify": 6
}

let Fan = {
    "classify": 7
}

let Chassis = {
    "classify": 8
}

let Memory = { classify: 3 }

async function getList(type, page = 1) {
    let list
    try {
        let res = await axios.post('https://www.diy888.cn/api/goods/getGoodsList', {
            page,
            limit,
            "title":"",
            "price2":0,
            "price1":0,
            "brand":0,
            "sort":0,
            "hidden":0,
            "zhuban_jiekou":"",
            "zhuban_gongdian":"",
            "cpu_jiekou":"",
            "cpu_gongdian":"",
            "zhuban_ddr":"",
            "neicun_daishu":"",
            "gonghao":0,
            "zhuban_banxing":"",
            "zhuban_pinlv":"",
            ...type
        }, {
            headers: {
                "sec-ch-ua": `"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"`,
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "Windows",
                "ec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36"
            }
        })

        list = Nv(res.data.data)
    } catch (e) {
        console.log(e)
    }

    return list
}


async function getListByPage(type, list = [], page = 1) {
    await sleep(500)

    let resList = await getList(type, page)

    list = [...list, ...resList]

    if(resList.length % limit == 0 && resList.length != 0){
        console.log(`------------正在获取第${page}页-----------------`)
        return getListByPage(type, list, ++page)
    }

    return list
}

async function insertData(conn, sql, params) {
    try {
        await Sql.query(conn, {
            sql,
            params
        })
    } catch(err) {
        console.error('Gettin Song error: ' + err)
    }
}

async function getBrand() {
    let conn,
        template = `INSERT INTO Brand VALUES`

    try {
        conn = await Sql.getConn()
        for(let classify in BrandData) {
            let brand = BrandData[classify],
                sql = template,
                params = []

            for(let i = 0; i < brand.length; i++) {
                let { id, name } = brand[i]
    
                sql += " (?, ?, ?),"
    
                params.push(id, classify, name)
            }
    
            sql = sql.replace(/.$/, ";")
    
            await insertData(conn, sql, params)
        }
    } catch(err) {
        console.error('Gettin Song error: ' + err)
    } finally {
        conn && conn.release()
    }
}

//getBrand()

async function getCpu() {
    let CPUList = await getListByPage(CPU),
        conn,
        MAXIUM = 5,
        template = `INSERT INTO CPU VALUES`

    try {
        conn = await Sql.getConn()
        
        for(let i = 0; i < CPUList.length; i += MAXIUM) {
            let sql = template,
                params = []

            for(let j = 0; i + j < CPUList.length; j++) {
                let { id, classify1, pic, title, orginal_price, paofen, gonglv, son: {hexin, xiancheng, xilie, zhicheng, jiekou, hexian, erji, zhuping, jiasu, sanji}} = CPUList[i + j]

                jiekou = jkList[jiekou] || jiekou

                hexian = hexian == '支持' ? 1 : 0

                sql += " (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),"

                params.push(id, classify1, title, hexin, xiancheng, xilie, zhicheng, jiekou, hexian, erji, zhuping, jiasu, sanji, orginal_price, paofen, gonglv, pic)
            }

            sql = sql.replace(/.$/, ";")

            await insertData(conn, sql, params)
        }
    } catch(err) {
        console.error('Gettin Song error: ' + err)
    } finally {
        conn && conn.release()
        console.log('done')
    }
}

//getCpu()

async function getBoard() {
    let bordList = await getListByPage(Bord),
        conn = await Sql.getConn()
        MAXIUM = 5,
        template = `INSERT INTO MotherBoard VALUES`

    try {
        
        for(let i = 0; i < bordList.length; i += MAXIUM) {
            let sql = template,
                params = []

            for(let j = 0; j < MAXIUM && i + j < bordList.length; j++) {
                let { id, classify1, title, orginal_price, gonglv, pic, son: {pingpai, yingpan, rgb, jiekou, wifi, banxing, pcie, xinpian, m2, sata, ddr, ddrcc, ddrrl, wangsu, dyjk, gongdian}} = bordList[i + j]

                let bid = pingpai && BrandData[Bord.classify].find(item => {
                    let reg = new RegExp(item.name, "i")

                    return pingpai && pingpai.match(reg) || title.match(reg)
                })

                bid = bid && bid.id || null
                
                banxing = BoradSize[banxing]
                jiekou = jkList[jiekou]
                m2 = m2.match(/^\d+/), m2 = m2 && m2[0] || 0
                ddr = ddr.match(/\d$/g), ddr = ddr && ddr[0] || 0
                ddrcc = ddrcc.match(/^\d/g), ddrcc = ddrcc&& ddrcc[0] || 0
                

                sql += " (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),"

                params.push(id, classify1, bid, title, yingpan, rgb, jiekou, wifi, banxing, pcie, xinpian, m2, sata, ddr, ddrcc, ddrrl, wangsu, dyjk, gongdian, orginal_price, gonglv, pic)
            }

            sql = sql.replace(/.$/, ";")

            await insertData(conn, sql, params)
        }
    } catch(err) {
        console.error('Gettin Song error: ' + err)
    } finally {
        conn && conn.release()
        console.log('done')
    }
}

getBoard()

async function getCard() {
    let cardList = await getListByPage(Card),
        conn = await Sql.getConn()
        MAXIUM = 5,
        template = `INSERT INTO GPU VALUES`

    try {
        
        for(let i = 0; i < cardList.length; i += MAXIUM) {
            let sql = template,
                params = []

            for(let j = 0; j < MAXIUM && i + j < cardList.length; j++) {
                let { id, classify1, pic, title, orginal_price, gonglv, paofen, son: {pingpai, xiancun, xclx, xcwk, jiekou, fengshan, dengxiao, dianyuan, length}} = cardList[i + j]

                let bid = BrandData[Card.classify].find(item => {
                    let reg = new RegExp(item.name, "i")

                    return (pingpai && pingpai.match(reg) || title.match(reg))
                })

                length = length.match(/([1-9]\d*\.?\d*)|(0\.\d*[1-9])(?=cm)/), length = length && length[0] || null

                bid = bid && bid.id || null

                sql += " (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),"

                params.push(id, classify1, bid, pic, title, orginal_price, gonglv, paofen, xiancun, xclx, xcwk, jiekou, fengshan, dengxiao, dianyuan, length)
            }

            sql = sql.replace(/.$/, ";")

            await insertData(conn, sql, params)
        }
    } catch(err) {
        console.error('Gettin Song error: ' + err)
    } finally {
        conn && conn.release()
        console.log('done')
    }
}

//getCard()

async function getMemory() {
    let memoryList = await getListByPage(Memory),
    //let memoryList = await getList(Memory, 1),
        conn,
        MAXIUM = 5,
        template = `INSERT INTO Memory VALUES`

    try {
        conn = await Sql.getConn()
        for(let i = 0; i < memoryList.length; i += MAXIUM) {
            let sql = template,
                params = []

            for(let j = 0; j < MAXIUM && i + j < memoryList.length; j++) {
                let { id, classify1, orginal_price, title, gonglv, paofen, pic, son: { pingpai, daishu, waiguan, rongliang, pinlv, shuliang, timing, particles }} = memoryList[i + j]

                let bid = BrandData[Memory.classify].find(item => {
                    let reg = new RegExp(item.name, "i")

                    return pingpai && pingpai.match(reg) || title.match(reg)
                })
                
                daishu = daishu.toLowerCase().match(/(?<=ddr)\d/)[0]
                bid = bid && bid.id || null

                sql += " (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),"

                params.push(id, classify1, bid, title, orginal_price, gonglv, paofen, pic, daishu, waiguan, rongliang, pinlv, shuliang, timing, particles)
            }

            sql = sql.replace(/.$/, ";")

            await insertData(conn, sql, params)
        }
    } catch(err) {
        console.error('Gettin Song error: ' + err)
    } finally {
        conn && conn.release()
        console.log('done')
    }
}

//getMemory()

async function getDisk() {
    let diskList = await getListByPage(Disk),
        conn,
        MAXIUM = 5,
        template = `INSERT INTO Disk VALUES`

    try {
        conn = await Sql.getConn()
        for(let i = 0; i < diskList.length; i += MAXIUM) {
            let sql = template,
                params = []

            for(let j = 0; j < MAXIUM && i + j < diskList.length; j++) {
                let { id, classify1, orginal_price, title, gonglv, paofen, pic, son: { pinpai, xieyi, dusu, rongliang, jiekou, xieru, leixing, is_cache}} = diskList[i + j]

                let bid = BrandData[Disk.classify].find(item => {
                    let reg = new RegExp(item.name.trim(), "i")

                    return pinpai && pinpai.match(reg) || title.match(reg)
                })

                bid = bid && bid.id || null

                sql += " (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),"

                params.push(id, classify1, bid, title, orginal_price, gonglv, paofen, pic, xieyi, dusu, rongliang, jiekou, xieru, leixing, is_cache)
            }

            sql = sql.replace(/.$/, ";")

            await insertData(conn, sql, params)
        }
    } catch(err) {
        console.error('Gettin Song error: ' + err)
    } finally {
        conn && conn.release()
        console.log('done')
    }
}

//getDisk()

async function getPower() {
    let powerList = await getListByPage(Power),
        conn,
        MAXIUM = 5,
        template = `INSERT INTO Power VALUES`

    try {
        conn = await Sql.getConn()
        for(let i = 0; i < powerList.length; i += MAXIUM) {
            let sql = template,
                params = []

            for(let j = 0; j < MAXIUM && i + j < powerList.length; j++) {
                let { id, classify1, orginal_price, title, pic, son: { pinpai, fsqt, xiaolv, leixing, jiekou, sata, dygl}} = powerList[i + j]

                let bid = BrandData[Power.classify].find(item => {
                    let reg = new RegExp(item.name.trim(), "i")

                    return pinpai && pinpai.match(reg) || title.match(reg)
                })

                bid = bid && bid.id || null

                sql += " (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),"

                dygl = dygl.match(/\d+(?=W)/i), dygl = dygl && dygl[0] || null

                params.push(id, classify1, bid, title, orginal_price, pic, fsqt, xiaolv, leixing, jiekou, sata, dygl)
            }

            sql = sql.replace(/.$/, ";")

            await insertData(conn, sql, params)
        }
    } catch(err) {
        console.error('Gettin Song error: ' + err)
    } finally {
        conn && conn.release()
        console.log('done')
    }
}

//getPower()

async function getFan() {
    let fanList = await getListByPage(Fan),
        conn,
        MAXIUM = 5,
        template = `INSERT INTO Fan VALUES`

    try {
        conn = await Sql.getConn()
        for(let i = 0; i < fanList.length; i += MAXIUM) {
            let sql = template,
                params = []

            for(let j = 0; j < MAXIUM && i + j < fanList.length; j++) {
                let { id, classify1, orginal_price, title, pic, gonglv, son: { pinpai, dyjk, height, rgsl, chicun}} = fanList[i + j]

                let bid = BrandData[Fan.classify].find(item => {
                    let reg = new RegExp(item.name.trim(), "i")

                    return pinpai && pinpai.match(reg) || title.match(reg)
                })

                bid = bid && bid.id || null

                sql += " (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),"

                height = height.trim().match(/\d+(?=mm)/i), height = height && height[0] || null

                params.push(id, classify1, bid, title, orginal_price, gonglv, pic, dyjk, height, rgsl, chicun)
            }

            sql = sql.replace(/.$/, ";")

            await insertData(conn, sql, params)
        }
    } catch(err) {
        console.error('Gettin Song error: ' + err)
    } finally {
        conn && conn.release()
        console.log('done')
    }
}

//getFan()

async function getChassis() {
    let chassisList = await getListByPage(Chassis),
        conn,
        MAXIUM = 5,
        template = `INSERT INTO Chassis VALUES`

    try {
        conn = await Sql.getConn()
        for(let i = 0; i < chassisList.length; i += MAXIUM) {
            let sql = template,
                params = []

            for(let j = 0; j < MAXIUM && i + j < chassisList.length; j++) {
                let { id, classify1, orginal_price, title, pic, son: { pinpai, tixing, xianka, shuileng, cpu}} = chassisList[i + j]

                let bid = BrandData[Chassis.classify].find(item => {
                    let reg = new RegExp(item.name.trim(), "i")

                    return pinpai && pinpai.match(reg) || title.match(reg)
                })

                bid = bid && bid.id || null

                sql += " (?, ?, ?, ?, ?, ?, ?, ?, ?, ?),"
                
                xianka = xianka.trim().match(/\d+(?=cm)/i), xianka = xianka && xianka[0] || null

                cpu = cpu.trim().match(/\d+(?=mm)/i), cpu = cpu && cpu[0] || null

                params.push(id, classify1, bid, title, orginal_price, pic, tixing, xianka, shuileng, cpu)
            }

            sql = sql.replace(/.$/, ";")

            await insertData(conn, sql, params)
        }
    } catch(err) {
        console.error('Gettin Song error: ' + err)
    } finally {
        conn && conn.release()
        console.log('done')
    }
}

//getChassis()

async function test() {
    let data = {
        brand: 0,
        classify: 8,
        classify1: 0,
        // cpu_gongdian: "8",
        // cpu_jiekou: "LGA 1700",
        price1: 0,
        price2: 0,
        //sort: 1,
        limit: 20,
        page: 1,
    }
    let powerList = await getList(data)

    console.log(powerList)
}

//test()