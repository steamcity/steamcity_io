const express = require('express')
const cors = require('cors')
const path = require('path')

const app = express()
const PORT = process.env.PORT || 8080

// Production security and performance middleware
if (process.env.NODE_ENV === 'production') {
    // Trust proxy for load balancer
    app.set('trust proxy', 1)

    // Security headers
    app.use((req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff')
        res.setHeader('X-Frame-Options', 'DENY')
        res.setHeader('X-XSS-Protection', '1; mode=block')
        next()
    })
}

// Middleware
app.use(
    cors({
        origin:
            process.env.NODE_ENV === 'production'
                ? ['https://*.ondigitalocean.app', 'https://steamcity.io']
                : true,
        credentials: true
    })
)
app.use(express.json({ limit: '10mb' }))
app.use(
    express.static('public', {
        maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0
    })
)

// Routes
app.use('/api/experiments', require('./routes/experiments'))
app.use('/api/sensors', require('./routes/sensors'))
app.use('/api/protocols', require('./routes/protocols'))
app.use('/api', require('./routes/clusterRoutes'))

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'SteamCity IoT Platform is running',
        version: '3.0.0',
        timestamp: new Date().toISOString()
    })
})

// Serve index.html for all other NON-API routes (SPA support)
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
        return next()
    }
    res.sendFile(path.join(__dirname, '../public/index.html'))
})

// Error handling middleware
app.use((err, req, res, _next) => {
    console.error(err.stack)
    res.status(500).json({
        success: false,
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    })
})

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Cannot ${req.method} ${req.path}`
    })
})

app.listen(PORT, () => {
    console.log(`🚀 SteamCity IoT Platform running on port ${PORT}`)
    console.log(`📊 Dashboard: http://localhost:${PORT}`)
    console.log(`🔧 Health check: http://localhost:${PORT}/api/health`)
    console.log(`🗺️  API Base: http://localhost:${PORT}/api`)
})

module.exports = app
