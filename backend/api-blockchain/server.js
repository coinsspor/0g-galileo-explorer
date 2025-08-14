// server.js
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Import configurations and utilities
const { CONFIG, validateConfig } = require('./config/config');
const logger = require('./utils/logger');
const corsMiddleware = require('./middleware/cors');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Import services
const blockchainService = require('./services/blockchainService');
const validatorService = require('./services/validatorService');
const cacheService = require('./services/cacheService');

// Import routes
const blockchainRoutes = require('./routes/blockchain');
const validatorRoutes = require('./routes/validators');
const stakingRoutes = require('./routes/staking');
const governanceRoutes = require('./routes/governance');
const uptimeRoutes = require('./routes/uptime');
const walletRoutes = require('./routes/wallet');

class API2Server {
    constructor() {
        this.app = express();
        this.isShuttingDown = false;
    }

    // Initialize the server
    async initialize() {
        try {
            // Validate configuration
            validateConfig();
            logger.api('Configuration validated successfully');

            // Setup middleware
            this.setupMiddleware();

            // Setup routes
            this.setupRoutes();

            // Setup error handling
            this.setupErrorHandling();

            // Initialize services
            await this.initializeServices();

            logger.api('Server initialization completed');
        } catch (error) {
            logger.error('Server initialization failed', { error: error.message });
            throw error;
        }
    }

    // Setup middleware
    setupMiddleware() {
        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: false,
            crossOriginEmbedderPolicy: false
        }));

        // Compression middleware
        this.app.use(compression());

        // setupMiddleware fonksiyonuna ekle (di�er middleware'lerden sonra)
        this.app.use(express.static('public'))
        
        
        // CORS middleware
        this.app.use(corsMiddleware);

        // Rate limiting
        const limiter = rateLimit({
            windowMs: CONFIG.RATE_LIMIT.WINDOW_MS,
            max: CONFIG.RATE_LIMIT.MAX_REQUESTS,
            message: {
                success: false,
                message: 'Too many requests, please try again later',
                retryAfter: CONFIG.RATE_LIMIT.WINDOW_MS / 1000
            },
            standardHeaders: true,
            legacyHeaders: false
        });
        this.app.use('/api/', limiter);

        // Body parsing middleware
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Request logging middleware
        this.app.use((req, res, next) => {
            const start = Date.now();
            
            res.on('finish', () => {
                const duration = Date.now() - start;
                logger.api('Request processed', {
                    method: req.method,
                    url: req.originalUrl,
                    status: res.statusCode,
                    duration: `${duration}ms`,
                    ip: req.ip,
                    userAgent: req.get('User-Agent')
                });
            });
            
            next();
        });

        logger.api('Middleware setup completed');
    }

    // Setup routes
    setupRoutes() {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({
                success: true,
                message: 'API2 is healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                version: require('./package.json').version,
                features: CONFIG.FEATURES
            });
        });

        // API status endpoint
        this.app.get('/api/status', async (req, res) => {
            try {
                const cacheStats = cacheService.getStats();
                const health = await require('./services/rpcService').healthCheck();
                
                res.json({
                    success: true,
                    api: 'API2 - Advanced 0G Explorer',
                    version: '2.0.0',
                    status: 'operational',
                    timestamp: new Date().toISOString(),
                    cache: cacheStats,
                    rpc: health,
                    endpoints: {
                        blockchain: '/api/v2/blockchain',
                        validators: '/api/v2/validators',
                        staking: '/api/v2/staking',
                        governance: '/api/v2/governance',
                        uptime: '/api/v2/uptime',
                        wallet: '/api/v2/wallet'
                    }
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    message: 'Service status check failed',
                    error: error.message
                });
            }
        });

        // API v2 routes
        this.app.use('/api/v2/blockchain', blockchainRoutes);
        this.app.use('/api/v2/validators', validatorRoutes);
        this.app.use('/api/v2/staking', stakingRoutes);
        this.app.use('/api/v2/governance', governanceRoutes);
        this.app.use('/api/v2/uptime', uptimeRoutes);
        this.app.use('/api/v2/wallet', walletRoutes);

        // Root endpoint
        this.app.get('/', (req, res) => {
            res.json({
                name: '0G Explorer API v2',
                description: 'Advanced blockchain explorer API with comprehensive features',
                version: '2.0.0',
                documentation: '/api/docs',
                status: '/api/status',
                health: '/health',
                features: Object.keys(CONFIG.FEATURES).filter(key => CONFIG.FEATURES[key])
            });
        });

        logger.api('Routes setup completed');
    }

    // Setup error handling
    setupErrorHandling() {
        // 404 handler
        this.app.use(notFoundHandler);

        // Global error handler
        this.app.use(errorHandler);

        // Graceful shutdown handlers
        process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));

        // Unhandled promise rejection
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Promise Rejection', { reason, promise });
        });

        // Uncaught exception
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
            this.gracefulShutdown('UNCAUGHT_EXCEPTION');
        });

        logger.api('Error handling setup completed');
    }

    // Initialize services
    async initializeServices() {
        try {
            logger.api('Initializing services...');

            // Initialize blockchain service
            await blockchainService.initialize();
            logger.api('Blockchain service initialized');

            // Warm up cache with essential data
            await cacheService.warmCache();
            logger.api('Cache warmed up');

            logger.api('All services initialized successfully');
        } catch (error) {
            logger.error('Service initialization failed', { error: error.message });
            throw error;
        }
    }

    // Start the server
    async start() {
        try {
            await this.initialize();

            const server = this.app.listen(CONFIG.PORT, '0.0.0.0', () => {
                logger.api(`🚀 API2 Server started on port ${CONFIG.PORT}`);
                logger.api(`📊 Environment: ${CONFIG.NODE_ENV}`);
                logger.api(`🔗 Chain: ${CONFIG.CHAIN_NAME} (${CONFIG.CHAIN_ID})`);
                logger.api(`💾 Cache TTL: Blocks ${CONFIG.CACHE_TTL.BLOCKS}s, Validators ${CONFIG.CACHE_TTL.VALIDATORS}s`);
                logger.api(`🛡️ Security: Rate limit ${CONFIG.RATE_LIMIT.MAX_REQUESTS} req/${CONFIG.RATE_LIMIT.WINDOW_MS/60000}min`);
                logger.api(`📋 Test endpoints:`);
                logger.api(`   • Health: http://localhost:${CONFIG.PORT}/health`);
                logger.api(`   • Status: http://localhost:${CONFIG.PORT}/api/status`);
                logger.api(`   • Blockchain: http://localhost:${CONFIG.PORT}/api/v2/blockchain/stats`);
                logger.api(`   • Validators: http://localhost:${CONFIG.PORT}/api/v2/validators`);
            });

            this.server = server;
            return server;

        } catch (error) {
            logger.error('Failed to start server', { error: error.message });
            process.exit(1);
        }
    }

    // Graceful shutdown
    async gracefulShutdown(signal) {
        if (this.isShuttingDown) return;
        this.isShuttingDown = true;

        logger.api(`Received ${signal}, starting graceful shutdown...`);

        if (this.server) {
            this.server.close(() => {
                logger.api('HTTP server closed');
                process.exit(0);
            });

            // Force close after timeout
            setTimeout(() => {
                logger.error('Forced shutdown after timeout');
                process.exit(1);
            }, 30000);
        } else {
            process.exit(0);
        }
    }
}

// Create and start server
const api2Server = new API2Server();

if (require.main === module) {
    api2Server.start().catch(error => {
        logger.error('Failed to start API2 server', { error: error.message });
        process.exit(1);
    });
}

module.exports = api2Server;
