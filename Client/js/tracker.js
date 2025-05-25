// DOM Elements
const searchButton = document.getElementById('searchButton');
const ticketIdInput = document.getElementById('ticketIdInput');
const emailInput = document.getElementById('emailInput');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const ticketDetails = document.getElementById('ticketDetails');
const noResults = document.getElementById('noResults');

const listButton = document.getElementById('listButton');
const emailListInput = document.getElementById('emailListInput');
const listErrorMessage = document.getElementById('listErrorMessage');
const ticketList = document.getElementById('ticketList');
const ticketCards = document.getElementById('ticketCards');

const printButton = document.getElementById('printButton');
const deleteButton = document.getElementById('deleteButton');

// API endpoint URL - use the API_CONFIG from config.js
const API_URL = API_CONFIG.BASE_URL;

// Helper function to get API URL (same as in other files)
function getApiUrl(endpoint) {
    return API_CONFIG.BASE_URL + endpoint;
}

// Map markers collection
let mapMarkers = [];
let currentRouteLine = null;
let routeInfoContainer = null;

// Hide UI elements initially
errorMessage.style.display = 'none';
successMessage.style.display = 'none';
ticketDetails.style.display = 'none';
ticketList.style.display = 'none';
listErrorMessage.style.display = 'none';

// Check for ticket ID in URL query params on page load
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const ticketParam = urlParams.get('ticket');
    
    if (ticketParam) {
        ticketIdInput.value = ticketParam;
        searchButton.click();
    }
});

// Search for a ticket
searchButton.addEventListener('click', async () => {
    const ticketId = ticketIdInput.value.trim();
    const email = emailInput.value.trim();
    
    // Clear previous messages
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';
    ticketDetails.style.display = 'none';
    ticketList.style.display = 'none';
    noResults.style.display = 'flex';
    
    if (!ticketId) {
        errorMessage.textContent = 'Please enter a ticket ID.';
        errorMessage.style.display = 'block';
        return;
    }
    
    // Show loading state
    noResults.innerHTML = '<i class="fas fa-spinner fa-spin"></i><p>Loading ticket data...</p>';
    
    try {
        // Fetch ticket data from API
        let apiUrl = `${API_URL}/tickets/${ticketId}`;
        if (email) {
            apiUrl += `?email=${encodeURIComponent(email)}`;
        }
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch ticket');
        }
        
        const data = await response.json();
        const ticket = data.ticket;
        
        // Show success message
        successMessage.textContent = 'Ticket found!';
        successMessage.style.display = 'block';
        
        // Hide no results message
        noResults.style.display = 'none';
        
        // Create a ticket data object for display
        const ticketData = {
            ticket_id: ticket.ticket_id,
            status: ticket.status || 'active',
            destination: ticket.destination || 'Not specified',
            travel_dates: ticket.travel_dates || 'Not specified',
            travelers: ticket.trip?.travelers || 1,
            budget: ticket.trip?.budget || '₱0',
            budget_numeric: ticket.trip?.budget_numeric,
            itinerary: ticket.trip?.itinerary || [],
            selected_destinations: ticket.trip?.selected_destinations || []
        };
        
        // Display ticket details
        displayTicketDetails(ticketData);
        
    } catch (error) {
        console.error('Error fetching ticket:', error);
        errorMessage.textContent = error.message || 'An error occurred while fetching the ticket. Please try again.';
        errorMessage.style.display = 'block';
        
        // Reset no results message
        noResults.innerHTML = '<i class="fas fa-ticket-alt"></i><p>Enter your ticket ID or email address to track your travel plans.</p>';
        noResults.style.display = 'flex';
    }
});

// Function to display ticket details
function displayTicketDetails(ticket) {
    // Show the ticket details section
    ticketDetails.style.display = 'block';
    
    // Set ticket ID and status
    document.getElementById('displayTicketId').textContent = ticket.ticket_id;
    
    const statusElement = document.getElementById('displayStatus');
    statusElement.textContent = ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1);
    
    // Remove all status classes
    statusElement.className = 'ticket-status';
    // Add specific status class
    statusElement.classList.add(`status-${ticket.status.toLowerCase()}`);
    
    // Set trip details
    document.getElementById('displayDestination').textContent = ticket.destination || 'Not specified';
    document.getElementById('displayDates').textContent = ticket.travel_dates || 'Not specified';
    document.getElementById('displayTravelers').textContent = ticket.travelers || '1';
    
    // Format budget with peso sign - use budget_numeric if available
    const budgetToDisplay = ticket.budget_numeric !== undefined ? ticket.budget_numeric : ticket.budget;
    document.getElementById('displayBudget').textContent = formatPesoCurrency(budgetToDisplay);
    
    // Display itinerary
    displayItinerary(ticket);
    
    // Initialize map with all destinations
    initializeMap(ticket);
    
    // Store ticket ID and email for delete operation
    deleteButton.setAttribute('data-ticket-id', ticket.ticket_id);
    deleteButton.setAttribute('data-email', emailInput.value.trim());
}

// Function to initialize map with all destinations
function initializeMap(trip) {
    // Default location (Philippines)
    let centerLat = 12.8797;
    let centerLng = 121.7740;
    let zoomLevel = 6;
    
    // Check for existing map instance and remove it
    if (window.ticketMap) {
        window.ticketMap.remove();
    }
    
    // Create new map
    window.ticketMap = L.map('mapContainer').setView([centerLat, centerLng], zoomLevel);
    
    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: 'Map data © OpenStreetMap contributors'
    }).addTo(window.ticketMap);
    
    // Clear existing markers
    mapMarkers.forEach(marker => marker.remove());
    mapMarkers = [];
    
    // Collect all places from itinerary and selected destinations
    const places = [];
    
    // Add places from itinerary
    if (trip.itinerary && trip.itinerary.length > 0) {
        trip.itinerary.forEach(day => {
            if (day.places && day.places.length > 0) {
                day.places.forEach(place => {
                    if (place.latitude && place.longitude) {
                        places.push(place);
                    }
                });
            }
        });
    }
    
    // Add selected destinations if no places from itinerary
    if (places.length === 0 && trip.selected_destinations && trip.selected_destinations.length > 0) {
        trip.selected_destinations.forEach(place => {
            if (place.latitude && place.longitude) {
                places.push(place);
            }
        });
    }
    
    // If we have coordinates, add markers and fit bounds
    if (places.length > 0) {
        const bounds = L.latLngBounds();
        
        places.forEach((place, index) => {
            const marker = L.marker([place.latitude, place.longitude])
                .addTo(window.ticketMap)
                .bindPopup(`<b>${place.name}</b><br>${place.category || 'Attraction'}`);
            
            mapMarkers.push(marker);
            bounds.extend([place.latitude, place.longitude]);
        });
        
        // If we have more than one place, add a "Show Complete Route" button
        if (places.length > 1) {
            const routeControl = L.control({position: 'topright'});
            
            routeControl.onAdd = function(map) {
                const div = L.DomUtil.create('div', 'route-control');
                div.innerHTML = '<button id="showFullRouteBtn" class="route-control-btn">Show Complete Route</button>';
                return div;
            };
            
            routeControl.addTo(window.ticketMap);
            
            setTimeout(() => {
                const showFullRouteBtn = document.getElementById('showFullRouteBtn');
                if (showFullRouteBtn) {
                    showFullRouteBtn.addEventListener('click', () => {
                        calculateAndDisplayRoute(places);
                    });
                }
            }, 100);
        }
        
        // Fit map to show all markers
        window.ticketMap.fitBounds(bounds, {
            padding: [50, 50]
        });
    } else {
        // Try to use destination name to set map view
        geocodeDestination(trip.destination);
    }
    
    // Check if there's route info stored in the trip and display it
    if (trip.route_info) {
        showSavedRouteInfo(trip.route_info);
    }
}

// Function to calculate and display a route between places
function calculateAndDisplayRoute(places) {
    // Need at least 2 places to create a route
    if (!places || places.length < 2) {
        alert('Need at least 2 destinations to create a route');
        return;
    }
    
    // Show loading state
    const showFullRouteBtn = document.getElementById('showFullRouteBtn');
    if (showFullRouteBtn) {
        showFullRouteBtn.textContent = 'Calculating Route...';
        showFullRouteBtn.disabled = true;
    }
    
    // Prepare route request
    const routePoints = places.map(place => ({
        lat: place.latitude,
        lng: place.longitude,
        name: place.name
    }));
    
    // Call API to get route
    fetch(getApiUrl('/route'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            points: routePoints.map(p => [p.lng, p.lat]), // GeoJSON uses [lng, lat] format
            names: routePoints.map(p => p.name)
        })
    })
    .then(response => response.json())
    .then(data => {
        // Reset button
        if (showFullRouteBtn) {
            showFullRouteBtn.textContent = 'Show Complete Route';
            showFullRouteBtn.disabled = false;
        }
        
        if (data.route) {
            displayRoute(data.route, routePoints);
        } else {
            alert('Could not calculate a route between these destinations. Please try different locations.');
        }
    })
    .catch(error => {
        console.error('Error calculating route:', error);
        
        // Reset button
        if (showFullRouteBtn) {
            showFullRouteBtn.textContent = 'Show Complete Route';
            showFullRouteBtn.disabled = false;
        }
        
        alert('Error calculating route. Please try again.');
    });
}

// Function to display a route on the map
function displayRoute(routeData, points) {
    // Clear any existing route line
    if (currentRouteLine) {
        window.ticketMap.removeLayer(currentRouteLine);
        currentRouteLine = null;
    }
    
    // Remove existing route info container
    if (routeInfoContainer) {
        routeInfoContainer.remove();
        routeInfoContainer = null;
    }
    
    // Create route points from the route data
    const routePoints = routeData.points.map(coord => [coord[1], coord[0]]);
    
    // Create and add the route line to the map
    currentRouteLine = L.polyline(routePoints, {
        color: '#0066cc',
        weight: 5,
        opacity: 0.7
    }).addTo(window.ticketMap);
    
    // Create route info element
    routeInfoContainer = document.createElement('div');
    routeInfoContainer.className = 'route-info-container';
    routeInfoContainer.innerHTML = `
        <div class="route-info-header">Route Information</div>
        <div class="route-info-content">
            <div class="route-info-item">
                <i class="fas fa-route"></i> Distance: ${routeData.distance_km.toFixed(1)} km
            </div>
            <div class="route-info-item">
                <i class="fas fa-clock"></i> Estimated Time: ${formatTravelTime(routeData.time_min)}
            </div>
            <div class="route-info-close">
                <button id="closeRouteBtn"><i class="fas fa-times"></i></button>
            </div>
        </div>
    `;
    
    document.getElementById('mapContainer').appendChild(routeInfoContainer);
    
    // Add event listener to close button
    document.getElementById('closeRouteBtn').addEventListener('click', () => {
        if (currentRouteLine) {
            window.ticketMap.removeLayer(currentRouteLine);
            currentRouteLine = null;
        }
        routeInfoContainer.remove();
        routeInfoContainer = null;
    });
    
    // Fit the map to show the entire route
    window.ticketMap.fitBounds(currentRouteLine.getBounds(), {
        padding: [50, 50]
    });
}

// Function to show saved route information
function showSavedRouteInfo(routeInfo) {
    // Create route info element if it doesn't exist
    if (!routeInfoContainer) {
        routeInfoContainer = document.createElement('div');
        routeInfoContainer.className = 'route-info-container';
        routeInfoContainer.innerHTML = `
            <div class="route-info-header">Saved Route Information</div>
            <div class="route-info-content">
                <div class="route-info-item">
                    <i class="fas fa-route"></i> Distance: ${routeInfo.distance_km.toFixed(1)} km
                </div>
                <div class="route-info-item">
                    <i class="fas fa-clock"></i> Estimated Time: ${formatTravelTime(routeInfo.time_min)}
                </div>
            </div>
        `;
        
        document.getElementById('mapContainer').appendChild(routeInfoContainer);
    }
}

// Function to format travel time
function formatTravelTime(timeInMinutes) {
    const hours = Math.floor(timeInMinutes / 60);
    const minutes = Math.round(timeInMinutes % 60);
    
    if (hours > 0) {
        return `${hours} h ${minutes} min`;
    } else {
        return `${minutes} min`;
    }
}

// Function to display itinerary
function displayItinerary(trip) {
    const itineraryContainer = document.getElementById('itineraryContainer');
    itineraryContainer.innerHTML = '';
    
    if (trip && trip.itinerary && trip.itinerary.length > 0) {
        // Add a "Show Complete Trip Route" button if we have multiple days with places
        let hasMultiplePlaces = false;
        let allPlaces = [];
        trip.itinerary.forEach(day => {
            if (day.places && day.places.length > 0) {
                allPlaces = allPlaces.concat(day.places);
                if (day.places.length > 1) {
                    hasMultiplePlaces = true;
                }
            }
        });
        
        if (allPlaces.length > 1) {
            const completeRouteDiv = document.createElement('div');
            completeRouteDiv.className = 'complete-route-container';
            
            const completeRouteBtn = document.createElement('button');
            completeRouteBtn.className = 'complete-route-btn';
            completeRouteBtn.innerHTML = '<i class="fas fa-map-marked-alt"></i> Show Complete Trip Route';
            completeRouteBtn.addEventListener('click', () => {
                // Filter places with coordinates
                const placesWithCoords = allPlaces.filter(place => 
                    place.latitude && place.longitude);
                
                if (placesWithCoords.length < 2) {
                    alert('Need at least 2 places with coordinates to show a route');
                    return;
                }
                
                calculateAndDisplayRoute(placesWithCoords);
                
                // Scroll to map
                document.getElementById('mapContainer').scrollIntoView({ behavior: 'smooth' });
            });
            
            completeRouteDiv.appendChild(completeRouteBtn);
            itineraryContainer.appendChild(completeRouteDiv);
        }
        
        trip.itinerary.forEach(day => {
            const dayElement = document.createElement('div');
            dayElement.className = 'day-container';
            
            const dayHeader = document.createElement('div');
            dayHeader.className = 'day-header';
            dayHeader.textContent = `Day ${day.day}`;
            dayElement.appendChild(dayHeader);
            
            // Places section
            const placesHeader = document.createElement('h4');
            placesHeader.className = 'section-header';
            placesHeader.textContent = 'Places to Visit';
            dayElement.appendChild(placesHeader);
            
            const placesList = document.createElement('ul');
            placesList.className = 'day-places';
            
            if (day.places && day.places.length > 0) {
                day.places.forEach(place => {
                    const placeItem = document.createElement('li');
                    placeItem.className = 'place-item';
                    
                    const placeName = document.createElement('span');
                    placeName.className = 'place-name';
                    placeName.textContent = place.name;
                    
                    const placeCategory = document.createElement('span');
                    placeCategory.className = 'place-category';
                    placeCategory.textContent = place.category || 'Attraction';
                    
                    // Add rating stars if available
                    let starRating = '';
                    if (place.rating) {
                        const fullStars = Math.floor(place.rating);
                        const emptyStars = 5 - fullStars;
                        starRating = '★'.repeat(fullStars) + '☆'.repeat(emptyStars);
                    }
                    
                    const ratingElement = document.createElement('div');
                    ratingElement.className = 'place-rating';
                    ratingElement.textContent = starRating;
                    
                    // Add description if available
                    const descElement = document.createElement('div');
                    descElement.className = 'place-description';
                    if (place.description) {
                        descElement.textContent = place.description;
                    }
                    
                    placeItem.appendChild(placeName);
                    placeItem.appendChild(placeCategory);
                    if (starRating) placeItem.appendChild(ratingElement);
                    if (place.description) placeItem.appendChild(descElement);
                    
                    // Add view on map button if coordinates are available
                    if (place.latitude && place.longitude) {
                        const viewOnMapBtn = document.createElement('button');
                        viewOnMapBtn.className = 'view-on-map-btn';
                        viewOnMapBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i> View on Map';
                        viewOnMapBtn.addEventListener('click', () => {
                            // Focus this location on the map
                            if (window.ticketMap) {
                                window.ticketMap.setView([place.latitude, place.longitude], 15);
                                // Find the marker and open its popup
                                mapMarkers.forEach(marker => {
                                    if (marker._latlng.lat === place.latitude && 
                                        marker._latlng.lng === place.longitude) {
                                        marker.openPopup();
                                    }
                                });
                                // Scroll to map
                                document.getElementById('mapContainer').scrollIntoView({ behavior: 'smooth' });
                            }
                        });
                        placeItem.appendChild(viewOnMapBtn);
                    }
                    
                    placesList.appendChild(placeItem);
                });
            } else {
                const noPlaces = document.createElement('li');
                noPlaces.textContent = 'No activities planned for this day.';
                placesList.appendChild(noPlaces);
            }
            
            dayElement.appendChild(placesList);
            
            // Meals section
            if (day.meals && day.meals.length > 0) {
                const mealsHeader = document.createElement('h4');
                mealsHeader.className = 'section-header';
                mealsHeader.textContent = 'Meals';
                dayElement.appendChild(mealsHeader);
                
                const mealsList = document.createElement('ul');
                mealsList.className = 'day-meals';
                
                day.meals.forEach(meal => {
                    const mealItem = document.createElement('li');
                    mealItem.className = 'meal-item';
                    
                    const mealType = document.createElement('span');
                    mealType.className = 'meal-type';
                    mealType.textContent = meal.type;
                    
                    const mealSuggestion = document.createElement('span');
                    mealSuggestion.className = 'meal-suggestion';
                    mealSuggestion.textContent = meal.suggestion;
                    
                    mealItem.appendChild(mealType);
                    mealItem.appendChild(document.createElement('br'));
                    mealItem.appendChild(mealSuggestion);
                    mealsList.appendChild(mealItem);
                });
                
                dayElement.appendChild(mealsList);
            }
            
            // Transportation section
            if (day.transportation) {
                const transportHeader = document.createElement('h4');
                transportHeader.className = 'section-header';
                transportHeader.textContent = 'Transportation';
                dayElement.appendChild(transportHeader);
                
                const transportInfo = document.createElement('p');
                transportInfo.className = 'transportation-info';
                transportInfo.textContent = day.transportation;
                dayElement.appendChild(transportInfo);
            }
            
            // Estimated cost section
            if (day.estimated_cost) {
                const costHeader = document.createElement('h4');
                costHeader.className = 'section-header';
                costHeader.textContent = 'Estimated Cost';
                dayElement.appendChild(costHeader);
                
                const costInfo = document.createElement('p');
                costInfo.className = 'cost-info';
                
                // Remove any existing currency symbols and ensure peso symbol is used
                let costText = day.estimated_cost.toString().replace(/[$₱]/g, '');
                costInfo.textContent = costText; // Without currency symbol - will be added by CSS
                
                dayElement.appendChild(costInfo);
            }
            
            // Only add route button if there are multiple places with coordinates
            const placesWithCoords = day.places ? day.places.filter(place => 
                place.latitude && place.longitude) : [];
            
            if (placesWithCoords.length >= 2) {
                const routeButton = document.createElement('button');
                routeButton.className = 'view-route-btn';
                routeButton.innerHTML = '<i class="fas fa-route"></i> View Day Route on Map';
                routeButton.dataset.day = day.day;
                
                // Add click event to show this day's route on the map
                routeButton.addEventListener('click', () => {
                    calculateAndDisplayRoute(placesWithCoords);
                    
                    // Scroll to map
                    document.getElementById('mapContainer').scrollIntoView({ behavior: 'smooth' });
                });
                
                dayElement.appendChild(routeButton);
            }
            
            itineraryContainer.appendChild(dayElement);
        });
    } else if (trip.selected_destinations && trip.selected_destinations.length > 0) {
        // If no itinerary but we have selected destinations, show those
        const dayElement = document.createElement('div');
        dayElement.className = 'day-container';
        
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        dayHeader.textContent = 'Selected Destinations';
        dayElement.appendChild(dayHeader);
        
        const placesHeader = document.createElement('h4');
        placesHeader.className = 'section-header';
        placesHeader.textContent = 'Places to Visit';
        dayElement.appendChild(placesHeader);
        
        const placesList = document.createElement('ul');
        placesList.className = 'day-places';
        
        const placesWithCoords = trip.selected_destinations.filter(place => 
            place.latitude && place.longitude);
        
        trip.selected_destinations.forEach(place => {
            const placeItem = document.createElement('li');
            placeItem.className = 'place-item';
            
            const placeName = document.createElement('span');
            placeName.className = 'place-name';
            placeName.textContent = place.name;
            
            const placeCategory = document.createElement('span');
            placeCategory.className = 'place-category';
            placeCategory.textContent = place.category || 'Attraction';
            
            const descElement = document.createElement('div');
            descElement.className = 'place-description';
            if (place.description) {
                descElement.textContent = place.description;
            }
            
            placeItem.appendChild(placeName);
            placeItem.appendChild(placeCategory);
            if (place.description) placeItem.appendChild(descElement);
            
            // Add view on map button if coordinates are available
            if (place.latitude && place.longitude) {
                const viewOnMapBtn = document.createElement('button');
                viewOnMapBtn.className = 'view-on-map-btn';
                viewOnMapBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i> View on Map';
                viewOnMapBtn.addEventListener('click', () => {
                    // Focus this location on the map
                    if (window.ticketMap) {
                        window.ticketMap.setView([place.latitude, place.longitude], 15);
                        // Find the marker and open its popup
                        mapMarkers.forEach(marker => {
                            if (marker._latlng.lat === place.latitude && 
                                marker._latlng.lng === place.longitude) {
                                marker.openPopup();
                            }
                        });
                        // Scroll to map
                        document.getElementById('mapContainer').scrollIntoView({ behavior: 'smooth' });
                    }
                });
                placeItem.appendChild(viewOnMapBtn);
            }
            
            placesList.appendChild(placeItem);
        });
        
        dayElement.appendChild(placesList);
        
        // Add route button if we have multiple destinations with coordinates
        if (placesWithCoords.length >= 2) {
            const routeButton = document.createElement('button');
            routeButton.className = 'view-route-btn';
            routeButton.innerHTML = '<i class="fas fa-route"></i> View Route on Map';
            
            // Add click event to calculate and show route
            routeButton.addEventListener('click', () => {
                calculateAndDisplayRoute(placesWithCoords);
                
                // Scroll to map
                document.getElementById('mapContainer').scrollIntoView({ behavior: 'smooth' });
            });
            
            dayElement.appendChild(routeButton);
        }
        
        itineraryContainer.appendChild(dayElement);
    } else {
        itineraryContainer.innerHTML = '<p>No itinerary information available.</p>';
    }
}

// Function to geocode destination name and center map
async function geocodeDestination(destinationName) {
    if (!destinationName) return;
    
    try {
        // Use Nominatim for geocoding
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destinationName)}`);
        const data = await response.json();
        
        if (data && data.length > 0) {
            const location = data[0];
            const lat = parseFloat(location.lat);
            const lon = parseFloat(location.lon);
            
            // Add marker for the destination
            const marker = L.marker([lat, lon])
                .addTo(window.ticketMap)
                .bindPopup(`<b>${destinationName}</b><br>Your destination`);
            
            mapMarkers.push(marker);
            
            // Set view to this location
            window.ticketMap.setView([lat, lon], 10);
        }
    } catch (error) {
        console.error('Error geocoding destination:', error);
    }
}

// Function to format currency
window.formatPesoCurrency = function(amount) {
    // If amount is null, undefined or empty string, return ₱0
    if (!amount) return '₱0';
    
    // Check if we have a numeric budget value
    if (typeof amount === 'number') {
        return '₱' + amount.toLocaleString();
    }
    
    // Remove existing currency symbols
    let cleanAmount = amount.toString().replace(/[$₱]/g, '');
    
    // Try to parse as number for proper formatting
    const numericValue = parseFloat(cleanAmount.replace(/,/g, ''));
    if (!isNaN(numericValue)) {
        return '₱' + numericValue.toLocaleString();
    }
    
    // If parsing fails, just add peso sign to cleaned amount
    return '₱' + cleanAmount;
};

// Add event listener for list button
listButton.addEventListener('click', async () => {
    const email = emailListInput.value.trim();
    
    // Clear previous messages and results
    listErrorMessage.style.display = 'none';
    ticketList.style.display = 'none';
    ticketDetails.style.display = 'none';
    noResults.style.display = 'none';
    
    if (!email) {
        listErrorMessage.textContent = 'Please enter your email address.';
        listErrorMessage.style.display = 'block';
        return;
    }
    
    // Show loading state
    ticketCards.innerHTML = `
        <div class="loading-tickets">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading your tickets...</p>
        </div>
    `;
    ticketList.style.display = 'block';
    
    try {
        const response = await fetch(`${API_URL}/tickets?email=${encodeURIComponent(email)}`);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch tickets');
        }
        
        const data = await response.json();
        
        if (!data.tickets || data.tickets.length === 0) {
            ticketCards.innerHTML = `
                <div class="no-tickets">
                    <i class="fas fa-ticket-alt"></i>
                    <p>No tickets found for this email address.</p>
                </div>
            `;
            return;
        }
        
        // Display the tickets
        displayTicketList(data.tickets);
        
    } catch (error) {
        console.error('Error fetching tickets:', error);
        listErrorMessage.textContent = error.message || 'An error occurred while fetching your tickets. Please try again.';
        listErrorMessage.style.display = 'block';
        ticketList.style.display = 'none';
    }
});

// Function to display list of tickets
function displayTicketList(tickets) {
    ticketCards.innerHTML = '';
    
    tickets.forEach(ticket => {
        const ticketCard = document.createElement('div');
        ticketCard.className = 'ticket-card';
        
        // Format the created date if available
        let createdDate = '';
        if (ticket.created_at) {
            const date = new Date(ticket.created_at);
            createdDate = date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        }
        
        ticketCard.innerHTML = `
            <div class="ticket-card-header">
                <div class="ticket-card-id">${ticket.ticket_id}</div>
                <div class="ticket-card-status status-${ticket.status || 'active'}">${ticket.status || 'Active'}</div>
            </div>
            <div class="ticket-card-content">
                <div class="ticket-card-destination">
                    <i class="fas fa-map-marker-alt"></i> ${ticket.destination || 'Not specified'}
                </div>
                <div class="ticket-card-dates">
                    <i class="fas fa-calendar"></i> ${ticket.travel_dates || 'Not specified'}
                </div>
                <div class="ticket-card-travelers">
                    <i class="fas fa-users"></i> ${ticket.trip?.travelers || 1} Traveler(s)
                </div>
                <div class="ticket-card-budget">
                    <i class="fas fa-wallet"></i> ${formatPesoCurrency(ticket.trip?.budget || 0)}
                </div>
                ${createdDate ? `<div class="created-date">Created: ${createdDate}</div>` : ''}
            </div>
            <div class="ticket-card-actions">
                <button class="view-details-btn" data-ticket-id="${ticket.ticket_id}">
                    <i class="fas fa-eye"></i> View Details
                </button>
            </div>
        `;
        
        // Add click event for view details button
        const viewDetailsBtn = ticketCard.querySelector('.view-details-btn');
        viewDetailsBtn.addEventListener('click', () => {
            // Set the ticket ID and email in the search form
            ticketIdInput.value = ticket.ticket_id;
            emailInput.value = emailListInput.value;
            // Trigger the search
            searchButton.click();
        });
        
        ticketCards.appendChild(ticketCard);
    });
} 