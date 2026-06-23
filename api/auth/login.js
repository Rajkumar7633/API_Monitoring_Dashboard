// Vercel serverless function for authentication
const { userManagement, createAuthMiddleware } = require('../../server/auth')

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password are required' 
      })
    }

    // Simple authentication (in production, use proper hashing)
    const user = userManagement.getUserByUsername(username)
    
    if (!user || user.password !== password) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      })
    }

    // Generate simple token (in production, use JWT)
    const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64')

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          permissions: user.permissions
        },
        token,
        expiresIn: 86400 // 24 hours
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    })
  }
}
