// Map management functions for WerTigo Trip Planner

// Declare map variable globally but initialize it later
var map = null;

// Initialize map function
function initMap() {
  // Check if the map container exists
  const mapContainer = document.getElementById('map');
  if (!mapContainer) {
    console.error('Map container not found. Map initialization skipped.');
    console.log('Map container element:', mapContainer);
    console.log('All available map-like elements:', document.querySelectorAll('[id*="map"]'));
    return false;
  }

  // Only initialize if not already initialized
  if (!map) {
    try {
      console.log('Initializing map with container:', mapContainer);
      map = L.map('map').setView([14.5995, 120.9842], 13);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: 'Map data © OpenStreetMap contributors'
      }).addTo(map);
      
      console.log('Map initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing map:', error);
      return false;
    }
  }
  return true;
}

// Global variables for route display
var currentRouteLine = null;
var currentRouteMarkers = [];

// Function to clear existing route from the map
function clearRoute() {
  // Check if map exists
  if (!map) return;

  // Remove existing route line if it exists
  if (currentRouteLine) {
    map.removeLayer(currentRouteLine);
    currentRouteLine = null;
  }
  
  // Remove existing markers
  currentRouteMarkers.forEach(marker => {
    map.removeLayer(marker);
  });
  currentRouteMarkers = [];
}

// Function to display route on the map
function displayRouteOnMap(routeData, points) {
  // Ensure map is initialized
  if (!map && !initMap()) return null;

  // Clear any existing routes first
  clearRoute();
  
  // Add markers for each point
  points.forEach((point, index) => {
    const marker = L.marker([point.lat, point.lng])
      .addTo(map)
      .bindPopup(`<b>${point.name}</b><br>${index === 0 ? 'Starting Point' : `Stop ${index}`}`);
    currentRouteMarkers.push(marker);
    });

  // Add the route line
  const routePoints = routeData.points.map(coord => [coord[1], coord[0]]);
  currentRouteLine = L.polyline(routePoints, { 
    color: '#0066cc', 
    weight: 5,
    opacity: 0.7
  }).addTo(map);
  
  // Fit the map to show all markers and the route
  const bounds = L.latLngBounds(routePoints);
  map.fitBounds(bounds, { padding: [30, 30] });
  
  // Return the route summary for display
  return {
    distance_km: routeData.distance_km,
    time_min: routeData.time_min
  };
}

// Function to geocode a destination by name
function geocodeDestination(locationName) {
  // Ensure map is initialized
  if (!map && !initMap()) return;

  // Use the built-in geocoding to find coordinates
  fetch(getApiUrl(`/geocode?q=${encodeURIComponent(locationName)}`))
    .then(response => response.json())
    .then(data => {
      if (data.results && data.results.length > 0) {
        const location = data.results[0];
        
        // Update map view
        map.setView([location.point.lat, location.point.lng], 13);
        
        // Add marker
        const marker = L.marker([location.point.lat, location.point.lng])
          .addTo(map)
          .bindPopup(`<b>${locationName}</b>`);
        
        // Add to current markers
        currentRouteMarkers.push(marker);
        
        // Update destination coordinates if we have planner data
        if (window.plannerData && window.plannerData.destination) {
          window.plannerData.destination.latitude = location.point.lat;
          window.plannerData.destination.longitude = location.point.lng;
        }
      }
    })
    .catch(error => {
      console.error('Error geocoding destination:', error);
    });
}

// Function to geocode an activity location
function geocodeActivityLocation(locationName, activityId) {
  // Ensure map is initialized
  if (!map && !initMap()) return;

  // Get base location (destination city) for context
  let baseLocation = '';
  if (window.plannerData && window.plannerData.destination) {
    baseLocation = window.plannerData.destination.city || '';
  }
  
  // Combine for better geocoding results
  const searchQuery = baseLocation ? `${locationName}, ${baseLocation}` : locationName;
  
  // Geocode the location
  fetch(getApiUrl(`/geocode?q=${encodeURIComponent(searchQuery)}`))
    .then(response => response.json())
    .then(data => {
      if (data.results && data.results.length > 0) {
        const location = data.results[0];
        
        // Add marker
        const marker = L.marker([location.point.lat, location.point.lng])
          .addTo(map)
          .bindPopup(`<b>${locationName}</b>`);
        
        // Add to current markers
        currentRouteMarkers.push(marker);
        
        // Store coordinates with the activity
        if (window.plannerData && window.plannerData.activities) {
          const activity = window.plannerData.activities.find(a => a.id === activityId);
          if (activity) {
            activity.latitude = location.point.lat;
            activity.longitude = location.point.lng;
          }
        }
        
        // Adjust map to show all markers
        if (currentRouteMarkers.length > 0) {
          const group = new L.featureGroup(currentRouteMarkers);
          map.fitBounds(group.getBounds(), { padding: [30, 30] });
        }
      }
    })
    .catch(error => {
      console.error('Error geocoding activity location:', error);
    });
}

// Initialize the map when the DOM is fully loaded with a small delay
document.addEventListener('DOMContentLoaded', function() {
  // Use a small delay to ensure all elements are fully rendered
  setTimeout(function() {
    console.log('DOM fully loaded, attempting to initialize map...');
    initMap();
  }, 500);
}); 