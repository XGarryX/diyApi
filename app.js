const Koa = require('koa')
const cors = require('koa-cors')
const Logger = require('koa-logger')
const json = require('koa-json')
const app = new Koa()

const optPool = require('./app/Clienter')
const api = require('./app/api')

const gracefulShutdown = async () => {
    console.log('Received shutdown signal, closing database connections...')
    
    try {
        // 优雅关闭连接池
        await optPool.end()
        console.log('Database connections closed gracefully')
        app.exit(0)
    } catch (error) {
        console.error('Error during shutdown:', error);
        app.exit(1)
    }
}


app.use(cors())

app.use(Logger())

app.use(json())

app.use(api.routes(), api.allowedMethods())

app.on('error', (err, ctx) => {
    console.error('server error', err, ctx)
})

app.listen(3001)

app.on('SIGINT', gracefulShutdown);   // Ctrl+C
app.on('SIGTERM', gracefulShutdown);  // kill命令
app.on('SIGUSR2', gracefulShutdown);