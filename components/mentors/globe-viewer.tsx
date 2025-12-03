"use client"

import * as React from "react"
import { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, ZoomIn, ZoomOut, MapPin, Navigation, Loader2, Crosshair, RefreshCw, Search, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import dynamic from "next/dynamic"

// Dynamically import Leaflet to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })

interface Mentor {
  id: number
  name: string
  latitude?: number
  longitude?: number
  city?: string
  country?: string
  is_online?: boolean
  distance?: number
  avatar?: string
  specialization?: string[]
  title?: string
  rating?: number
  total_reviews?: number
}

interface GlobeViewerProps {
  isOpen: boolean
  onClose: () => void
  userLocation: { lat: number; lng: number } | null
  mentors: Mentor[]
  onMentorClick?: (mentor: Mentor) => void
  userAvatar?: string | null
  userName?: string | null
  isSearching?: boolean
  onRefresh?: () => void
}

// Component to expose map instance to parent
function MapInstance({ onMapReady }: { onMapReady: (map: any) => void }) {
  const [useMapHook, setUseMapHook] = useState<any>(null)
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('react-leaflet').then(mod => {
        setUseMapHook(() => mod.useMap)
      })
    }
  }, [])
  
  if (!useMapHook) return null
  
  const MapComponent = () => {
    const map = useMapHook()
    
    useEffect(() => {
      if (map) {
        onMapReady(map)
      }
    }, [map, onMapReady])
    
    return null
  }
  
  return <MapComponent />
}

// Component to handle map center updates (must be inside MapContainer)
function MapUpdater({ center, zoom }: { center: [number, number], zoom: number }) {
  const [useMapHook, setUseMapHook] = useState<any>(null)
  const mapRef = useRef<any>(null)
  const isUpdatingRef = useRef(false)
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('react-leaflet').then(mod => {
        setUseMapHook(() => mod.useMap)
      })
    }
  }, [])
  
  if (!useMapHook) return null
  
  const UpdaterComponent = () => {
    const map = useMapHook()
    mapRef.current = map
    
    useEffect(() => {
      if (map && !isUpdatingRef.current) {
        // Wait for map to be fully loaded
        const checkAndUpdate = () => {
          if (map._loaded && map._container && map._container._leaflet_pos !== undefined) {
            try {
              isUpdatingRef.current = true
              map.setView(center, zoom, { animate: true, duration: 0.5 })
              setTimeout(() => {
                isUpdatingRef.current = false
              }, 600)
            } catch (error) {
              isUpdatingRef.current = false
            }
          } else {
            setTimeout(checkAndUpdate, 100)
          }
        }
        
        checkAndUpdate()
      }
    }, [map, center, zoom])
    
    return null
  }
  
  return <UpdaterComponent />
}

export function GlobeViewer({ isOpen, onClose, userLocation, mentors, onMentorClick, userAvatar, userName, isSearching = false, onRefresh }: GlobeViewerProps) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null)
  const [L, setL] = useState<any>(null)
  const mapInstanceRef = useRef<any>(null)

  // Load Leaflet on client side
  useEffect(() => {
    if (typeof window !== 'undefined' && isOpen) {
      // Load Leaflet CSS dynamically via link tag
      if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
        link.crossOrigin = '';
        document.head.appendChild(link);
      }
      
      import('leaflet').then(leaflet => {
        setL(leaflet.default)
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          setIsInitialized(true)
        }, 200)
      })
      
      // Hide Leaflet attribution
      const style = document.createElement('style')
      style.id = 'hide-leaflet-attribution'
      style.textContent = `
        .leaflet-control-attribution {
          display: none !important;
        }
      `
      if (!document.getElementById('hide-leaflet-attribution')) {
        document.head.appendChild(style)
      }
    } else {
      setIsInitialized(false)
    }
  }, [isOpen])

  // Create custom icons for markers with profile pictures
  const createCustomIcon = (mentor: Mentor, size: number = 40) => {
    if (!L) return null
    
    const borderColor = mentor.is_online ? '#00ff80' : '#ff8000'
    const borderWidth = 3
    
    // If mentor has avatar, use it; otherwise use colored circle with initial
    const avatarUrl = mentor.avatar || null
    const initial = mentor.name.charAt(0).toUpperCase()
    const bgColor = mentor.is_online ? '#00ff80' : '#ff8000'
    
    const html = avatarUrl
      ? `<div style="
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          border: ${borderWidth}px solid ${borderColor};
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          overflow: hidden;
          background: white;
        ">
          <img 
            src="${avatarUrl}" 
            alt="${mentor.name}"
            style="
              width: 100%;
              height: 100%;
              object-fit: cover;
            "
            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
          />
          <div style="
            display: none;
            width: 100%;
            height: 100%;
            background: ${bgColor};
            color: white;
            font-weight: bold;
            font-size: ${size * 0.4}px;
            align-items: center;
            justify-content: center;
          ">${initial}</div>
        </div>`
      : `<div style="
          width: ${size}px;
          height: ${size}px;
          background-color: ${bgColor};
          border: ${borderWidth}px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: ${size * 0.4}px;
        ">${initial}</div>`
    
    return L.divIcon({
      className: 'custom-marker',
      html: html,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    })
  }

  const handleZoomIn = () => {
    setMapZoom(prev => Math.min(prev + 1, 18))
  }

  const handleZoomOut = () => {
    setMapZoom(prev => Math.max(prev - 1, 2))
  }

  const handleLocateMe = () => {
    if (userLocation && mapInstanceRef.current) {
      try {
        const map = mapInstanceRef.current
        if (map._loaded && map._container) {
          // Zoom to show nearby mentors (zoom level 6-8 shows a wider area)
          const zoomLevel = nearbyMentors.length > 0 ? 6 : 10
          map.setView([userLocation.lat, userLocation.lng], zoomLevel, { animate: true, duration: 0.8 })
          setMapZoom(zoomLevel)
        }
      } catch (error) {
        console.error('Error locating user:', error)
      }
    }
  }

  const handleMapReady = (map: any) => {
    mapInstanceRef.current = map
  }

  // Calculate distance for mentors if user location is available
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371 // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // Country to approximate coordinates mapping (for mentors without exact coordinates)
  // Case-insensitive matching
  const countryCoordinates: Record<string, { lat: number; lng: number }> = {
    'south africa': { lat: -30.5595, lng: 22.9375 },
    'united states': { lat: 37.0902, lng: -95.7129 },
    'united states of america': { lat: 37.0902, lng: -95.7129 },
    'usa': { lat: 37.0902, lng: -95.7129 },
    'united kingdom': { lat: 55.3781, lng: -3.4360 },
    'uk': { lat: 55.3781, lng: -3.4360 },
    'canada': { lat: 56.1304, lng: -106.3468 },
    'australia': { lat: -25.2744, lng: 133.7751 },
    'india': { lat: 20.5937, lng: 78.9629 },
    'germany': { lat: 51.1657, lng: 10.4515 },
    'france': { lat: 46.2276, lng: 2.2137 },
    'brazil': { lat: -14.2350, lng: -51.9253 },
    'china': { lat: 35.8617, lng: 104.1954 },
  }

  // Helper function to get country coordinates (case-insensitive)
  const getCountryCoords = (country: string | null | undefined): { lat: number; lng: number } | null => {
    if (!country) return null
    const countryLower = country.trim().toLowerCase()
    return countryCoordinates[countryLower] || null
  }

  // Show all mentors - use exact coordinates if available, otherwise use country-level coordinates
  const mentorsWithCoords = mentors.map(m => {
    const hasLat = m.latitude !== null && m.latitude !== undefined && !isNaN(Number(m.latitude))
    const hasLng = m.longitude !== null && m.longitude !== undefined && !isNaN(Number(m.longitude))
    
    if (hasLat && hasLng) {
      return { ...m, latitude: Number(m.latitude), longitude: Number(m.longitude), hasExactCoords: true }
    }
    
    // If no exact coordinates but has country, use country-level coordinates
    const countryCoords = getCountryCoords(m.country)
    if (countryCoords) {
      return { ...m, latitude: countryCoords.lat, longitude: countryCoords.lng, hasExactCoords: false }
    }
    
    // Log mentors without coordinates for debugging
    console.warn('Mentor without coordinates:', {
      name: m.name,
      country: m.country,
      city: m.city,
      latitude: m.latitude,
      longitude: m.longitude
    })
    
    return null
  }).filter((m): m is NonNullable<typeof m> => m !== null)
  
  console.log('GlobeViewer - Total mentors received:', mentors.length)
  console.log('GlobeViewer - Mentors with coordinates (exact or country-level):', mentorsWithCoords.length)
  console.log('Mentors breakdown:', {
    withExactCoords: mentorsWithCoords.filter(m => m.hasExactCoords).length,
    withCountryCoords: mentorsWithCoords.filter(m => !m.hasExactCoords).length,
    mentorNames: mentorsWithCoords.map(m => `${m.name} (${m.country || 'no country'})`)
  })
  console.log('All mentors data:', mentors.map(m => ({
    name: m.name,
    country: m.country,
    city: m.city,
    lat: m.latitude,
    lng: m.longitude
  })))
  
  const nearbyMentors = mentorsWithCoords
    .map(mentor => {
      const lat = mentor.latitude
      const lng = mentor.longitude
      
      if (userLocation && !isNaN(lat) && !isNaN(lng)) {
        const distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          lat,
          lng
        )
        return { ...mentor, latitude: lat, longitude: lng, distance }
      }
      return { ...mentor, latitude: lat, longitude: lng }
    })
    .sort((a, b) => {
      // Sort by distance if available, otherwise keep original order
      const distA = a.distance ?? Infinity
      const distB = b.distance ?? Infinity
      return distA - distB
    })

  // Get map center - use user location if available, otherwise center on mentors or default
  const getMapCenter = (): [number, number] => {
    if (userLocation) {
      return [userLocation.lat, userLocation.lng]
    }
    // If we have mentors with coordinates, center on them
    if (nearbyMentors.length > 0) {
      const avgLat = nearbyMentors.reduce((sum, m) => sum + m.latitude!, 0) / nearbyMentors.length
      const avgLng = nearbyMentors.reduce((sum, m) => sum + m.longitude!, 0) / nearbyMentors.length
      return [avgLat, avgLng]
    }
    // Default center (South Africa since most mentors seem to be there)
    return [-30.5595, 22.9375]
  }
  
  const mapCenter: [number, number] = getMapCenter()
  
  // Adjust initial zoom based on number of mentors
  const getInitialZoom = (): number => {
    if (nearbyMentors.length === 0) return 2
    if (nearbyMentors.length === 1) return 6
    if (nearbyMentors.length <= 5) return 5
    return 4 // Wider view for more mentors
  }
  
  const [mapZoom, setMapZoom] = useState(2)
  
  // Update zoom when mentors are processed
  useEffect(() => {
    if (nearbyMentors.length > 0) {
      const initialZoom = userLocation ? getInitialZoom() : (nearbyMentors.length > 1 ? 4 : 6)
      setMapZoom(initialZoom)
    } else if (userLocation) {
      setMapZoom(6)
    }
  }, [nearbyMentors.length, userLocation])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 z-50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-gradient-to-br from-white via-blue-50 to-purple-50 rounded-2xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden border border-blue-200">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Navigation className="w-6 h-6 text-blue-600" />
                    Global Mentor Search
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {userLocation ? `Your location: ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}` : 'Searching for mentors worldwide'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {userLocation && (
                    <Button
                      onClick={handleLocateMe}
                      variant="outline"
                      size="sm"
                      className="bg-white border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-400"
                      title="Zoom to your location"
                    >
                      <Crosshair className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    onClick={handleZoomIn}
                    variant="outline"
                    size="sm"
                    className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={handleZoomOut}
                    variant="outline"
                    size="sm"
                    className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={onClose}
                    variant="outline"
                    size="sm"
                    className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Main Content */}
              <div className="flex flex-col lg:flex-row h-[calc(90vh-100px)]">
                {/* Map Container */}
                <div className="flex-1 relative bg-gray-100" style={{ minHeight: '500px' }}>
                  {!isInitialized && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 bg-gray-100">
                      <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                        <p className="text-gray-700 text-sm">Loading map...</p>
                      </div>
                    </div>
                  )}
                  
                  {isInitialized && typeof window !== 'undefined' && L && (
                    <div className="w-full h-full" style={{ zIndex: 1 }}>
                      <MapContainer
                        center={mapCenter}
                        zoom={mapZoom}
                        style={{ height: '100%', width: '100%' }}
                        scrollWheelZoom={true}
                        whenReady={() => {
                          // Map is ready
                        }}
                      >
                        <TileLayer
                          attribution=""
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        
                        <MapInstance onMapReady={handleMapReady} />
                        <MapUpdater center={mapCenter} zoom={mapZoom} />
                        
                        {/* User location marker */}
                        {userLocation && L && (
                          <Marker
                            position={[userLocation.lat, userLocation.lng]}
                            icon={L.divIcon({
                              className: 'custom-marker',
                              html: userAvatar
                                ? `<div style="
                                    width: 40px;
                                    height: 40px;
                                    border-radius: 50%;
                                    border: 3px solid #00d4ff;
                                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                                    overflow: hidden;
                                    background: white;
                                  ">
                                    <img 
                                      src="${userAvatar}" 
                                      alt="${userName || 'You'}"
                                      style="
                                        width: 100%;
                                        height: 100%;
                                        object-fit: cover;
                                      "
                                      onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                                    />
                                    <div style="
                                      display: none;
                                      width: 100%;
                                      height: 100%;
                                      background: #00d4ff;
                                      color: white;
                                      font-weight: bold;
                                      font-size: 16px;
                                      align-items: center;
                                      justify-content: center;
                                    ">${(userName || 'You').charAt(0).toUpperCase()}</div>
                                  </div>`
                                : `<div style="
                                    width: 40px;
                                    height: 40px;
                                    background-color: #00d4ff;
                                    border: 3px solid white;
                                    border-radius: 50%;
                                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    color: white;
                                    font-weight: bold;
                                    font-size: 16px;
                                  ">${(userName || 'You').charAt(0).toUpperCase()}</div>`,
                              iconSize: [40, 40],
                              iconAnchor: [20, 20],
                            })}
                          >
                            <Popup>
                              <div className="p-3">
                                <div className="flex items-center gap-3 mb-2">
                                  {userAvatar ? (
                                    <img
                                      src={userAvatar}
                                      alt={userName || "You"}
                                      className="w-12 h-12 rounded-full object-cover border-2 border-blue-500"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement
                                        target.style.display = 'none'
                                        target.nextElementSibling?.classList.remove('hidden')
                                      }}
                                    />
                                  ) : null}
                                  <div className={`w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-lg border-2 border-blue-600 ${userAvatar ? 'hidden' : ''}`}>
                                    {(userName || 'You').charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <h3 className="font-semibold text-sm mb-0.5">Your Location</h3>
                                    {userName && (
                                      <p className="text-xs text-gray-500">{userName}</p>
                                    )}
                                  </div>
                                </div>
                                <p className="text-xs text-gray-600 mt-2 pt-2 border-t border-gray-200">
                                  {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                                </p>
                              </div>
                            </Popup>
                          </Marker>
                        )}

                        {/* Mentor markers - Show ALL mentors with coordinates (exact or country-level) */}
                        {nearbyMentors.map(mentor => {
                            const icon = createCustomIcon(mentor, mentor.is_online ? 40 : 35)
                            if (!icon) return null
                            
                            // Use a slightly different icon style for mentors without exact coordinates
                            const markerSize = (mentor as any).hasExactCoords === false ? 35 : (mentor.is_online ? 40 : 35)
                            
                            return (
                              <Marker
                                key={mentor.id}
                                position={[mentor.latitude!, mentor.longitude!]}
                                icon={icon}
                                eventHandlers={{
                                  click: () => {
                                    setSelectedMentor(mentor)
                                    onMentorClick?.(mentor)
                                  }
                                }}
                              >
                                <Popup>
                                  <div className="p-2">
                                    <h3 className="font-semibold text-sm mb-1">{mentor.name}</h3>
                                    {mentor.title && (
                                      <p className="text-xs text-gray-700 mb-1 font-medium">
                                        {mentor.title}
                                      </p>
                                    )}
                                    {mentor.specialization && mentor.specialization.length > 0 && (
                                      <p className="text-xs text-gray-600 mb-1">
                                        {mentor.specialization.slice(0, 3).join(', ')}
                                      </p>
                                    )}
                                    {mentor.city && mentor.country && (
                                      <p className="text-xs text-gray-600 mb-1">
                                        {mentor.city}, {mentor.country}
                                      </p>
                                    )}
                                    {!mentor.city && mentor.country && (
                                      <p className="text-xs text-gray-600 mb-1">
                                        {mentor.country}
                                      </p>
                                    )}
                                    {(mentor as any).hasExactCoords === false && (
                                      <p className="text-xs text-amber-600 mb-1 italic">
                                        Approximate location (country-level)
                                      </p>
                                    )}
                                    {mentor.distance !== undefined && (
                                      <p className="text-xs text-blue-600 font-medium">
                                        {mentor.distance.toFixed(1)} km away
                                      </p>
                                    )}
                                    <button
                                      onClick={() => {
                                        setSelectedMentor(mentor)
                                        onMentorClick?.(mentor)
                                      }}
                                      className="mt-2 w-full px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                                    >
                                      View Profile
                                    </button>
                                  </div>
                                </Popup>
                              </Marker>
                            )
                          })}
                      </MapContainer>
                    </div>
                  )}
                  
                  {/* Legend */}
                  <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 border border-gray-200 shadow-lg z-20">
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-gray-900">
                        <div className="w-3 h-3 rounded-full bg-cyan-500 border-2 border-white"></div>
                        <span>Your Location</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-900">
                        <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white"></div>
                        <span>Online Mentors</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-900">
                        <div className="w-3 h-3 rounded-full bg-orange-500 border-2 border-white"></div>
                        <span>Offline Mentors</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sidebar - Mentor List */}
                <div className="lg:w-80 border-t lg:border-t-0 lg:border-l border-gray-200 bg-white overflow-y-auto">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-blue-600" />
                        Nearby Mentors
                      </h3>
                      {onRefresh && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={onRefresh}
                          disabled={isSearching}
                          className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-blue-200"
                          title="Refresh and search for mentors"
                        >
                          <RefreshCw className={`w-4 h-4 ${isSearching ? 'animate-spin' : ''}`} />
                        </motion.button>
                      )}
                    </div>
                    
                    {isSearching ? (
                      <div className="text-center py-8">
                        <div className="flex flex-col items-center justify-center">
                          {/* Futuristic blinking circle with 2 lines */}
                          <div className="relative mb-4 w-20 h-20">
                            {/* Blinking circle */}
                            <div className="absolute inset-0 rounded-full border-4 border-blue-500 animate-pulse shadow-lg shadow-blue-500/50"></div>
                            {/* Inner pulsing circle */}
                            <div className="absolute inset-2 rounded-full border-2 border-purple-400 animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                            
                            {/* Blinking line 1 - Vertical */}
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-12 bg-gradient-to-b from-transparent via-blue-400 to-transparent animate-pulse opacity-60"></div>
                            
                            {/* Blinking line 2 - Horizontal */}
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-pulse opacity-60" style={{ animationDelay: '0.5s' }}></div>
                            
                            {/* Center dot */}
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-blue-400 rounded-full animate-pulse shadow-lg shadow-blue-400"></div>
                          </div>
                          
                          <motion.p 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-gray-700 text-sm mb-1 font-medium"
                          >
                            Searching for mentors...
                          </motion.p>
                          <motion.p 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-gray-500 text-xs"
                          >
                            Please wait
                          </motion.p>
                        </div>
                      </div>
                    ) : nearbyMentors.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-600 text-sm mb-2">No mentors with location data found</p>
                        <p className="text-gray-500 text-xs">
                          {mentors.length > 0 
                            ? "Mentors need to have latitude and longitude coordinates to appear on the map"
                            : "No mentors available"}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {nearbyMentors.map((mentor) => (
                          <motion.div
                            key={mentor.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            onClick={() => {
                              setSelectedMentor(mentor)
                              onMentorClick?.(mentor)
                            }}
                            className={`p-3 rounded-lg border cursor-pointer transition-all ${
                              selectedMentor?.id === mentor.id
                                ? 'bg-blue-100 border-blue-400'
                                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {/* Profile Picture */}
                              <div className="relative flex-shrink-0">
                                {mentor.avatar ? (
                                  <img
                                    src={mentor.avatar}
                                    alt={mentor.name}
                                    className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement
                                      target.style.display = 'none'
                                      const fallback = target.nextElementSibling as HTMLElement
                                      if (fallback) fallback.classList.remove('hidden')
                                    }}
                                  />
                                ) : null}
                                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${mentor.is_online ? 'from-green-400 to-green-600' : 'from-orange-400 to-orange-600'} flex items-center justify-center text-white font-semibold text-lg border-2 border-white shadow-md ${mentor.avatar ? 'hidden' : ''}`}>
                                  {mentor.name.charAt(0).toUpperCase()}
                                </div>
                                {mentor.is_online && (
                                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                                )}
                              </div>
                              
                              {/* Mentor Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between mb-1">
                                  <h4 className="text-gray-900 font-medium text-sm truncate">{mentor.name}</h4>
                                </div>
                                {mentor.title && (
                                  <p className="text-xs text-gray-700 font-medium mb-1">
                                    {mentor.title}
                                  </p>
                                )}
                                {/* Star Rating */}
                                {mentor.rating !== undefined && mentor.rating > 0 && (
                                  <div className="flex items-center gap-0.5 mb-1">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                      <Star
                                        key={i}
                                        className={`w-3 h-3 ${
                                          i < Math.floor(mentor.rating || 0)
                                            ? 'fill-yellow-400 text-yellow-400'
                                            : 'fill-gray-200 text-gray-200'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                )}
                                {mentor.specialization && mentor.specialization.length > 0 && (
                                  <p className="text-xs text-gray-600 mb-1 line-clamp-1">
                                    {mentor.specialization.slice(0, 2).join(', ')}
                                    {mentor.specialization.length > 2 && ` +${mentor.specialization.length - 2}`}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                                  <MapPin className="w-3 h-3 flex-shrink-0" />
                                  <span className="truncate">
                                    {mentor.city && mentor.country
                                      ? `${mentor.city}, ${mentor.country}`
                                      : mentor.country || mentor.city || 'Unknown'}
                                  </span>
                                </div>
                                {mentor.distance !== undefined && (
                                  <div className="text-xs text-blue-600 font-medium">
                                    {mentor.distance.toFixed(1)} km away
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
