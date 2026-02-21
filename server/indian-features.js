// Indian Market-Specific Features
const geoip = require('geoip-lite')

class IndianFeatures {
  constructor() {
    this.indianRegions = {
      'North': ['Delhi', 'Uttar Pradesh', 'Punjab', 'Haryana', 'Himachal Pradesh', 'Jammu & Kashmir', 'Uttarakhand', 'Chandigarh'],
      'South': ['Karnataka', 'Tamil Nadu', 'Kerala', 'Andhra Pradesh', 'Telangana', 'Puducherry', 'Lakshadweep'],
      'East': ['West Bengal', 'Odisha', 'Jharkhand', 'Bihar', 'Assam', 'Sikkim', 'Arunachal Pradesh', 'Nagaland', 'Manipur', 'Mizoram', 'Tripura', 'Andaman & Nicobar'],
      'West': ['Maharashtra', 'Gujarat', 'Rajasthan', 'Goa', 'Dadra & Nagar Haveli', 'Daman & Diu'],
      'Central': ['Madhya Pradesh', 'Chhattisgarh']
    }
    
    this.indianISPs = [
      'Jio', 'Airtel', 'BSNL', 'Vodafone Idea', 'ACT Fibernet', ' Hathway', 'You Broadband', 
      'Tikona', 'Spectranet', 'Excitel', 'BSNL FTTH', 'RailWire', 'JioFiber'
    ]
    
    this.indianCloudProviders = [
      'Tata Cloud', 'Reliance Cloud', 'Airtel Cloud', 'Sify Technologies', 'Netmagic Solutions',
      'CtrlS Datacenters', 'Yotta Infrastructure', 'ST Telemedia', 'Nxtra Data', 'Web Werks'
    ]
    
    this.indianHolidays = this.generateIndianHolidays()
  }

  // Detect if request is from India
  detectIndianRegion(ipAddress) {
    const geo = geoip.lookup(ipAddress)
    if (!geo || geo.country !== 'IN') {
      return { isIndia: false }
    }
    
    // Map to Indian regions (simplified)
    const region = this.mapToIndianRegion(geo.region, geo.city)
    
    return {
      isIndia: true,
      country: 'India',
      region: region,
      city: geo.city,
      timezone: geo.timezone,
      ll: geo.ll, // latitude, longitude
      metro: geo.metro
    }
  }

  mapToIndianRegion(state, city) {
    // Simplified mapping - in production, use comprehensive state-to-region mapping
    const northStates = ['DL', 'UP', 'PB', 'HR', 'HP', 'JK', 'UT', 'CH']
    const southStates = ['KA', 'TN', 'KL', 'AP', 'TS', 'PY', 'LD']
    const eastStates = ['WB', 'OR', 'JH', 'BR', 'AS', 'SK', 'AR', 'NL', 'MN', 'MZ', 'TR', 'AN']
    const westStates = ['MH', 'GJ', 'RJ', 'GA', 'DN', 'DD']
    const centralStates = ['MP', 'CT']
    
    if (northStates.includes(state)) return 'North'
    if (southStates.includes(state)) return 'South'
    if (eastStates.includes(state)) return 'East'
    if (westStates.includes(state)) return 'West'
    if (centralStates.includes(state)) return 'Central'
    
    return 'Unknown'
  }

  // Generate Indian holidays for current year
  generateIndianHolidays() {
    const currentYear = new Date().getFullYear()
    const holidays = [
      // Fixed holidays
      { name: 'Republic Day', date: `${currentYear}-01-26`, type: 'National' },
      { name: 'Independence Day', date: `${currentYear}-08-15`, type: 'National' },
      { name: 'Gandhi Jayanti', date: `${currentYear}-10-02`, type: 'National' },
      
      // Major festivals (dates vary - simplified for demo)
      { name: 'Diwali', date: `${currentYear}-11-12`, type: 'Religious' },
      { name: 'Holi', date: `${currentYear}-03-25`, type: 'Religious' },
      { name: 'Eid al-Fitr', date: `${currentYear}-04-10`, type: 'Religious' },
      { name: 'Christmas', date: `${currentYear}-12-25`, type: 'Religious' },
      { name: 'Durga Puja', date: `${currentYear}-10-20`, type: 'Religious' },
      { name: 'Ganesh Chaturthi', date: `${currentYear}-09-07`, type: 'Religious' },
      
      // Regional holidays
      { name: 'Pongal', date: `${currentYear}-01-14`, type: 'Regional', region: 'South' },
      { name: 'Bihu', date: `${currentYear}-04-15`, type: 'Regional', region: 'East' },
      { name: 'Onam', date: `${currentYear}-08-20`, type: 'Regional', region: 'South' }
    ]
    
    return holidays
  }

  // Check if today is an Indian holiday
  isIndianHoliday(date = new Date()) {
    const dateStr = date.toISOString().split('T')[0]
    const holiday = this.indianHolidays.find(h => h.date === dateStr)
    return holiday || null
  }

  // Get Indian business hours considering regional variations
  getIndianBusinessHours(region = null) {
    const baseHours = {
      start: '09:00',
      end: '18:00',
      timezone: 'Asia/Kolkata',
      lunchStart: '13:00',
      lunchEnd: '14:00',
      workDays: [1, 2, 3, 4, 5] // Monday to Friday
    }
    
    // Regional adjustments
    if (region === 'West') {
      // Mumbai and western regions often start earlier
      baseHours.start = '08:30'
    } else if (region === 'South') {
      // Southern tech hubs might have flexible hours
      baseHours.start = '09:30'
    }
    
    return baseHours
  }

  // Detect Indian ISP from hostname/IP patterns
  detectIndianISP(hostname, ipAddress) {
    // Check hostname patterns for Indian ISPs
    const ispPatterns = {
      'Jio': /\.jio|\.reliance|jio/i,
      'Airtel': /\.airtel|airtel/i,
      'BSNL': /\.bsnl|bsnl/i,
      'Vodafone Idea': /\.vodafone|\.idea|vodafone|idea/i,
      'ACT Fibernet': /\.actcorp|act/i,
      'Hathway': /\.hathway|hathway/i
    }
    
    for (const [isp, pattern] of Object.entries(ispPatterns)) {
      if (pattern.test(hostname)) {
        return { name: isp, type: 'ISP' }
      }
    }
    
    // Check IP ranges for Indian ISPs (simplified)
    const geo = geoip.lookup(ipAddress)
    if (geo && geo.country === 'IN') {
      return { name: 'Unknown Indian ISP', type: 'ISP', confidence: 'low' }
    }
    
    return null
  }

  // Get regional performance benchmarks
  getRegionalBenchmarks(region) {
    const benchmarks = {
      'North': {
        avgResponseTime: 180, // ms
        avgUptime: 99.5, // %
        peakHours: ['11:00-13:00', '16:00-18:00'],
        networkQuality: 'Good'
      },
      'South': {
        avgResponseTime: 150,
        avgUptime: 99.7,
        peakHours: ['10:00-12:00', '14:00-16:00'],
        networkQuality: 'Excellent'
      },
      'East': {
        avgResponseTime: 200,
        avgUptime: 99.3,
        peakHours: ['10:00-13:00', '15:00-17:00'],
        networkQuality: 'Good'
      },
      'West': {
        avgResponseTime: 160,
        avgUptime: 99.6,
        peakHours: ['09:00-12:00', '14:00-17:00'],
        networkQuality: 'Excellent'
      },
      'Central': {
        avgResponseTime: 220,
        avgUptime: 99.2,
        peakHours: ['10:00-13:00', '15:00-18:00'],
        networkQuality: 'Fair'
      }
    }
    
    return benchmarks[region] || benchmarks['Central']
  }

  // Format currency for Indian market
  formatIndianCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Format numbers in Indian style (lakhs, crores)
  formatIndianNumber(num) {
    if (num >= 10000000) {
      return (num / 10000000).toFixed(2) + ' Cr'
    } else if (num >= 100000) {
      return (num / 100000).toFixed(2) + ' L'
    } else if (num >= 1000) {
      return (num / 1000).toFixed(2) + ' K'
    }
    return num.toString()
  }

  // Get Indian compliance requirements
  getComplianceInfo() {
    return {
      dataLocalization: 'Data must be stored in India for certain categories',
      auditRequirements: 'Annual audit mandatory for payment systems',
      privacyLaws: 'IT Act 2000 and Personal Data Protection Bill',
      securityStandards: 'ISO 27001 recommended for financial services',
      reporting: 'Quarterly compliance reports required for regulated entities'
    }
  }

  // Analyze performance considering Indian market factors
  analyzeIndianPerformance(metrics, region, timeOfDay) {
    const businessHours = this.getIndianBusinessHours(region)
    const isBusinessHours = this.isWithinBusinessHours(timeOfDay, businessHours)
    const isHoliday = this.isIndianHoliday()
    
    const analysis = {
      region,
      isBusinessHours,
      isHoliday: !!isHoliday,
      holidayName: isHoliday?.name || null,
      factors: [],
      recommendations: []
    }
    
    // Add factors based on conditions
    if (!isBusinessHours) {
      analysis.factors.push('Off-business hours - lower load expected')
    }
    
    if (isHoliday) {
      analysis.factors.push(`Holiday: ${isHoliday.name} - reduced traffic expected`)
      analysis.recommendations.push('Schedule maintenance during holidays')
    }
    
    if (region === 'South' && isBusinessHours) {
      analysis.factors.push('Tech hub region - high performance expected')
      analysis.recommendations.push('Ensure high availability during peak hours')
    }
    
    return analysis
  }

  isWithinBusinessHours(timeOfDay, businessHours) {
    const [currentHour, currentMinute] = timeOfDay.split(':').map(Number)
    const [startHour, startMinute] = businessHours.start.split(':').map(Number)
    const [endHour, endMinute] = businessHours.end.split(':').map(Number)
    
    const currentTime = currentHour * 60 + currentMinute
    const startTime = startHour * 60 + startMinute
    const endTime = endHour * 60 + endMinute
    
    return currentTime >= startTime && currentTime <= endTime
  }

  // Get Indian market insights
  getMarketInsights() {
    return {
      digitalGrowth: 'India has 700+ million internet users',
      mobileFirst: '80% of internet access is via mobile',
      regionalLanguages: 'Content in regional languages sees 3x engagement',
      peakUsage: 'Peak usage: 8PM-11PM across all regions',
      emergingTech: '5G adoption growing rapidly in metro cities',
      compliance: 'GDPR-like data protection laws being implemented'
    }
  }
}

module.exports = { IndianFeatures }
