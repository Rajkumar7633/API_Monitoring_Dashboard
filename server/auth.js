// Role-Based Access Control and User Management
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

// User roles and permissions
const ROLES = {
  ADMIN: 'admin',
  OPERATOR: 'operator', 
  VIEWER: 'viewer',
  DEVELOPER: 'developer'
}

const PERMISSIONS = {
  // Dashboard permissions
  DASHBOARD_VIEW: 'dashboard:view',
  DASHBOARD_EDIT: 'dashboard:edit',
  DASHBOARD_CREATE: 'dashboard:create',
  DASHBOARD_DELETE: 'dashboard:delete',
  
  // Alert permissions
  ALERTS_VIEW: 'alerts:view',
  ALERTS_ACKNOWLEDGE: 'alerts:acknowledge',
  ALERTS_RESOLVE: 'alerts:resolve',
  ALERTS_CONFIGURE: 'alerts:configure',
  
  // Service permissions
  SERVICES_VIEW: 'services:view',
  SERVICES_MANAGE: 'services:manage',
  
  // User management permissions
  USERS_VIEW: 'users:view',
  USERS_CREATE: 'users:create',
  USERS_EDIT: 'users:edit',
  USERS_DELETE: 'users:delete',
  
  // System permissions
  SYSTEM_CONFIGURE: 'system:configure',
  SYSTEM_VIEW: 'system:view',
  
  // API permissions
  API_KEYS_MANAGE: 'api_keys:manage',
  API_VIEW: 'api:view'
}

// Role permissions mapping
const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
  
  [ROLES.OPERATOR]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.DASHBOARD_EDIT,
    PERMISSIONS.ALERTS_VIEW,
    PERMISSIONS.ALERTS_ACKNOWLEDGE,
    PERMISSIONS.ALERTS_RESOLVE,
    PERMISSIONS.SERVICES_VIEW,
    PERMISSIONS.SERVICES_MANAGE,
    PERMISSIONS.SYSTEM_VIEW,
    PERMISSIONS.API_VIEW
  ],
  
  [ROLES.DEVELOPER]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.DASHBOARD_EDIT,
    PERMISSIONS.DASHBOARD_CREATE,
    PERMISSIONS.ALERTS_VIEW,
    PERMISSIONS.ALERTS_ACKNOWLEDGE,
    PERMISSIONS.SERVICES_VIEW,
    PERMISSIONS.API_VIEW,
    PERMISSIONS.API_KEYS_MANAGE
  ],
  
  [ROLES.VIEWER]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.ALERTS_VIEW,
    PERMISSIONS.SERVICES_VIEW,
    PERMISSIONS.SYSTEM_VIEW,
    PERMISSIONS.API_VIEW
  ]
}

class UserManagement {
  constructor() {
    this.usersPath = path.join(__dirname, 'data', 'users.json')
    this.sessionsPath = path.join(__dirname, 'data', 'sessions.json')
    this.ensureDataDirectories()
    this.loadUsers()
  }

  ensureDataDirectories() {
    const dataDir = path.join(__dirname, 'data')
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
  }

  loadUsers() {
    try {
      if (fs.existsSync(this.usersPath)) {
        const data = fs.readFileSync(this.usersPath, 'utf8')
        this.users = JSON.parse(data)
      } else {
        this.users = this.createDefaultUsers()
        this.saveUsers()
      }
    } catch (error) {
      console.error('Error loading users:', error)
      this.users = this.createDefaultUsers()
    }
  }

  saveUsers() {
    try {
      fs.writeFileSync(this.usersPath, JSON.stringify(this.users, null, 2))
    } catch (error) {
      console.error('Error saving users:', error)
    }
  }

  createDefaultUsers() {
    return {
      users: [
        {
          id: 'admin-001',
          username: 'admin',
          email: 'admin@dashboard.local',
          role: ROLES.ADMIN,
          fullName: 'System Administrator',
          isActive: true,
          createdAt: new Date().toISOString(),
          lastLogin: null,
          preferences: {
            language: 'en',
            theme: 'dark',
            notifications: true
          }
        },
        {
          id: 'op-001',
          username: 'operator',
          email: 'operator@dashboard.local',
          role: ROLES.OPERATOR,
          fullName: 'System Operator',
          isActive: true,
          createdAt: new Date().toISOString(),
          lastLogin: null,
          preferences: {
            language: 'en',
            theme: 'dark',
            notifications: true
          }
        },
        {
          id: 'dev-001',
          username: 'developer',
          email: 'dev@dashboard.local',
          role: ROLES.DEVELOPER,
          fullName: 'Developer',
          isActive: true,
          createdAt: new Date().toISOString(),
          lastLogin: null,
          preferences: {
            language: 'en',
            theme: 'dark',
            notifications: false
          }
        },
        {
          id: 'viewer-001',
          username: 'viewer',
          email: 'viewer@dashboard.local',
          role: ROLES.VIEWER,
          fullName: 'Viewer',
          isActive: true,
          createdAt: new Date().toISOString(),
          lastLogin: null,
          preferences: {
            language: 'en',
            theme: 'dark',
            notifications: false
          }
        }
      ]
    }
  }

  hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex')
  }

  verifyUser(username, password) {
    const user = this.users.users.find(u => u.username === username && u.isActive)
    if (!user) return null

    // For demo purposes, simple password verification
    // In production, use proper password hashing like bcrypt
    const hashedPassword = this.hashPassword(password)
    const expectedPasswords = {
      'admin': this.hashPassword('admin123'),
      'operator': this.hashPassword('operator123'),
      'developer': this.hashPassword('dev123'),
      'viewer': this.hashPassword('view123')
    }

    if (hashedPassword === expectedPasswords[username]) {
      // Update last login
      user.lastLogin = new Date().toISOString()
      this.saveUsers()
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        preferences: user.preferences
      }
    }

    return null
  }

  hasPermission(userRole, permission) {
    const rolePermissions = ROLE_PERMISSIONS[userRole] || []
    return rolePermissions.includes(permission)
  }

  getUsers() {
    return this.users.users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    }))
  }

  createUser(userData) {
    const newUser = {
      id: crypto.randomUUID(),
      username: userData.username,
      email: userData.email,
      role: userData.role,
      fullName: userData.fullName,
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLogin: null,
      preferences: userData.preferences || {
        language: 'en',
        theme: 'dark',
        notifications: true
      }
    }

    this.users.users.push(newUser)
    this.saveUsers()
    return newUser
  }

  updateUser(userId, updates) {
    const userIndex = this.users.users.findIndex(u => u.id === userId)
    if (userIndex === -1) return null

    this.users.users[userIndex] = { ...this.users.users[userIndex], ...updates }
    this.saveUsers()
    return this.users.users[userIndex]
  }

  deleteUser(userId) {
    const userIndex = this.users.users.findIndex(u => u.id === userId)
    if (userIndex === -1) return false

    this.users.users.splice(userIndex, 1)
    this.saveUsers()
    return true
  }

  // Session management
  createSession(user) {
    const sessionToken = crypto.randomUUID()
    const session = {
      token: sessionToken,
      userId: user.id,
      username: user.username,
      role: user.role,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    }

    this.saveSession(session)
    return sessionToken
  }

  saveSession(session) {
    try {
      let sessions = []
      if (fs.existsSync(this.sessionsPath)) {
        const data = fs.readFileSync(this.sessionsPath, 'utf8')
        sessions = JSON.parse(data)
      }

      // Remove expired sessions
      const now = new Date()
      sessions = sessions.filter(s => new Date(s.expiresAt) > now)

      // Add new session
      sessions.push(session)

      // Keep only last 100 sessions
      sessions = sessions.slice(-100)

      fs.writeFileSync(this.sessionsPath, JSON.stringify(sessions, null, 2))
    } catch (error) {
      console.error('Error saving session:', error)
    }
  }

  validateSession(token) {
    try {
      if (!fs.existsSync(this.sessionsPath)) return null

      const data = fs.readFileSync(this.sessionsPath, 'utf8')
      const sessions = JSON.parse(data)

      const session = sessions.find(s => s.token === token)
      if (!session) return null

      // Check if session is expired
      if (new Date(session.expiresAt) < new Date()) {
        return null
      }

      return session
    } catch (error) {
      console.error('Error validating session:', error)
      return null
    }
  }

  removeSession(token) {
    try {
      if (!fs.existsSync(this.sessionsPath)) return

      const data = fs.readFileSync(this.sessionsPath, 'utf8')
      const sessions = JSON.parse(data)

      const filteredSessions = sessions.filter(s => s.token !== token)
      fs.writeFileSync(this.sessionsPath, JSON.stringify(filteredSessions, null, 2))
    } catch (error) {
      console.error('Error removing session:', error)
    }
  }
}

// Authentication middleware
function createAuthMiddleware(userManagement) {
  return (req, res, next) => {
    // Skip authentication for health checks and login
    if (req.path === '/api/health' || req.path === '/api/auth/login') {
      return next()
    }

    const token = req.headers.authorization?.replace('Bearer ', '') || 
                  req.cookies?.sessionToken ||
                  req.query?.token

    if (!token) {
      return res.status(401).json({ error: 'No authentication token provided' })
    }

    const session = userManagement.validateSession(token)
    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    req.user = session
    next()
  }
}

// Permission check middleware
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    if (!userManagement.hasPermission(req.user.role, permission)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    next()
  }
}

// Initialize user management
const userManagement = new UserManagement()

module.exports = {
  userManagement,
  createAuthMiddleware,
  requirePermission,
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS
}
