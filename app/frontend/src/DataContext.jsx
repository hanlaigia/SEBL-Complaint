import { createContext, useContext, useState, useEffect } from 'react'

const DataContext = createContext()

const STORAGE_KEYS = {
  LAYER1: 'sebl_layer1_data',
  LAYER2: 'sebl_layer2_data'
}

export const useData = () => {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useData must be used within DataProvider')
  }
  return context
}

// Load data from localStorage
const loadFromStorage = (key, defaultValue) => {
  try {
    const stored = localStorage.getItem(key)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('Error loading from localStorage:', error)
  }
  return defaultValue
}

// Save data to localStorage
const saveToStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (error) {
    console.error('Error saving to localStorage:', error)
  }
}

export const DataProvider = ({ children }) => {
  // Load initial data from localStorage
  const [layer1Data, setLayer1Data] = useState(() => 
    loadFromStorage(STORAGE_KEYS.LAYER1, {
      domain: null,
      dataset: null,
      messages: [],
      checklist: null
    })
  )

  const [layer2Data, setLayer2Data] = useState(() =>
    loadFromStorage(STORAGE_KEYS.LAYER2, {
      totalComplaints: 0,
      results: [],
      dateCreated: null,
      complaintsFile: null
    })
  )

  // Save to localStorage whenever data changes
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.LAYER1, layer1Data)
  }, [layer1Data])

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.LAYER2, layer2Data)
  }, [layer2Data])

  const updateLayer1Data = (updates) => {
    setLayer1Data(prev => ({ ...prev, ...updates }))
  }

  const updateLayer2Data = (updates) => {
    setLayer2Data(prev => ({ ...prev, ...updates }))
  }

  // Extract domain from Layer 1 messages or checklist
  const extractDomain = (messages, checklist = null) => {
    // First, try to get from checklist if available
    if (checklist && checklist.industry) {
      const industryValue = checklist.industry.value
      if (industryValue && industryValue !== 'Not collected') {
        return industryValue
      }
    }
    
    // Fallback: Look for industry/domain in user messages
    for (const msg of messages) {
      if (msg.type === 'user') {
        const content = msg.content.toLowerCase()
        // Check for common industry keywords
        const industries = ['finance', 'financial', 'banking', 'hotel', 'restaurant', 'healthcare', 'e-commerce', 'retail', 'education', 'technology', 'tech', 'manufacturing', 'logistics', 'transportation']
        for (const industry of industries) {
          if (content.includes(industry)) {
            return industry.charAt(0).toUpperCase() + industry.slice(1)
          }
        }
        // If user mentions industry/domain explicitly
        if (content.includes('industry') || content.includes('domain') || content.includes('business')) {
          // Try to extract the word after "industry is" or similar
          const match = content.match(/(?:industry|domain|business).*?is\s+([a-z]+)/i)
          if (match) {
            return match[1].charAt(0).toUpperCase() + match[1].slice(1)
          }
        }
      }
    }
    return null
  }

  return (
    <DataContext.Provider value={{
      layer1Data,
      layer2Data,
      updateLayer1Data,
      updateLayer2Data,
      extractDomain
    }}>
      {children}
    </DataContext.Provider>
  )
}

