const Koa = require('koa')
const cors = require('koa-cors')
const Logger = require('koa-logger')
const json = require('koa-json')
const app = new Koa()

const api = require('./app/api')

app.use(cors())

app.use(Logger())

app.use(json())

app.use(api.routes(), api.allowedMethods())

app.on('error', (err, ctx) => {
    console.error('server error', err, ctx)
})

app.listen(3001)