// Real-time Collaboration Features
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

class CollaborationManager {
  constructor() {
    this.sharedDashboards = new Map() // dashboardId -> dashboard data
    this.activeUsers = new Map() // userId -> user session
    this.comments = new Map() // dashboardId -> comments
    this.activities = new Map() // dashboardId -> activity log
    this.subscriptions = new Map() // userId -> subscribed dashboards
    
    this.dataPath = path.join(__dirname, 'data', 'collaboration')
    this.ensureDataDirectory()
    this.loadData()
  }

  ensureDataDirectory() {
    if (!fs.existsSync(this.dataPath)) {
      fs.mkdirSync(this.dataPath, { recursive: true })
    }
  }

  loadData() {
    try {
      // Load shared dashboards
      const dashboardsPath = path.join(this.dataPath, 'dashboards.json')
      if (fs.existsSync(dashboardsPath)) {
        const data = fs.readFileSync(dashboardsPath, 'utf8')
        const dashboards = JSON.parse(data)
        dashboards.forEach(dashboard => {
          this.sharedDashboards.set(dashboard.id, dashboard)
        })
      }

      // Load comments
      const commentsPath = path.join(this.dataPath, 'comments.json')
      if (fs.existsSync(commentsPath)) {
        const data = fs.readFileSync(commentsPath, 'utf8')
        const comments = JSON.parse(data)
        Object.entries(comments).forEach(([dashboardId, dashboardComments]) => {
          this.comments.set(dashboardId, dashboardComments)
        })
      }

      // Load activities
      const activitiesPath = path.join(this.dataPath, 'activities.json')
      if (fs.existsSync(activitiesPath)) {
        const data = fs.readFileSync(activitiesPath, 'utf8')
        const activities = JSON.parse(data)
        Object.entries(activities).forEach(([dashboardId, dashboardActivities]) => {
          this.activities.set(dashboardId, dashboardActivities)
        })
      }
    } catch (error) {
      console.error('Error loading collaboration data:', error)
    }
  }

  saveData() {
    try {
      // Save shared dashboards
      const dashboardsPath = path.join(this.dataPath, 'dashboards.json')
      const dashboards = Array.from(this.sharedDashboards.values())
      fs.writeFileSync(dashboardsPath, JSON.stringify(dashboards, null, 2))

      // Save comments
      const commentsPath = path.join(this.dataPath, 'comments.json')
      const comments = Object.fromEntries(this.comments)
      fs.writeFileSync(commentsPath, JSON.stringify(comments, null, 2))

      // Save activities
      const activitiesPath = path.join(this.dataPath, 'activities.json')
      const activities = Object.fromEntries(this.activities)
      fs.writeFileSync(activitiesPath, JSON.stringify(activities, null, 2))
    } catch (error) {
      console.error('Error saving collaboration data:', error)
    }
  }

  // Create shared dashboard
  createSharedDashboard(ownerId, dashboardData) {
    const dashboard = {
      id: crypto.randomUUID(),
      name: dashboardData.name,
      description: dashboardData.description,
      ownerId,
      widgets: dashboardData.widgets || [],
      layout: dashboardData.layout || 'grid',
      isPublic: dashboardData.isPublic || false,
      collaborators: dashboardData.collaborators || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      tags: dashboardData.tags || []
    }

    this.sharedDashboards.set(dashboard.id, dashboard)
    this.activities.set(dashboard.id, [])
    this.comments.set(dashboard.id, [])
    
    this.logActivity(dashboard.id, ownerId, 'dashboard_created', { dashboardName: dashboard.name })
    this.saveData()

    return dashboard
  }

  // Update shared dashboard
  updateSharedDashboard(dashboardId, userId, updates) {
    const dashboard = this.sharedDashboards.get(dashboardId)
    if (!dashboard) {
      throw new Error('Dashboard not found')
    }

    // Check permissions
    if (!this.canEditDashboard(dashboard, userId)) {
      throw new Error('Insufficient permissions')
    }

    // Update dashboard
    const previousVersion = dashboard.version
    Object.assign(dashboard, updates, {
      updatedAt: new Date().toISOString(),
      version: previousVersion + 1
    })

    this.sharedDashboards.set(dashboardId, dashboard)
    this.logActivity(dashboardId, userId, 'dashboard_updated', { 
      version: dashboard.version,
      changes: Object.keys(updates)
    })
    this.saveData()

    return dashboard
  }

  // Add collaborator
  addCollaborator(dashboardId, ownerId, collaboratorEmail, role = 'viewer') {
    const dashboard = this.sharedDashboards.get(dashboardId)
    if (!dashboard) {
      throw new Error('Dashboard not found')
    }

    if (dashboard.ownerId !== ownerId) {
      throw new Error('Only owner can add collaborators')
    }

    const collaborator = {
      id: crypto.randomUUID(),
      email: collaboratorEmail,
      role, // 'owner', 'editor', 'viewer'
      addedAt: new Date().toISOString(),
      addedBy: ownerId
    }

    if (!dashboard.collaborators) {
      dashboard.collaborators = []
    }

    dashboard.collaborators.push(collaborator)
    dashboard.updatedAt = new Date().toISOString()

    this.sharedDashboards.set(dashboardId, dashboard)
    this.logActivity(dashboardId, ownerId, 'collaborator_added', { 
      email: collaboratorEmail,
      role
    })
    this.saveData()

    return collaborator
  }

  // Remove collaborator
  removeCollaborator(dashboardId, ownerId, collaboratorId) {
    const dashboard = this.sharedDashboards.get(dashboardId)
    if (!dashboard) {
      throw new Error('Dashboard not found')
    }

    if (dashboard.ownerId !== ownerId) {
      throw new Error('Only owner can remove collaborators')
    }

    const collaboratorIndex = dashboard.collaborators.findIndex(c => c.id === collaboratorId)
    if (collaboratorIndex === -1) {
      throw new Error('Collaborator not found')
    }

    const removedCollaborator = dashboard.collaborators.splice(collaboratorIndex, 1)[0]
    dashboard.updatedAt = new Date().toISOString()

    this.sharedDashboards.set(dashboardId, dashboard)
    this.logActivity(dashboardId, ownerId, 'collaborator_removed', { 
      email: removedCollaborator.email
    })
    this.saveData()

    return removedCollaborator
  }

  // Get shared dashboards for user
  getUserDashboards(userId) {
    const userDashboards = []

    this.sharedDashboards.forEach(dashboard => {
      if (dashboard.ownerId === userId || 
          dashboard.isPublic ||
          dashboard.collaborators.some(c => c.email === userId)) {
        userDashboards.push(dashboard)
      }
    })

    return userDashboards
  }

  // Check if user can view dashboard
  canViewDashboard(dashboard, userId) {
    return dashboard.ownerId === userId || 
           dashboard.isPublic ||
           dashboard.collaborators.some(c => c.email === userId)
  }

  // Check if user can edit dashboard
  canEditDashboard(dashboard, userId) {
    return dashboard.ownerId === userId || 
           dashboard.collaborators.some(c => 
             c.email === userId && (c.role === 'editor' || c.role === 'owner')
           )
  }

  // Add comment
  addComment(dashboardId, userId, content, position = null) {
    const comment = {
      id: crypto.randomUUID(),
      userId,
      content,
      position, // { widgetId, x, y } for positional comments
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      replies: [],
      resolved: false,
      resolvedBy: null,
      resolvedAt: null
    }

    if (!this.comments.has(dashboardId)) {
      this.comments.set(dashboardId, [])
    }

    const dashboardComments = this.comments.get(dashboardId)
    dashboardComments.push(comment)

    this.logActivity(dashboardId, userId, 'comment_added', { 
      commentId: comment.id,
      hasPosition: !!position
    })
    this.saveData()

    return comment
  }

  // Reply to comment
  replyToComment(dashboardId, commentId, userId, content) {
    const dashboardComments = this.comments.get(dashboardId)
    if (!dashboardComments) {
      throw new Error('Dashboard comments not found')
    }

    const comment = dashboardComments.find(c => c.id === commentId)
    if (!comment) {
      throw new Error('Comment not found')
    }

    const reply = {
      id: crypto.randomUUID(),
      userId,
      content,
      createdAt: new Date().toISOString()
    }

    comment.replies.push(reply)
    comment.updatedAt = new Date().toISOString()

    this.logActivity(dashboardId, userId, 'comment_replied', { 
      commentId,
      replyId: reply.id
    })
    this.saveData()

    return reply
  }

  // Resolve comment
  resolveComment(dashboardId, commentId, userId) {
    const dashboardComments = this.comments.get(dashboardId)
    if (!dashboardComments) {
      throw new Error('Dashboard comments not found')
    }

    const comment = dashboardComments.find(c => c.id === commentId)
    if (!comment) {
      throw new Error('Comment not found')
    }

    comment.resolved = true
    comment.resolvedBy = userId
    comment.resolvedAt = new Date().toISOString()
    comment.updatedAt = new Date().toISOString()

    this.logActivity(dashboardId, userId, 'comment_resolved', { 
      commentId
    })
    this.saveData()

    return comment
  }

  // Get comments for dashboard
  getDashboardComments(dashboardId) {
    return this.comments.get(dashboardId) || []
  }

  // Log activity
  logActivity(dashboardId, userId, action, metadata = {}) {
    if (!this.activities.has(dashboardId)) {
      this.activities.set(dashboardId, [])
    }

    const activity = {
      id: crypto.randomUUID(),
      userId,
      action,
      metadata,
      timestamp: new Date().toISOString()
    }

    const dashboardActivities = this.activities.get(dashboardId)
    dashboardActivities.unshift(activity)

    // Keep only last 100 activities
    if (dashboardActivities.length > 100) {
      dashboardActivities.splice(100)
    }

    // Notify subscribers
    this.notifySubscribers(dashboardId, activity)
  }

  // Get activity log
  getDashboardActivities(dashboardId, limit = 50) {
    const activities = this.activities.get(dashboardId) || []
    return activities.slice(0, limit)
  }

  // Subscribe to dashboard updates
  subscribeToDashboard(userId, dashboardId) {
    if (!this.subscriptions.has(userId)) {
      this.subscriptions.set(userId, new Set())
    }

    this.subscriptions.get(userId).add(dashboardId)
  }

  // Unsubscribe from dashboard updates
  unsubscribeFromDashboard(userId, dashboardId) {
    if (this.subscriptions.has(userId)) {
      this.subscriptions.get(userId).delete(dashboardId)
    }
  }

  // Notify subscribers (would integrate with WebSocket in real implementation)
  notifySubscribers(dashboardId, activity) {
    this.subscriptions.forEach((dashboards, userId) => {
      if (dashboards.has(dashboardId)) {
        // In real implementation, send WebSocket message to user
        console.log(`Notifying user ${userId} of activity on dashboard ${dashboardId}:`, activity)
      }
    })
  }

  // Get dashboard statistics
  getDashboardStats(dashboardId) {
    const dashboard = this.sharedDashboards.get(dashboardId)
    if (!dashboard) {
      return null
    }

    const comments = this.getDashboardComments(dashboardId)
    const activities = this.getDashboardActivities(dashboardId)

    return {
      id: dashboardId,
      name: dashboard.name,
      collaborators: dashboard.collaborators.length,
      totalComments: comments.length,
      unresolvedComments: comments.filter(c => !c.resolved).length,
      totalActivities: activities.length,
      lastActivity: activities[0]?.timestamp || null,
      version: dashboard.version,
      createdAt: dashboard.createdAt,
      updatedAt: dashboard.updatedAt
    }
  }

  // Search shared dashboards
  searchDashboards(userId, query, filters = {}) {
    const userDashboards = this.getUserDashboards(userId)
    
    return userDashboards.filter(dashboard => {
      // Text search
      const matchesQuery = !query || 
        dashboard.name.toLowerCase().includes(query.toLowerCase()) ||
        dashboard.description.toLowerCase().includes(query.toLowerCase()) ||
        dashboard.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))

      // Filter by tags
      const matchesTags = !filters.tags || 
        filters.tags.every(tag => dashboard.tags.includes(tag))

      // Filter by date range
      const matchesDateRange = (!filters.startDate || new Date(dashboard.createdAt) >= new Date(filters.startDate)) &&
                              (!filters.endDate || new Date(dashboard.createdAt) <= new Date(filters.endDate))

      return matchesQuery && matchesTags && matchesDateRange
    })
  }

  // Export dashboard
  exportDashboard(dashboardId, userId) {
    const dashboard = this.sharedDashboards.get(dashboardId)
    if (!dashboard) {
      throw new Error('Dashboard not found')
    }

    if (!this.canViewDashboard(dashboard, userId)) {
      throw new Error('Insufficient permissions')
    }

    const exportData = {
      dashboard,
      comments: this.getDashboardComments(dashboardId),
      activities: this.getDashboardActivities(dashboardId),
      stats: this.getDashboardStats(dashboardId),
      exportedAt: new Date().toISOString(),
      exportedBy: userId
    }

    return exportData
  }

  // Import dashboard
  importDashboard(userId, importData) {
    const { dashboard, comments, activities } = importData

    // Create new dashboard with new ID
    const newDashboard = {
      ...dashboard,
      id: crypto.randomUUID(),
      ownerId: userId,
      collaborators: [], // Reset collaborators
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    }

    this.sharedDashboards.set(newDashboard.id, newDashboard)
    this.comments.set(newDashboard.id, comments || [])
    this.activities.set(newDashboard.id, activities || [])

    this.logActivity(newDashboard.id, userId, 'dashboard_imported', { 
      originalName: dashboard.name
    })
    this.saveData()

    return newDashboard
  }
}

module.exports = { CollaborationManager }
