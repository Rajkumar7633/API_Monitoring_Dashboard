// Service Worker for PWA functionality
const CACHE_NAME = 'api-dashboard-v1'
const STATIC_CACHE = 'static-v1'
const DYNAMIC_CACHE = 'dynamic-v1'

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/alerts',
  '/services',
  '/tracing',
  '/builder',
  '/manifest.json',
  // Add other static assets as needed
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...')
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => self.skipWaiting())
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...')
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => self.clients.claim())
  )
})

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }
  
  // Skip external requests
  if (!request.url.startsWith(self.location.origin)) {
    return
  }
  
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          return cachedResponse
        }
        
        // Otherwise fetch from network
        return fetch(request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response
            }
            
            // Clone response since it can only be consumed once
            const responseToCache = response.clone()
            
            // Cache API responses for offline access
            if (request.url.includes('/api/')) {
              caches.open(DYNAMIC_CACHE)
                .then((cache) => {
                  cache.put(request, responseToCache)
                })
            }
            
            return response
          })
          .catch(() => {
            // Return offline fallback for API requests
            if (request.url.includes('/api/')) {
              return new Response(
                JSON.stringify({
                  error: 'Offline - No cached data available',
                  offline: true,
                  timestamp: new Date().toISOString()
                }),
                {
                  status: 503,
                  statusText: 'Service Unavailable',
                  headers: {
                    'Content-Type': 'application/json'
                  }
                }
              )
            }
            
            // Return offline page for navigation requests
            if (request.mode === 'navigate') {
              return caches.match('/offline.html') || 
                new Response('Offline - Please check your internet connection', {
                  status: 503,
                  statusText: 'Service Unavailable'
                })
            }
          })
      })
  )
})

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered', event.tag)
  
  if (event.tag === 'background-sync-alerts') {
    event.waitUntil(syncAlerts())
  }
})

// Push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push received')
  
  const options = {
    body: event.data ? event.data.text() : 'New alert in API Dashboard',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Dashboard',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/xmark.png'
      }
    ]
  }
  
  event.waitUntil(
    self.registration.showNotification('API Dashboard Alert', options)
  )
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification click received')
  
  event.notification.close()
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    )
  }
})

// Periodic background sync for data updates
self.addEventListener('periodicsync', (event) => {
  console.log('Service Worker: Periodic sync triggered', event.tag)
  
  if (event.tag === 'update-dashboard-data') {
    event.waitUntil(updateDashboardData())
  }
})

// Helper functions
async function syncAlerts() {
  try {
    // Sync any pending alert acknowledgments/resolutions
    console.log('Syncing alerts...')
    // Implementation would depend on your specific sync requirements
  } catch (error) {
    console.error('Error syncing alerts:', error)
  }
}

async function updateDashboardData() {
  try {
    // Pre-fetch critical dashboard data
    console.log('Updating dashboard data...')
    const criticalEndpoints = [
      '/api/dashboard-data',
      '/api/alerts',
      '/api/health'
    ]
    
    for (const endpoint of criticalEndpoints) {
      try {
        await fetch(endpoint)
      } catch (error) {
        console.log(`Failed to update ${endpoint}:`, error)
      }
    }
  } catch (error) {
    console.error('Error updating dashboard data:', error)
  }
}
