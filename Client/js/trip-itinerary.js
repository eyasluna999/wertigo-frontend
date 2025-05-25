// Trip itinerary display functions for WerTigo Trip Planner

// Function to display the trip itinerary
function displayTripItinerary(trip) {
  // Remove any existing trip itineraries or ticket forms to prevent duplication
  const existingElements = document.querySelectorAll('.trip-itinerary, .ticket-creation');
  existingElements.forEach(element => {
    const messageContainer = element.closest('.message');
    if (messageContainer) {
      messageContainer.remove();
    }
  });
  
  // Get the destination name - use the first selected destination's city if available
  let destinationName = trip.destination;
  if (trip.selected_destinations && trip.selected_destinations.length > 0 && trip.selected_destinations[0].city) {
    destinationName = trip.selected_destinations[0].city;
  }
  
  // Calculate total budget
  let totalBudget = 0;
  const selectedDestinations = trip.selected_destinations || [];
  let allPlaces = [];
  
  // Collect all places from the itinerary if available
  if (trip.itinerary && trip.itinerary.length > 0) {
    trip.itinerary.forEach(day => {
      if (day.places && day.places.length > 0) {
        allPlaces = allPlaces.concat(day.places);
      }
    });
  }
  
  // If no places from itinerary, use selected destinations
  const places = allPlaces.length > 0 ? allPlaces : selectedDestinations;
  
  // Calculate budget
  places.forEach(place => {
    if (place.budget) {
      // Try to extract numeric value from budget
      let budgetValue = 0;
      if (typeof place.budget === 'number') {
        budgetValue = place.budget;
      } else if (typeof place.budget === 'string') {
        const matches = place.budget.match(/\d+/g);
        if (matches && matches.length > 0) {
          budgetValue = parseInt(matches[0]);
        } else {
          // Assign default values based on budget category
          if (place.budget.toLowerCase().includes('low')) {
            budgetValue = 1000;
          } else if (place.budget.toLowerCase().includes('high')) {
            budgetValue = 5000;
          } else {
            budgetValue = 2500; // medium budget
          }
        }
      }
      totalBudget += budgetValue;
    }
  });
  
  // Format the budget
  const formattedBudget = `₱${totalBudget.toLocaleString()}`;
  
  let itineraryHtml = `
    <div class="trip-itinerary">
      <h3>Your ${destinationName} Travel Plan</h3>
      <div class="destination-list">
  `;
  
  // List all places
  places.forEach(place => {
    // Generate star rating HTML
    const starRating = getStarRating(place.rating);
    
    // Location display
    const location = place.province ? `${place.city}, ${place.province}` : (place.city || destinationName);
    
    itineraryHtml += `
      <div class="destination-card">
        <h4>${place.name}</h4>
        <div class="destination-info">
          <div class="destination-category">${place.category || 'Attraction'}</div>
          <div class="rating">${starRating}</div>
        </div>
        <div class="destination-location">
          <i class="fas fa-map-marker-alt"></i> ${location}
        </div>
        <p class="destination-description">${place.description ? place.description.substring(0, 120) + '...' : 'No description available'}</p>
    `;
    
    // Add coordinates button if available
    if (place.latitude && place.longitude) {
      itineraryHtml += `
        <button class="view-map-btn" data-lat="${place.latitude}" data-lng="${place.longitude}" data-name="${place.name}">
          <i class="fas fa-map"></i> View on Map
        </button>
      `;
    }
    
    itineraryHtml += `</div>`;
  });
  
  // Add summary and save button
  itineraryHtml += `
      </div>
      <div class="trip-summary">
        <div class="summary-item">
          <span class="summary-label">Destinations:</span>
          <span class="summary-value">${places.length}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Total Budget:</span>
          <span class="summary-value">${formattedBudget}</span>
        </div>
      </div>
      <div class="ticket-creation">
        <h4 style="color: #000000 !important; font-weight: bold;">Save Your Itinerary</h4>
        <p style="color: #000000 !important;">Save this itinerary and track it in the Ticket Tracking page.</p>
        <div class="ticket-input-container">
          <input type="email" id="userEmail" placeholder="Enter your email address" required />
          <button class="save-trip-btn" id="saveTripBtn">Save Itinerary</button>
        </div>
        <p class="tracking-note" style="color: #000000 !important;">Your itinerary will be saved and a copy will be sent to your email. You can also access your saved itineraries in the <a href="tracker.html">Ticket Tracker</a> page.</p>
        <div id="ticketResult" class="ticket-result" style="display: none;"></div>
      </div>
    </div>
  `;
  
  addMessage(itineraryHtml, false);
  
  // Add event listeners
  setTimeout(() => {
    // Add event listeners for view-map buttons
    document.querySelectorAll('.view-map-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const lat = parseFloat(btn.dataset.lat);
        const lng = parseFloat(btn.dataset.lng);
        const name = btn.dataset.name;
        
        // Clear existing routes if available
        if (typeof clearRoute === 'function') {
          clearRoute();
        }
        
        // Show on map
        if (typeof window.showOnMap === 'function') {
          window.showOnMap(lat, lng, name);
        } else {
          // Fallback if showOnMap isn't available
          if (window.map) {
            // Clear existing markers if any
            if (window.currentRouteMarkers) {
              window.currentRouteMarkers.forEach(marker => marker.remove());
            } else {
              window.currentRouteMarkers = [];
            }
            
            // Add marker
            const marker = L.marker([lat, lng])
              .addTo(window.map)
              .bindPopup(`<b>${name}</b>`)
              .openPopup();
            
            window.currentRouteMarkers.push(marker);
            window.map.setView([lat, lng], 15);
          }
        }
        
        // Scroll to map
        const mapElement = document.getElementById('map');
        if (mapElement) {
          mapElement.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
    
    // Add event listener to save button
    const saveTripBtn = document.getElementById('saveTripBtn');
    if (saveTripBtn) {
      saveTripBtn.addEventListener('click', async () => {
        // Disable the button first to prevent multiple submissions
        saveTripBtn.disabled = true;
        saveTripBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        
        // Remove any existing ticket result elements to prevent duplication
        const existingTicketResults = document.querySelectorAll('.ticket-success, .ticket-error');
        existingTicketResults.forEach(result => {
          result.remove();
        });
        
        // Get email input
        const emailInput = document.getElementById('userEmail');
        const ticketResult = document.getElementById('ticketResult');
        
        if (!emailInput || !ticketResult) return;
        
        const email = emailInput.value.trim();
        if (!email || !email.includes('@')) {
          ticketResult.style.display = 'block';
          ticketResult.innerHTML = '<p class="error-message">Please enter a valid email address</p>';
          // Re-enable the button if validation fails
          saveTripBtn.disabled = false;
          saveTripBtn.innerHTML = 'Save Itinerary';
          return;
        }
        
        // Show loading
        ticketResult.style.display = 'block';
        ticketResult.innerHTML = '<p>Saving your itinerary...</p>';
        
        try {
          // Ensure we have all destinations - collect from multiple sources
          let allDestinations = [];
          
          // First, try to get from trip.selected_destinations
          if (trip.selected_destinations && trip.selected_destinations.length > 0) {
            allDestinations = [...trip.selected_destinations];
          }
          
          // Then, collect from itinerary places if available
          if (trip.itinerary && trip.itinerary.length > 0) {
            trip.itinerary.forEach(day => {
              if (day.places && day.places.length > 0) {
                day.places.forEach(place => {
                  // Check if this place is already in allDestinations
                  const exists = allDestinations.some(dest => 
                    dest.name === place.name || dest.id === place.id
                  );
                  if (!exists) {
                    allDestinations.push(place);
                  }
                });
              }
            });
          }
          
          // Also check global tripData if available
          if (window.tripData && window.tripData.selected_destinations && window.tripData.selected_destinations.length > 0) {
            window.tripData.selected_destinations.forEach(dest => {
              const exists = allDestinations.some(d => 
                d.name === dest.name || d.id === dest.id
              );
              if (!exists) {
                allDestinations.push(dest);
              }
            });
          }
          
          // Get destinations from planner UI as well
          const destinationsList = document.getElementById('destinations-list');
          if (destinationsList && destinationsList.children.length > 0) {
            Array.from(destinationsList.children).forEach((item, index) => {
              const nameElement = item.querySelector('.destination-item-name');
              const categoryElement = item.querySelector('.destination-item-category');
              const locationElement = item.querySelector('.destination-item-location');
              const budgetElement = item.querySelector('.destination-item-budget');
              
              if (nameElement) {
                const plannerDest = {
                  id: item.dataset.id || Date.now().toString() + index,
                  name: nameElement.textContent,
                  category: categoryElement ? categoryElement.textContent : 'Attraction',
                  city: locationElement ? locationElement.textContent : trip.destination,
                  description: item.dataset.description || `A wonderful place to visit in ${trip.destination}`,
                  budget: budgetElement ? budgetElement.textContent.replace('Budget: ', '') : 'mid-range',
                  latitude: parseFloat(item.dataset.lat) || null,
                  longitude: parseFloat(item.dataset.lng) || null
                };
                
                // Check if this destination is already in allDestinations
                const exists = allDestinations.some(dest => 
                  dest.name === plannerDest.name || dest.id === plannerDest.id
                );
                if (!exists) {
                  allDestinations.push(plannerDest);
                }
              }
            });
          }
          
          console.log(`Collected ${allDestinations.length} total destinations for saving`);
          
          // Calculate comprehensive budget
          let totalBudgetNumeric = 0;
          allDestinations.forEach(dest => {
            if (dest.budget) {
              let budgetValue = 0;
              if (typeof dest.budget === 'number') {
                budgetValue = dest.budget;
              } else if (typeof dest.budget === 'string') {
                const matches = dest.budget.match(/\d+/g);
                if (matches && matches.length > 0) {
                  budgetValue = parseInt(matches[0]);
                } else {
                  if (dest.budget.toLowerCase().includes('low')) {
                    budgetValue = 1000;
                  } else if (dest.budget.toLowerCase().includes('high')) {
                    budgetValue = 5000;
                  } else {
                    budgetValue = 2500;
                  }
                }
              }
              totalBudgetNumeric += budgetValue;
            }
          });
          
          // Prepare comprehensive trip data for saving
          const tripToSave = {
            destination: trip.destination,
            travelers: trip.travelers || 1,
            budget: `₱${totalBudgetNumeric.toLocaleString()}`,
            budget_numeric: totalBudgetNumeric,
            selected_destinations: allDestinations, // Use all collected destinations
            itinerary: trip.itinerary || [],
            travel_dates: trip.travel_dates || null,
            trip_summary: {
              total_destinations: allDestinations.length,
              main_categories: [...new Set(allDestinations.map(d => d.category))],
              estimated_duration: Math.ceil(allDestinations.length / 3) + ' days'
            }
          };
          
          // Add route info if available
          if (window.tripData && window.tripData.route_info) {
            tripToSave.route_info = window.tripData.route_info;
          }
          
          console.log(`Sending trip data with ${tripToSave.selected_destinations.length} destinations to server`);
          
          // Generate unique request ID to prevent duplicates
          const uniqueRequestId = `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Create ticket with API
          const response = await fetch(getApiUrl('/create_ticket'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'X-Request-ID': uniqueRequestId
            },
            body: JSON.stringify({
              email: email,
              itinerary: tripToSave,
              request_id: uniqueRequestId
            }),
          });
          
          const data = await response.json();
          
          if (response.ok && data.ticket_id) {
            // Show success message
            ticketResult.innerHTML = `
              <div class="ticket-success">
                <i class="fas fa-check-circle"></i>
                <h4 style="color: #000000 !important; font-weight: bold;">Travel Plan Saved!</h4>
                <p style="color: #000000 !important;">Your travel plan has been sent to <strong>${email}</strong></p>
                <p style="color: #000000 !important;">Ticket ID: <strong>${data.ticket_id}</strong></p>
                <p style="color: #000000 !important;">Saved ${allDestinations.length} destinations successfully!</p>
                <p style="color: #000000 !important;">You can track your travel plan with this ticket ID in the Ticket Tracker page.</p>
                <a href="tracker.html?ticket=${data.ticket_id}" class="tracker-link" target="_blank">
                  <i class="fas fa-external-link-alt"></i> Go to Ticket Tracker
                </a>
              </div>
            `;
            
            // Hide the form
            emailInput.style.display = 'none';
            saveTripBtn.style.display = 'none';
          } else {
            // Show error
            ticketResult.innerHTML = `
              <div class="ticket-error">
                <i class="fas fa-exclamation-circle"></i>
                <p>There was an issue creating your ticket.</p>
                <p>${data.error || 'Please try again later.'}</p>
              </div>
            `;
            
            // Re-enable button
            saveTripBtn.disabled = false;
            saveTripBtn.textContent = 'Save Itinerary';
          }
        } catch (error) {
          console.error('Error saving itinerary:', error);
          
          // Show error
          ticketResult.innerHTML = `
            <div class="ticket-error">
              <i class="fas fa-exclamation-circle"></i>
              <p>Error: ${error.message || 'Could not connect to the server.'}</p>
              <p>Please try again later.</p>
            </div>
          `;
          
          // Re-enable button
          saveTripBtn.disabled = false;
          saveTripBtn.textContent = 'Save Itinerary';
        }
      });
    }
  }, 100);
}

// Helper function to generate star rating HTML
function getStarRating(rating) {
  // Convert rating to number between 1-5
  const numRating = typeof rating === 'number' ? rating : 4;
  const stars = Math.min(5, Math.max(1, Math.round(numRating)));
  
  // Generate star icons
  let starsHtml = '';
  for (let i = 0; i < 5; i++) {
    if (i < stars) {
      // Full star
      starsHtml += '<i class="fas fa-star"></i>'; 
    } else {
      // Empty star
      starsHtml += '<i class="far fa-star"></i>';
    }
  }
  
  return starsHtml;
} 