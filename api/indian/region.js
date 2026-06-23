// Vercel serverless function for Indian region detection
const { IndianFeatures } = require('../../server/indian-features')

let indianFeatures

function initializeIndianFeatures() {
  if (!indianFeatures) {
    indianFeatures = new IndianFeatures()
  }
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    initializeIndianFeatures()
    
    const { ip } = req.query
    
    if (!ip) {
      return res.status(400).json({ error: 'IP address is required' })
    }

    const regionData = indianFeatures.detectIndianRegion(ip)
    
    res.status(200).json({
      success: true,
      data: regionData,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Region detection error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    })
  }
}
