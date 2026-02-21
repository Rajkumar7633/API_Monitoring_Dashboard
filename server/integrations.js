// Integration Marketplace for Popular Indian Services
class IntegrationMarketplace {
  constructor() {
    this.integrations = new Map()
    this.userIntegrations = new Map() // userId -> installed integrations
    this.dataPath = require('path').join(__dirname, 'data', 'integrations')
    
    this.ensureDataDirectory()
    this.initializeIndianIntegrations()
    this.loadUserIntegrations()
  }

  ensureDataDirectory() {
    const fs = require('fs')
    if (!fs.existsSync(this.dataPath)) {
      fs.mkdirSync(this.dataPath, { recursive: true })
    }
  }

  initializeIndianIntegrations() {
    // Payment Gateways
    this.integrations.set('razorpay', {
      id: 'razorpay',
      name: 'Razorpay',
      category: 'payment',
      description: 'Indian payment gateway for UPI, cards, wallets',
      icon: '💳',
      website: 'https://razorpay.com',
      region: 'India',
      features: ['UPI', 'Credit/Debit Cards', 'Net Banking', 'Wallets'],
      pricing: '2.5% per transaction',
      setup: {
        type: 'api-keys',
        fields: [
          { name: 'key_id', label: 'Key ID', type: 'text', required: true },
          { name: 'key_secret', label: 'Key Secret', type: 'password', required: true }
        ]
      },
      endpoints: {
        payments: '/api/razorpay/payments',
        refunds: '/api/razorpay/refunds',
        webhooks: '/api/razorpay/webhooks'
      },
      metrics: ['transaction_volume', 'success_rate', 'payment_methods', 'refund_rate']
    })

    this.integrations.set('paytm', {
      id: 'paytm',
      name: 'Paytm',
      category: 'payment',
      description: 'Paytm payment gateway with UPI and wallet support',
      icon: '📱',
      website: 'https://paytm.com',
      region: 'India',
      features: ['Paytm Wallet', 'UPI', 'Credit/Debit Cards', 'Net Banking'],
      pricing: '2.0% - 2.5% per transaction',
      setup: {
        type: 'api-keys',
        fields: [
          { name: 'merchant_id', label: 'Merchant ID', type: 'text', required: true },
          { name: 'merchant_key', label: 'Merchant Key', type: 'password', required: true }
        ]
      },
      endpoints: {
        transactions: '/api/paytm/transactions',
        refunds: '/api/paytm/refunds',
        status: '/api/paytm/status'
      },
      metrics: ['transaction_count', 'success_rate', 'average_amount', 'failure_reasons']
    })

    // Communication Services
    this.integrations.set('twilio-india', {
      id: 'twilio-india',
      name: 'Twilio India',
      category: 'communication',
      description: 'SMS and WhatsApp services for Indian numbers',
      icon: '💬',
      website: 'https://twilio.com',
      region: 'India',
      features: ['SMS', 'WhatsApp', 'Voice Calls', 'Email'],
      pricing: 'SMS: ₹0.60 per message, WhatsApp: ₹0.35 per message',
      setup: {
        type: 'api-keys',
        fields: [
          { name: 'account_sid', label: 'Account SID', type: 'text', required: true },
          { name: 'auth_token', label: 'Auth Token', type: 'password', required: true }
        ]
      },
      endpoints: {
        sms: '/api/twilio/sms',
        whatsapp: '/api/twilio/whatsapp',
        calls: '/api/twilio/calls'
      },
      metrics: ['message_volume', 'delivery_rate', 'cost_per_message', 'response_time']
    })

    this.integrations.set('gupshup', {
      id: 'gupshup',
      name: 'Gupshup',
      category: 'communication',
      description: 'Indian messaging platform for SMS and WhatsApp',
      icon: '📨',
      website: 'https://gupshup.io',
      region: 'India',
      features: ['SMS', 'WhatsApp Business API', 'RCS', 'Voice'],
      pricing: 'SMS: ₹0.45 per message, WhatsApp: ₹0.30 per message',
      setup: {
        type: 'api-keys',
        fields: [
          { name: 'app_name', label: 'App Name', type: 'text', required: true },
          { name: 'api_key', label: 'API Key', type: 'password', required: true }
        ]
      },
      endpoints: {
        sms: '/api/gupshup/sms',
        whatsapp: '/api/gupshup/whatsapp',
        rcs: '/api/gupshup/rcs'
      },
      metrics: ['message_sent', 'delivery_rate', 'read_rate', 'engagement_rate']
    })

    // Cloud Services
    this.integrations.set('aws-india', {
      id: 'aws-india',
      name: 'AWS India',
      category: 'cloud',
      description: 'Amazon Web Services India region monitoring',
      icon: '☁️',
      website: 'https://aws.amazon.com',
      region: 'India',
      features: ['EC2', 'S3', 'RDS', 'Lambda', 'CloudWatch'],
      pricing: 'Pay-as-you-go',
      setup: {
        type: 'credentials',
        fields: [
          { name: 'access_key_id', label: 'Access Key ID', type: 'text', required: true },
          { name: 'secret_access_key', label: 'Secret Access Key', type: 'password', required: true },
          { name: 'region', label: 'Region', type: 'select', options: ['ap-south-1', 'ap-southeast-1'], required: true }
        ]
      },
      endpoints: {
        cloudwatch: '/api/aws/cloudwatch',
        ec2: '/api/aws/ec2',
        s3: '/api/aws/s3'
      },
      metrics: ['cpu_utilization', 'memory_usage', 'network_in', 'network_out', 'error_rate']
    })

    // Analytics Services
    this.integrations.set('google-analytics-india', {
      id: 'google-analytics-india',
      name: 'Google Analytics 4',
      category: 'analytics',
      description: 'Web analytics with Indian audience insights',
      icon: '📊',
      website: 'https://analytics.google.com',
      region: 'Global',
      features: ['Real-time Analytics', 'Audience Demographics', 'Conversion Tracking', 'Custom Events'],
      pricing: 'Free',
      setup: {
        type: 'credentials',
        fields: [
          { name: 'measurement_id', label: 'Measurement ID', type: 'text', required: true },
          { name: 'api_secret', label: 'API Secret', type: 'password', required: true }
        ]
      },
      endpoints: {
        events: '/api/ga4/events',
        reports: '/api/ga4/reports',
        realtime: '/api/ga4/realtime'
      },
      metrics: ['page_views', 'unique_visitors', 'bounce_rate', 'session_duration', 'conversion_rate']
    })

    // Indian Government Services
    this.integrations.set('aadhaar-auth', {
      id: 'aadhaar-auth',
      name: 'Aadhaar Authentication',
      category: 'government',
      description: 'UIDAI Aadhaar authentication service',
      icon: '🇮🇳',
      website: 'https://uidai.gov.in',
      region: 'India',
      features: ['Aadhaar Authentication', 'e-KYC', 'Digital Signatures'],
      pricing: '₹20 per authentication',
      setup: {
        type: 'credentials',
        fields: [
          { name: 'agency_code', label: 'Agency Code', type: 'text', required: true },
          { name: 'auth_key', label: 'Authentication Key', type: 'password', required: true }
        ]
      },
      endpoints: {
        auth: '/api/aadhaar/auth',
        ekyc: '/api/aadhaar/ekyc',
        otp: '/api/aadhaar/otp'
      },
      metrics: ['authentication_attempts', 'success_rate', 'failure_reasons', 'response_time']
    })

    // E-commerce Platforms
    this.integrations.set('shopify-india', {
      id: 'shopify-india',
      name: 'Shopify India',
      category: 'ecommerce',
      description: 'E-commerce platform with Indian payment methods',
      icon: '🛒',
      website: 'https://shopify.in',
      region: 'India',
      features: ['Online Store', 'Payment Gateway', 'Shipping', 'Inventory Management'],
      pricing: 'Starting from ₹1,999/month',
      setup: {
        type: 'api-keys',
        fields: [
          { name: 'shop_domain', label: 'Shop Domain', type: 'text', required: true },
          { name: 'access_token', label: 'Access Token', type: 'password', required: true }
        ]
      },
      endpoints: {
        orders: '/api/shopify/orders',
        products: '/api/shopify/products',
        customers: '/api/shopify/customers'
      },
      metrics: ['order_volume', 'revenue', 'conversion_rate', 'cart_abandonment', 'average_order_value']
    })

    // Logistics Services
    this.integrations.set('delhivery', {
      id: 'delhivery',
      name: 'Delhivery',
      category: 'logistics',
      description: 'Indian logistics and delivery service',
      icon: '🚚',
      website: 'https://delhivery.com',
      region: 'India',
      features: ['Express Delivery', 'Warehousing', 'Reverse Logistics', 'COD'],
      pricing: 'Varies by service and distance',
      setup: {
        type: 'api-keys',
        fields: [
          { name: 'api_key', label: 'API Key', type: 'password', required: true },
          { name: 'warehouse_code', label: 'Warehouse Code', type: 'text', required: true }
        ]
      },
      endpoints: {
        orders: '/api/delhivery/orders',
        tracking: '/api/delhivery/tracking',
        ndr: '/api/delhivery/ndr'
      },
      metrics: ['orders_shipped', 'delivery_time', 'delivery_success_rate', 'ndr_rate', 'cost_per_shipment']
    })

    // Banking APIs
    this.integrations.set('yes-bank-api', {
      id: 'yes-bank-api',
      name: 'YES Bank API',
      category: 'banking',
      description: 'YES Bank banking and payment APIs',
      icon: '🏦',
      website: 'https://yesbank.in',
      region: 'India',
      features: ['Account Verification', 'Fund Transfer', 'Balance Inquiry', 'Transaction History'],
      pricing: 'Per API call charges',
      setup: {
        type: 'credentials',
        fields: [
          { name: 'client_id', label: 'Client ID', type: 'text', required: true },
          { name: 'client_secret', label: 'Client Secret', type: 'password', required: true }
        ]
      },
      endpoints: {
        accounts: '/api/yesbank/accounts',
        transfers: '/api/yesbank/transfers',
        balance: '/api/yesbank/balance'
      },
      metrics: ['api_calls', 'success_rate', 'response_time', 'error_rate', 'transaction_volume']
    })
  }

  loadUserIntegrations() {
    try {
      const fs = require('fs')
      const userIntegrationsPath = require('path').join(this.dataPath, 'user-integrations.json')
      if (fs.existsSync(userIntegrationsPath)) {
        const data = fs.readFileSync(userIntegrationsPath, 'utf8')
        const userIntegrations = JSON.parse(data)
        Object.entries(userIntegrations).forEach(([userId, integrations]) => {
          this.userIntegrations.set(userId, integrations)
        })
      }
    } catch (error) {
      console.error('Error loading user integrations:', error)
    }
  }

  saveUserIntegrations() {
    try {
      const fs = require('fs')
      const userIntegrationsPath = require('path').join(this.dataPath, 'user-integrations.json')
      const userIntegrations = Object.fromEntries(this.userIntegrations)
      fs.writeFileSync(userIntegrationsPath, JSON.stringify(userIntegrations, null, 2))
    } catch (error) {
      console.error('Error saving user integrations:', error)
    }
  }

  // Get all available integrations
  getAvailableIntegrations(filters = {}) {
    let integrations = Array.from(this.integrations.values())

    // Apply filters
    if (filters.category) {
      integrations = integrations.filter(integration => integration.category === filters.category)
    }
    if (filters.region) {
      integrations = integrations.filter(integration => integration.region === filters.region)
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      integrations = integrations.filter(integration => 
        integration.name.toLowerCase().includes(searchLower) ||
        integration.description.toLowerCase().includes(searchLower)
      )
    }

    return integrations
  }

  // Get integration by ID
  getIntegration(integrationId) {
    return this.integrations.get(integrationId)
  }

  // Install integration for user
  installIntegration(userId, integrationId, config) {
    const integration = this.integrations.get(integrationId)
    if (!integration) {
      throw new Error('Integration not found')
    }

    // Validate configuration
    this.validateConfig(integration, config)

    const userIntegration = {
      id: crypto.randomUUID(),
      integrationId,
      userId,
      config,
      status: 'active',
      installedAt: new Date().toISOString(),
      lastSync: null,
      metrics: {}
    }

    if (!this.userIntegrations.has(userId)) {
      this.userIntegrations.set(userId, [])
    }

    this.userIntegrations.get(userId).push(userIntegration)
    this.saveUserIntegrations()

    return userIntegration
  }

  // Update user integration
  updateIntegration(userId, userIntegrationId, updates) {
    const userIntegrations = this.userIntegrations.get(userId) || []
    const integrationIndex = userIntegrations.findIndex(ui => ui.id === userIntegrationId)
    
    if (integrationIndex === -1) {
      throw new Error('User integration not found')
    }

    const integration = this.integrations.get(userIntegrations[integrationIndex].integrationId)
    if (updates.config) {
      this.validateConfig(integration, updates.config)
    }

    Object.assign(userIntegrations[integrationIndex], updates, {
      updatedAt: new Date().toISOString()
    })

    this.userIntegrations.set(userId, userIntegrations)
    this.saveUserIntegrations()

    return userIntegrations[integrationIndex]
  }

  // Uninstall integration
  uninstallIntegration(userId, userIntegrationId) {
    const userIntegrations = this.userIntegrations.get(userId) || []
    const integrationIndex = userIntegrations.findIndex(ui => ui.id === userIntegrationId)
    
    if (integrationIndex === -1) {
      throw new Error('User integration not found')
    }

    const removed = userIntegrations.splice(integrationIndex, 1)[0]
    this.userIntegrations.set(userId, userIntegrations)
    this.saveUserIntegrations()

    return removed
  }

  // Get user integrations
  getUserIntegrations(userId) {
    return this.userIntegrations.get(userId) || []
  }

  // Get integration metrics
  getIntegrationMetrics(userId, userIntegrationId) {
    const userIntegrations = this.userIntegrations.get(userId) || []
    const userIntegration = userIntegrations.find(ui => ui.id === userIntegrationId)
    
    if (!userIntegration) {
      throw new Error('User integration not found')
    }

    const integration = this.integrations.get(userIntegration.integrationId)
    
    // Simulate metrics - in real implementation, would fetch from integration APIs
    const mockMetrics = {}
    integration.metrics.forEach(metric => {
      mockMetrics[metric] = this.generateMockMetric(metric)
    })

    return {
      integrationId: userIntegration.id,
      integrationName: integration.name,
      lastSync: userIntegration.lastSync,
      metrics: mockMetrics,
      status: userIntegration.status
    }
  }

  // Test integration connection
  async testIntegration(integrationId, config) {
    const integration = this.integrations.get(integrationId)
    if (!integration) {
      throw new Error('Integration not found')
    }

    // Validate configuration
    this.validateConfig(integration, config)

    // Simulate connection test
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          message: 'Connection successful',
          latency: Math.floor(Math.random() * 200) + 50
        })
      }, 1000)
    })
  }

  // Validate integration configuration
  validateConfig(integration, config) {
    if (!integration.setup || !integration.setup.fields) {
      return
    }

    integration.setup.fields.forEach(field => {
      if (field.required && !config[field.name]) {
        throw new Error(`${field.label} is required`)
      }
    })
  }

  // Generate mock metrics for demonstration
  generateMockMetric(metric) {
    const baseValues = {
      transaction_volume: Math.floor(Math.random() * 10000) + 1000,
      success_rate: Math.random() * 10 + 90, // 90-100%
      payment_methods: {
        upi: Math.floor(Math.random() * 60) + 20,
        cards: Math.floor(Math.random() * 30) + 10,
        wallets: Math.floor(Math.random() * 20) + 5
      },
      message_volume: Math.floor(Math.random() * 5000) + 500,
      delivery_rate: Math.random() * 5 + 95, // 95-100%
      cpu_utilization: Math.random() * 40 + 20, // 20-60%
      memory_usage: Math.random() * 30 + 40, // 40-70%
      page_views: Math.floor(Math.random() * 50000) + 10000,
      unique_visitors: Math.floor(Math.random() * 10000) + 2000,
      orders_shipped: Math.floor(Math.random() * 1000) + 100,
      delivery_time: Math.floor(Math.random() * 3) + 1, // 1-4 days
      api_calls: Math.floor(Math.random() * 100000) + 10000
    }

    return baseValues[metric] || Math.floor(Math.random() * 1000)
  }

  // Get integration categories
  getCategories() {
    const categories = {}
    this.integrations.forEach(integration => {
      if (!categories[integration.category]) {
        categories[integration.category] = {
          name: integration.category,
          count: 0,
          integrations: []
        }
      }
      categories[integration.category].count++
      categories[integration.category].integrations.push({
        id: integration.id,
        name: integration.name,
        icon: integration.icon
      })
    })
    return categories
  }

  // Get popular integrations
  getPopularIntegrations(limit = 10) {
    return Array.from(this.integrations.values())
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, limit)
  }

  // Search integrations
  searchIntegrations(query, filters = {}) {
    const allIntegrations = this.getAvailableIntegrations(filters)
    const searchLower = query.toLowerCase()
    
    return allIntegrations.filter(integration => 
      integration.name.toLowerCase().includes(searchLower) ||
      integration.description.toLowerCase().includes(searchLower) ||
      integration.features.some(feature => feature.toLowerCase().includes(searchLower))
    )
  }
}

module.exports = { IntegrationMarketplace }
