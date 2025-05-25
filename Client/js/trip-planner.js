// Trip planner functions for WerTigo Trip Planner

// Trip creation flow state
let tripCreationState = {
  active: false,
  currentStep: 0,
  steps: [
    { id: 'destination', question: "Where would you like to go?" }
  ]
};

// Variables to store trip information
let tripData = {
  destination: '',
  travelers: 1,
  budget: '',
  interests: [],
  selected_destinations: [],
  route_info: null,
  travel_days: 1,
  daily_schedule: [],
  auto_routing_enabled: true
};

// Auto-routing configuration
const AUTO_ROUTE_CONFIG = {
  max_destinations_per_day: 3,
  travel_time_threshold: 120, // minutes - if total travel time > 2 hours, add extra day
  activity_time_per_destination: 90, // minutes per destination
  daily_travel_limit: 8, // hours per day
  rest_time_between_destinations: 30 // minutes buffer between destinations
};

// Function to handle creation of a new trip
function handleCreateTrip() {
  addMessage("I'd love to help you create a new trip! Let's start planning your journey.", false);
  
  // Start the trip creation flow
  startTripCreationFlow();
}

// Make this function available globally
window.startTripCreationFlow = startTripCreationFlow;

// Function to start the trip creation flow
function startTripCreationFlow() {
  // Reset trip creation state
  tripCreationState.active = true;
  tripCreationState.currentStep = 0;
  
  // Reset trip data
  tripData = {
    destination: '',
    travelers: 1,
    budget: '',
    interests: [],
    selected_destinations: [],
    route_info: null,
    travel_days: 1,
    daily_schedule: [],
    auto_routing_enabled: true
  };
  
  // Ask the first question
  setTimeout(() => {
    askNextQuestion();
  }, 1000);
}

// Function to ask the next question in the flow
function askNextQuestion() {
  if (tripCreationState.currentStep < tripCreationState.steps.length) {
    const currentStep = tripCreationState.steps[tripCreationState.currentStep];
    
    // For destination step, add extra instructions
    if (currentStep.id === 'destination') {
      addMessage(currentStep.question + "\n\n Please type your destination in the chat box below (e.g., \"Imus\", \"Boracay\", \"Manila\").", false);
    } else {
      addMessage(currentStep.question, false);
    }
  } else {
    // All questions have been asked, show summary
    showTripSummary();
  }
}

// Function to handle user input during trip creation
function handleChatInput(userMessage) {
  // Only process if trip creation is active
  if (!tripCreationState.active) {
    return false;
  }
  
  const currentStep = tripCreationState.steps[tripCreationState.currentStep];
  
  // Process the user's answer based on the current step
  switch (currentStep.id) {
    case 'destination':
      tripData.destination = userMessage;
      addMessage(`Great! Let me find some recommendations in ${userMessage} for you.`, false);
      
      // Show loading message
      addMessage("Searching for recommendations...", false);
      
      // Call the recommendation API to get destinations
              fetch(getApiUrl('/recommend'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: userMessage,
          session_id: window.authState ? window.authState.sessionId : null
        })
      })
      .then(response => response.json())
      .then(data => {
        if (data.recommendations && data.recommendations.length > 0) {
          // Store recommendations globally
          window.currentRecommendations = data.recommendations;
          
          // Display recommendations with selection buttons
          displayLocationRecommendations(data.recommendations, data.detected_city);
        } else {
          addMessage(`I couldn't find any recommendations for ${userMessage}. Please try another location.`, false);
          // Don't advance to next step, let user try again
          return;
        }
      })
      .catch(error => {
        console.error('Error getting recommendations:', error);
        addMessage("I had trouble finding recommendations. Please try again.", false);
        // Don't advance to next step, let user try again
        return;
      });
      break;
  }
  
  // Move to the next step
  tripCreationState.currentStep++;
  
  // Return true to indicate that the input was handled
  return true;
}

// New function to display location recommendations
function displayLocationRecommendations(recommendations, cityName) {
  let recommendationsHtml = `
    <div class="location-recommendations">
      <h3>Recommended Places in ${cityName || 'this destination'}</h3>
      <p>Select 1 or more destinations to add to your trip planner:</p>
      <div class="recommendation-list">
  `;
  
  recommendations.forEach((rec, index) => {
    // Generate star rating HTML
    const stars = getStarRating(rec.rating);
    
    // Format budget for display
    const budgetDisplay = rec.budget ? `<div class="recommendation-budget">
      <i class="fas fa-money-bill-wave"></i> Budget: ₱${rec.budget}
    </div>` : '';
    
    recommendationsHtml += `
      <div class="recommendation-item" data-index="${index}">
        <div class="recommendation-header">
          <h4>${rec.name}</h4>
          <div class="recommendation-rating">${stars}</div>
        </div>
        <div class="recommendation-location">
          <i class="fas fa-map-marker-alt"></i> ${rec.city}${rec.province ? ', ' + rec.province : ''}
        </div>
        <div class="recommendation-category">${rec.category}</div>
        <p class="recommendation-description">${rec.description.substring(0, 120)}${rec.description.length > 120 ? '...' : ''}</p>
        ${budgetDisplay}
        <div class="recommendation-actions">
          <button class="add-to-planner-btn" data-index="${index}">
            <i class="fas fa-plus-circle"></i> Add to Planner
          </button>
        </div>
      </div>
    `;
  });
  
  recommendationsHtml += `
      </div>
      <div class="planner-actions">
        <button id="view-planner-btn" class="view-planner-btn">
          <i class="fas fa-clipboard-list"></i> View Trip Planner
        </button>
        <button id="search-more-btn" class="search-more-btn">
          <i class="fas fa-search"></i> Search More Destinations
        </button>
      </div>
    </div>
  `;
  
  addMessage(recommendationsHtml, false);
  
  // Add event listeners
  setTimeout(() => {
    // Add to planner buttons
    document.querySelectorAll('.add-to-planner-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.dataset.index);
        if (window.currentRecommendations && index >= 0 && index < window.currentRecommendations.length) {
          addDestinationToTrip(window.currentRecommendations[index]);
          
          // Change button to "Added" and disable
          btn.innerHTML = '<i class="fas fa-check"></i> Added';
          btn.disabled = true;
          btn.classList.add('added');
        }
      });
    });
    
    // View planner button
    const viewPlannerBtn = document.getElementById('view-planner-btn');
    if (viewPlannerBtn) {
      viewPlannerBtn.addEventListener('click', () => {
        if (tripData.selected_destinations.length > 0) {
          showTripPlanner();
        } else {
          addMessage("Please add at least one destination to your planner first.", false);
        }
      });
    }
    
    // Search more button
    const searchMoreBtn = document.getElementById('search-more-btn');
    if (searchMoreBtn) {
      searchMoreBtn.addEventListener('click', () => {
        addMessage("What other destination would you like to search for?", false);
        tripCreationState.currentStep = 0;
      });
    }
  }, 100);
}

// Enhanced function to add a destination to the trip with auto-routing
function addDestinationToTrip(destination) {
  // Check if this destination is already in the selected destinations
  const exists = tripData.selected_destinations.some(d => d.id === destination.id || d.name === destination.name);
  
  if (exists) {
    // If it's a duplicate, just show a different message
    addMessage(`<div class="destination-added"><i class="fas fa-info-circle"></i> <strong>${destination.name}</strong> is already in your trip planner.</div>`, false);
    return; // Exit the function early
  }
  
  // Add to selected destinations
  tripData.selected_destinations.push(destination);
  
  // Show confirmation
  addMessage(`<div class="destination-added"><i class="fas fa-plus-circle"></i> Added <strong>${destination.name}</strong> to your trip planner.</div>`, false);
  
  // Add to planner UI
  if (typeof window.addToPlanner === 'function') {
    window.addToPlanner(destination, true); // Pass true to skip duplicate confirmation
  }
  
  // Show on map if coordinates are available
  if (destination.latitude && destination.longitude && typeof window.showOnMap === 'function') {
    window.showOnMap(destination.latitude, destination.longitude, destination.name);
  }
  
  // Update budget calculation
  calculateTotalBudget();
  
  // Update the physical trip planner UI
  updateTripSummary();
  
  // Auto-route calculation if enabled and we have multiple destinations
  if (tripData.auto_routing_enabled && tripData.selected_destinations.length >= 2) {
    setTimeout(() => {
      calculateAutoRoute();
    }, 1000);
  }
  
  // Calculate travel days automatically
  calculateTravelDays();
  
  // Generate daily schedule
  generateDailySchedule();
  
  // Show updated schedule in planner UI
  updatePlannerScheduleDisplay();
}

// Function to calculate auto route between all destinations
async function calculateAutoRoute() {
  const destinations = tripData.selected_destinations.filter(dest => 
    dest.latitude && dest.longitude
  );
  
  if (destinations.length < 2) {
    console.log('Need at least 2 destinations with coordinates for auto-routing');
    return;
  }
  
  console.log(`Auto-calculating route for ${destinations.length} destinations`);
  
  try {
    // Create route points array - optimize order for shortest route
    const routePoints = destinations.map(dest => ({
      name: dest.name,
      lat: dest.latitude,
      lng: dest.longitude
    }));
    
    // For now, use the order they were added. In future, could implement TSP optimization
            const response = await fetch(getApiUrl('/route'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        points: routePoints.map(p => [p.lng, p.lat]),
        names: routePoints.map(p => p.name)
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.route) {
        // Store route information
        tripData.route_info = {
          distance_km: data.route.distance_km,
          time_min: data.route.time_min,
          geometry: data.route.geometry,
          waypoints: routePoints
        };
        
        console.log(`Auto-route calculated: ${data.route.distance_km.toFixed(1)} km, ${Math.round(data.route.time_min)} minutes`);
        
        // Display route on map if available
        if (typeof window.displayRouteOnMap === 'function') {
          window.displayRouteOnMap(data.route, routePoints);
        }
        
        // Update travel days based on route
        calculateTravelDays();
        
        // Update daily schedule
        generateDailySchedule();
        
        // Show route summary in chat
        showRouteInChat(data.route, routePoints);
      }
    }
  } catch (error) {
    console.error('Error calculating auto route:', error);
  }
}

// Function to show route summary in chat
function showRouteInChat(route, waypoints) {
  const hours = Math.floor(route.time_min / 60);
  const mins = Math.round(route.time_min % 60);
  const timeString = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  
  const routeHtml = `
    <div class="auto-route-summary">
      <h4><i class="fas fa-route"></i> Auto-Route Calculated</h4>
      <div class="route-details">
        <div class="route-stat">
          <i class="fas fa-road"></i> Distance: <strong>${route.distance_km.toFixed(1)} km</strong>
        </div>
        <div class="route-stat">
          <i class="fas fa-clock"></i> Travel Time: <strong>${timeString}</strong>
        </div>
        <div class="route-stat">
          <i class="fas fa-calendar"></i> Recommended Days: <strong>${tripData.travel_days}</strong>
        </div>
      </div>
      <div class="route-waypoints">
        <h5>Route Order:</h5>
        <ol>
          ${waypoints.map(point => `<li>${point.name}</li>`).join('')}
        </ol>
      </div>
    </div>
  `;
  
  addMessage(routeHtml, false);
}

// Function to calculate optimal travel days based on destinations and route
function calculateTravelDays() {
  const numDestinations = tripData.selected_destinations.length;
  
  if (numDestinations === 0) {
    tripData.travel_days = 1;
    return;
  }
  
  // Base calculation: destinations per day
  let baseDays = Math.ceil(numDestinations / AUTO_ROUTE_CONFIG.max_destinations_per_day);
  
  // Factor in travel time if route is available
  if (tripData.route_info) {
    const totalTravelTimeHours = tripData.route_info.time_min / 60;
    
    // If total travel time exceeds daily limit, add extra days
    if (totalTravelTimeHours > AUTO_ROUTE_CONFIG.daily_travel_limit) {
      const extraDays = Math.ceil(totalTravelTimeHours / AUTO_ROUTE_CONFIG.daily_travel_limit) - 1;
      baseDays += extraDays;
    }
    
    // Consider travel time per destination
    const avgTravelTimeBetweenDestinations = tripData.route_info.time_min / Math.max(1, numDestinations - 1);
    if (avgTravelTimeBetweenDestinations > AUTO_ROUTE_CONFIG.travel_time_threshold) {
      baseDays = Math.max(baseDays, Math.ceil(numDestinations / 2)); // Reduce destinations per day
    }
  }
  
  // Factor in destination categories (some need more time)
  const timeIntensiveCategories = ['museum', 'theme park', 'zoo', 'resort', 'beach'];
  const timeIntensiveCount = tripData.selected_destinations.filter(dest => 
    timeIntensiveCategories.some(category => 
      dest.category.toLowerCase().includes(category)
    )
  ).length;
  
  if (timeIntensiveCount > 0) {
    const extraTimeRatio = timeIntensiveCount / numDestinations;
    if (extraTimeRatio > 0.5) {
      baseDays = Math.max(baseDays, Math.ceil(numDestinations / 2));
    }
  }
  
  // Minimum 1 day, maximum reasonable limit
  tripData.travel_days = Math.max(1, Math.min(baseDays, 14));
  
  console.log(`Calculated ${tripData.travel_days} days for ${numDestinations} destinations`);
}

// Function to generate daily schedule
function generateDailySchedule() {
  const destinations = [...tripData.selected_destinations];
  const numDays = tripData.travel_days;
  
  if (destinations.length === 0) {
    tripData.daily_schedule = [];
    return;
  }
  
  // Clear existing schedule
  tripData.daily_schedule = [];
  
  // Simple distribution: spread destinations across days
  const destinationsPerDay = Math.ceil(destinations.length / numDays);
  
  for (let day = 1; day <= numDays; day++) {
    const startIndex = (day - 1) * destinationsPerDay;
    const endIndex = Math.min(startIndex + destinationsPerDay, destinations.length);
    const dayDestinations = destinations.slice(startIndex, endIndex);
    
    if (dayDestinations.length > 0) {
      // Calculate day timing
      let currentTime = 9 * 60; // Start at 9 AM (in minutes)
      const schedule = [];
      
      dayDestinations.forEach((dest, index) => {
        // Add travel time if not the first destination
        if (index > 0) {
          currentTime += AUTO_ROUTE_CONFIG.rest_time_between_destinations;
          
          // Add estimated travel time between destinations
          if (tripData.route_info) {
            const avgTravelTime = tripData.route_info.time_min / Math.max(1, destinations.length - 1);
            currentTime += avgTravelTime;
          } else {
            currentTime += 30; // Default 30 minutes travel time
          }
        }
        
        const startTime = formatTime(currentTime);
        currentTime += AUTO_ROUTE_CONFIG.activity_time_per_destination;
        const endTime = formatTime(currentTime);
        
        schedule.push({
          destination: dest,
          start_time: startTime,
          end_time: endTime,
          duration: AUTO_ROUTE_CONFIG.activity_time_per_destination
        });
      });
      
      tripData.daily_schedule.push({
        day: day,
        date: null, // Will be set when user provides travel dates
        destinations: dayDestinations,
        schedule: schedule,
        total_travel_time: currentTime - (9 * 60) // Total time from 9 AM
      });
    }
  }
  
  console.log(`Generated schedule for ${numDays} days:`, tripData.daily_schedule);
}

// Helper function to format time from minutes to HH:MM
function formatTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Function to calculate the total budget based on selected destinations
function calculateTotalBudget() {
  let totalBudget = 0;
  let budgetBreakdown = {
    destinations: [],
    accommodation: 0,
    food: 0,
    activities: 0,
    transportation: 0,
    other: 0
  };
  
  // Calculate from tripData destinations
  tripData.selected_destinations.forEach(dest => {
    let budgetValue = 0;
    let budgetCategory = 'other';
    
    if (dest.budget) {
      // Try to extract numeric value from budget
      if (typeof dest.budget === 'number') {
        budgetValue = dest.budget;
      } else if (typeof dest.budget === 'string') {
        // Remove peso sign and commas, then extract number
        const cleanBudget = dest.budget.replace(/[₱,]/g, '');
        const matches = cleanBudget.match(/\d+/g);
        if (matches && matches.length > 0) {
          budgetValue = parseInt(matches[0]);
        } else {
          // Assign default values based on budget category
          if (dest.budget.toLowerCase().includes('low')) {
            budgetValue = 1000;
          } else if (dest.budget.toLowerCase().includes('high')) {
            budgetValue = 5000;
          } else {
            budgetValue = 2500; // medium budget
          }
        }
      }
    } else {
      // Default budget based on category
      switch (dest.category?.toLowerCase()) {
        case 'restaurant':
        case 'cafe':
        case 'food shop':
          budgetValue = 500;
          budgetCategory = 'food';
          break;
        case 'hotel':
        case 'resort':
        case 'accommodation':
        case 'beach resort':
        case 'hotel & resort':
          budgetValue = 3000;
          budgetCategory = 'accommodation';
          break;
        case 'museum':
        case 'park':
        case 'zoo':
        case 'sports facility':
        case 'golf course':
          budgetValue = 200;
          budgetCategory = 'activities';
          break;
        default:
          budgetValue = 1000;
          budgetCategory = 'activities';
      }
    }
    
    // Categorize budget
    switch (dest.category?.toLowerCase()) {
      case 'restaurant':
      case 'cafe':
      case 'food shop':
      case 'café/restaurant':
      case 'shopping/restaurant':
      case 'spa/restaurant':
      case 'farm/restaurant':
        budgetCategory = 'food';
        break;
      case 'hotel':
      case 'resort':
      case 'accommodation':
      case 'beach resort':
      case 'hotel & resort':
        budgetCategory = 'accommodation';
        break;
      case 'museum':
      case 'park':
      case 'zoo':
      case 'sports facility':
      case 'golf course':
      case 'landmark':
      case 'natural attraction':
      case 'religious site':
      case 'historical site':
      case 'garden':
      case 'mountain':
      case 'beach':
        budgetCategory = 'activities';
        break;
      case 'shopping':
        budgetCategory = 'other';
        break;
      default:
        budgetCategory = 'activities';
    }
    
    totalBudget += budgetValue;
    budgetBreakdown[budgetCategory] += budgetValue;
    budgetBreakdown.destinations.push({
      name: dest.name,
      category: dest.category,
      budget: budgetValue,
      budgetCategory: budgetCategory
    });
  });
  
  // Add transportation estimate based on travel days and route distance
  let transportationEstimate = Math.round(totalBudget * 0.1); // Base 10%
  
  if (tripData.route_info) {
    // Adjust transportation cost based on distance
    const distanceKm = tripData.route_info.distance_km;
    const fuelCostPer100km = 500; // Estimated fuel cost per 100km
    const additionalTransportCost = Math.round((distanceKm / 100) * fuelCostPer100km);
    transportationEstimate = Math.max(transportationEstimate, additionalTransportCost);
  }
  
  // Factor in number of travel days
  transportationEstimate += (tripData.travel_days - 1) * 200; // Extra cost per additional day
  
  budgetBreakdown.transportation = transportationEstimate;
  totalBudget += transportationEstimate;
  
  // Update the tripData budget with detailed breakdown
  const formattedBudget = `₱${totalBudget.toLocaleString()}`;
  tripData.budget = formattedBudget;
  tripData.budget_numeric = totalBudget;
  tripData.budget_breakdown = budgetBreakdown;
  
  return totalBudget;
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

// Function to show the trip planner with enhanced day-by-day schedule
function showTripPlanner() {
  tripCreationState.active = false;
  
  // Calculate total budget
  let totalBudget = calculateTotalBudget();
  
  // Generate the schedule HTML with day-by-day breakdown
  let scheduleHtml = '';
  if (tripData.daily_schedule.length > 0) {
    scheduleHtml = `
      <div class="daily-schedule">
        <h4><i class="fas fa-calendar-alt"></i> ${tripData.travel_days}-Day Itinerary</h4>
    `;
    
    tripData.daily_schedule.forEach((dayPlan, index) => {
      const totalHours = Math.floor(dayPlan.total_travel_time / 60);
      const totalMins = Math.round(dayPlan.total_travel_time % 60);
      
      scheduleHtml += `
        <div class="day-plan">
          <div class="day-header">
            <h5>Day ${dayPlan.day}</h5>
            <span class="day-duration">${totalHours}h ${totalMins}m</span>
          </div>
          <div class="day-schedule">
      `;
      
      dayPlan.schedule.forEach((item, itemIndex) => {
        scheduleHtml += `
          <div class="schedule-item">
            <div class="schedule-time">${item.start_time} - ${item.end_time}</div>
            <div class="schedule-destination">
              <strong>${item.destination.name}</strong>
              <div class="schedule-category">${item.destination.category}</div>
            </div>
          </div>
        `;
      });
      
      scheduleHtml += `
          </div>
        </div>
      `;
    });
    
    scheduleHtml += `</div>`;
    }
  
  // Route summary
  let routeSummary = '';
  if (tripData.route_info) {
    const hours = Math.floor(tripData.route_info.time_min / 60);
    const mins = Math.round(tripData.route_info.time_min % 60);
    
    routeSummary = `
      <div class="route-summary">
        <h4><i class="fas fa-route"></i> Travel Information</h4>
        <div class="route-stats">
          <div class="route-stat">
            <i class="fas fa-road"></i> Total Distance: <strong>${tripData.route_info.distance_km.toFixed(1)} km</strong>
          </div>
          <div class="route-stat">
            <i class="fas fa-clock"></i> Total Travel Time: <strong>${hours > 0 ? hours + 'h ' : ''}${mins}m</strong>
          </div>
        </div>
      </div>
    `;
  }
  
  const summaryHtml = `
    <div class="trip-summary-enhanced">
      <h3>Your Enhanced Trip Planner</h3>
      <div class="trip-overview">
        <div class="overview-item">
          <i class="fas fa-map-marker-alt"></i>
          <div>
            <strong>Main Destination:</strong> ${tripData.destination}
          </div>
        </div>
        <div class="overview-item">
          <i class="fas fa-list"></i>
          <div>
            <strong>Selected Places:</strong> ${tripData.selected_destinations.length}
          </div>
        </div>
        <div class="overview-item">
          <i class="fas fa-calendar"></i>
          <div>
            <strong>Recommended Duration:</strong> ${tripData.travel_days} day${tripData.travel_days > 1 ? 's' : ''}
          </div>
        </div>
        <div class="overview-item">
          <i class="fas fa-money-bill-wave"></i>
          <div>
            <strong>Estimated Budget:</strong> ${tripData.budget}
          </div>
        </div>
      </div>
      
      ${routeSummary}
      ${scheduleHtml}
      
      <div class="planner-actions">
        <button id="create-itinerary-btn" class="create-itinerary-btn">
          <i class="fas fa-magic"></i> Create Detailed Itinerary
        </button>
        <button id="modify-schedule-btn" class="modify-schedule-btn">
          <i class="fas fa-edit"></i> Modify Schedule
        </button>
      </div>
    </div>
  `;
  
  addMessage(summaryHtml, false);
  
  // Add event listeners
  setTimeout(() => {
    const createItineraryBtn = document.getElementById('create-itinerary-btn');
    if (createItineraryBtn) {
      createItineraryBtn.addEventListener('click', () => {
        createItinerary();
      });
    }
    
    const modifyScheduleBtn = document.getElementById('modify-schedule-btn');
    if (modifyScheduleBtn) {
      modifyScheduleBtn.addEventListener('click', () => {
        showScheduleModificationOptions();
      });
    }
  }, 100);
}

// Function to show schedule modification options
function showScheduleModificationOptions() {
  const modificationHtml = `
    <div class="schedule-modification">
      <h4>Modify Your Schedule</h4>
      <div class="modification-options">
        <div class="option-group">
          <label for="travel-days-input">Number of Travel Days:</label>
          <input type="number" id="travel-days-input" min="1" max="14" value="${tripData.travel_days}">
        </div>
        <div class="option-group">
          <label for="destinations-per-day-input">Max Destinations per Day:</label>
          <input type="number" id="destinations-per-day-input" min="1" max="6" value="${AUTO_ROUTE_CONFIG.max_destinations_per_day}">
        </div>
        <div class="option-group">
          <label for="start-time-input">Daily Start Time:</label>
          <input type="time" id="start-time-input" value="09:00">
        </div>
        <div class="option-group">
          <label>
            <input type="checkbox" id="auto-route-checkbox" ${tripData.auto_routing_enabled ? 'checked' : ''}>
            Enable Auto-Routing
          </label>
        </div>
      </div>
      <div class="modification-actions">
        <button id="apply-modifications-btn" class="apply-modifications-btn">
          <i class="fas fa-check"></i> Apply Changes
        </button>
        <button id="reset-schedule-btn" class="reset-schedule-btn">
          <i class="fas fa-undo"></i> Reset to Auto
        </button>
      </div>
    </div>
  `;
  
  addMessage(modificationHtml, false);
  
  // Add event listeners for modification options
  setTimeout(() => {
    const applyBtn = document.getElementById('apply-modifications-btn');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        applyScheduleModifications();
      });
    }
    
    const resetBtn = document.getElementById('reset-schedule-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        resetToAutoSchedule();
      });
    }
  }, 100);
}

// Function to apply schedule modifications
function applyScheduleModifications() {
  const travelDaysInput = document.getElementById('travel-days-input');
  const destinationsPerDayInput = document.getElementById('destinations-per-day-input');
  const startTimeInput = document.getElementById('start-time-input');
  const autoRouteCheckbox = document.getElementById('auto-route-checkbox');
  
  if (travelDaysInput) {
    tripData.travel_days = parseInt(travelDaysInput.value);
  }
  
  if (destinationsPerDayInput) {
    AUTO_ROUTE_CONFIG.max_destinations_per_day = parseInt(destinationsPerDayInput.value);
  }
  
  if (autoRouteCheckbox) {
    tripData.auto_routing_enabled = autoRouteCheckbox.checked;
  }
  
  // Regenerate schedule with new parameters
  generateDailySchedule();
  
  // Recalculate budget
  calculateTotalBudget();
  
  addMessage("Schedule updated successfully! Here's your modified plan:", false);
  
  // Show updated trip planner
  setTimeout(() => {
    showTripPlanner();
  }, 500);
}

// Function to reset to auto schedule
function resetToAutoSchedule() {
  // Reset to default configuration
  AUTO_ROUTE_CONFIG.max_destinations_per_day = 3;
  tripData.auto_routing_enabled = true;
  
  // Recalculate everything
  calculateTravelDays();
  generateDailySchedule();
  calculateTotalBudget();
  
  addMessage("Schedule reset to automatic configuration.", false);
  
  // Show updated trip planner
  setTimeout(() => {
    showTripPlanner();
  }, 500);
}

// Function to show trip summary
function showTripSummary() {
  tripCreationState.active = false;
  
  // Show the trip planner if we have selected destinations
  if (tripData.selected_destinations.length > 0) {
    showTripPlanner();
  } else {
    // Otherwise, show a message asking to select destinations
    addMessage("Please select at least one destination for your trip.", false);
    tripCreationState.currentStep = 0;
    askNextQuestion();
  }
}

// Function to create an itinerary
function createItinerary() {
  // Prevent multiple simultaneous submissions
  if (window.itineraryCreationInProgress) {
    console.log('Itinerary creation already in progress');
    return;
  }
  
  // Set the flag to indicate an itinerary creation is in progress
  window.itineraryCreationInProgress = true;
  
  // Clear any previous itineraries and ticket creations first
  const existingElements = document.querySelectorAll('.trip-itinerary, .ticket-creation, .destination-suggestions');
  existingElements.forEach(element => {
    const messageContainer = element.closest('.message');
    if (messageContainer) {
      messageContainer.remove();
    }
  });
  
  // Show loading message
  addMessage("Creating your personalized itinerary...", false);
  
  // Get destinations from the planner if available
  const destinationsList = document.getElementById('destinations-list');
  let plannerDestinations = [];
  
  if (destinationsList && destinationsList.children.length > 0) {
    console.log(`Found ${destinationsList.children.length} destinations in the planner`);
    
    // Extract data from the planner items
    Array.from(destinationsList.children).forEach((item, index) => {
      const nameElement = item.querySelector('.destination-item-name');
      const categoryElement = item.querySelector('.destination-item-category');
      const locationElement = item.querySelector('.destination-item-location');
      const budgetElement = item.querySelector('.destination-item-budget');
      
      if (nameElement) {
        // Create destination object
        const destination = {
          id: item.dataset.id || Date.now().toString() + index,
          name: nameElement.textContent,
          category: categoryElement ? categoryElement.textContent : 'Attraction',
          city: locationElement ? locationElement.textContent : tripData.destination,
          description: item.dataset.description || `A wonderful place to visit in ${tripData.destination}`,
          budget: budgetElement ? budgetElement.textContent.replace('Budget: ', '') : 'mid-range',
          // Try to get coordinates from data attributes if available
          latitude: parseFloat(item.dataset.lat) || null,
          longitude: parseFloat(item.dataset.lng) || null
        };
        
        plannerDestinations.push(destination);
        console.log(`Added destination from planner: ${destination.name}`);
      }
    });
  }
  
  // Make a deep copy of the selected destinations to avoid reference issues
  console.log(`Current tripData has ${tripData.selected_destinations.length} destinations`);
  const currentDestinations = JSON.parse(JSON.stringify(tripData.selected_destinations));
  
  // Clear selected destinations and add planner destinations
  tripData.selected_destinations = [];
  
  // Add all planner destinations 
  if (plannerDestinations.length > 0) {
    tripData.selected_destinations = plannerDestinations;
  } else if (currentDestinations.length > 0) {
    // Use existing destinations if no planner destinations
    tripData.selected_destinations = currentDestinations;
  }
  
  console.log(`Proceeding with ${tripData.selected_destinations.length} destinations`);
  
  // Geocode any destinations that don't have coordinates
  const geocodingPromises = tripData.selected_destinations
    .filter(dest => !dest.latitude || !dest.longitude)
    .map(dest => {
      // Create a search query combining name and city for better results
      const searchQuery = `${dest.name}, ${dest.city || tripData.destination}`;
      console.log(`Geocoding destination: ${searchQuery}`);
      
      // Return a promise for the geocoding request
      return fetch(getApiUrl(`/geocode?q=${encodeURIComponent(searchQuery)}`))
        .then(response => response.json())
        .then(data => {
          if (data.results && data.results.length > 0) {
            const location = data.results[0];
            // Update the destination with coordinates
            dest.latitude = location.point.lat;
            dest.longitude = location.point.lng;
            console.log(`Geocoded ${dest.name}: ${dest.latitude}, ${dest.longitude}`);
          }
          return dest;
        })
        .catch(error => {
          console.error(`Error geocoding ${dest.name}:`, error);
          return dest;
        });
    });
  
  // After geocoding, continue with itinerary creation
  Promise.all(geocodingPromises)
    .then(() => {
      // Continue with itinerary creation
      // Ensure we're using a deep copy of the destinations array
      const destinationsForAPI = JSON.parse(JSON.stringify(tripData.selected_destinations));
      
      // Prepare the data to send to the API
      const apiData = {
        destination: tripData.destination,
        travelers: tripData.travelers,
        budget: tripData.budget,
        interests: tripData.interests,
        selected_destination_data: destinationsForAPI.length > 0 ? 
          destinationsForAPI[0] : null,
        all_selected_destinations: destinationsForAPI
      };
      
      console.log(`Sending ${destinationsForAPI.length} destinations to API`);
      
      // Add a unique timestamp to prevent caching
      const timestamp = new Date().getTime();
      
      // Generate a unique request ID to help server detect duplicates
      const uniqueRequestId = `itinerary_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
      console.log(`Creating itinerary with unique request ID: ${uniqueRequestId}`);
      
      // Add the request ID to the API data
      apiData.request_id = uniqueRequestId;
      
      // Stringify the request just once to ensure proper conversion
      const apiDataString = JSON.stringify(apiData);
      
      // Call the API to create an itinerary
      return fetch(getApiUrl(`/create_trip?_=${timestamp}`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Request-ID': uniqueRequestId // Add request ID header for duplicate detection
        },
        body: apiDataString
      });
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      // Reset the creation in progress flag
      window.itineraryCreationInProgress = false;
      
      // Remove the loading message
      const loadingMessages = document.querySelectorAll('.message.bot');
      if (loadingMessages.length > 0) {
        const lastMessage = loadingMessages[loadingMessages.length - 1];
        if (lastMessage.textContent.includes("Creating your personalized itinerary")) {
          lastMessage.remove();
        }
      }
      
      if (data.trip) {
        // Ensure all selected destinations in the trip have coordinates
        if (data.trip.selected_destinations) {
          // Log the destinations returned by the API
          console.log(`API returned ${data.trip.selected_destinations.length} destinations`);
          
          // If API returned fewer destinations than we had, use our original list
          if (data.trip.selected_destinations.length < tripData.selected_destinations.length) {
            console.log(`API dropped some destinations. Using our original list of ${tripData.selected_destinations.length} destinations`);
            data.trip.selected_destinations = JSON.parse(JSON.stringify(tripData.selected_destinations));
          }
          
          data.trip.selected_destinations.forEach(dest => {
            // Find the corresponding destination in tripData if it exists
            const originalDest = tripData.selected_destinations.find(d => 
              d.id === dest.id || d.name === dest.name);
            
            // Copy coordinates if they exist in the original but not in the response
            if (originalDest && originalDest.latitude && originalDest.longitude) {
              if (!dest.latitude || !dest.longitude) {
                dest.latitude = originalDest.latitude;
                dest.longitude = originalDest.longitude;
              }
            }
          });
        } else {
          // If the API didn't return any destinations, use our original list
          console.log(`API didn't return destinations. Using our list of ${tripData.selected_destinations.length} destinations`);
          data.trip.selected_destinations = JSON.parse(JSON.stringify(tripData.selected_destinations));
        }
        
        // If there's an itinerary, make sure all places have coordinates
        if (data.trip.itinerary) {
          data.trip.itinerary.forEach(day => {
            if (day.places) {
              day.places.forEach(place => {
                // Find the corresponding destination in tripData if it exists
                const originalPlace = tripData.selected_destinations.find(d => 
                  d.name === place.name);
                
                // Copy coordinates if they exist in the original but not in the response
                if (originalPlace && originalPlace.latitude && originalPlace.longitude) {
                  if (!place.latitude || !place.longitude) {
                    place.latitude = originalPlace.latitude;
                    place.longitude = originalPlace.longitude;
                  }
                }
              });
            }
          });
        }
        
        displayItinerary(data.trip);
      } else if (data.error && data.suggestions) {
        // Handle case where destination wasn't found
        showDestinationSuggestions(data.suggestions);
      } else {
        addMessage("I couldn't create an itinerary at this time. Please try again later.", false);
      }
    })
    .catch(error => {
      // Reset the creation in progress flag
      window.itineraryCreationInProgress = false;
      
      console.error('Error creating itinerary:', error);
      addMessage("There was an error creating your itinerary. Please try again later.", false);
    });
}

// Function to display itinerary
function displayItinerary(trip) {
  // Remove any existing itineraries, ticket-creation elements, or destination suggestions
  const existingElements = document.querySelectorAll('.trip-itinerary, .ticket-creation, .destination-suggestions');
  existingElements.forEach(element => {
    const messageContainer = element.closest('.message');
    if (messageContainer) {
      messageContainer.remove();
    }
  });

  // Make the global addMessage function available
  if (typeof window.addMessage !== 'function') {
    window.addMessage = addMessage;
  }
  
  // Get the destination name - use the first selected destination's city if available
  let destinationName = trip.destination;
  if (trip.selected_destinations && trip.selected_destinations.length > 0 && trip.selected_destinations[0].city) {
    destinationName = trip.selected_destinations[0].city;
  }
  
  // Calculate total budget
  let totalBudget = 0;
  const selectedDestinations = trip.selected_destinations || tripData.selected_destinations;
  
  // Log the destinations for debugging
  console.log(`Displaying itinerary with ${selectedDestinations.length} destinations`);
  
  // Make a deep copy of the destinations array to avoid reference issues
  const destinationsToDisplay = JSON.parse(JSON.stringify(selectedDestinations));
  
  destinationsToDisplay.forEach(dest => {
    if (dest.budget) {
      // Try to extract numeric value from budget
      let budgetValue = 0;
      if (typeof dest.budget === 'number') {
        budgetValue = dest.budget;
      } else if (typeof dest.budget === 'string') {
        const matches = dest.budget.match(/\d+/g);
        if (matches && matches.length > 0) {
          budgetValue = parseInt(matches[0]);
        } else {
          // Assign default values based on budget category
          if (dest.budget.toLowerCase().includes('low')) {
            budgetValue = 1000;
          } else if (dest.budget.toLowerCase().includes('high')) {
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
  
  // Count destinations with coordinates for routing capability
  const routeableDestinations = destinationsToDisplay.filter(
    place => place.latitude && place.longitude
  );
  const hasRouteableDestinations = routeableDestinations.length >= 2;
  
  let itineraryHtml = `
    <div class="trip-itinerary">
      <h3>Your ${destinationName} Travel Plan</h3>
      <div class="destination-list">
  `;
  
  // List all selected destinations
  destinationsToDisplay.forEach((place, index) => {
    // Log each destination being displayed
    console.log(`Displaying destination ${index+1}: ${place.name}`);
    
    // Pick a random image index (1, 2, or 3)
    const imageIndex = Math.floor(Math.random() * 3) + 1;
    const imagePath = `images/location/${encodeURIComponent(place.name)}/${imageIndex}.jpg`;
    
    itineraryHtml += `
      <div class="destination-card" 
          ${place.latitude ? `data-lat="${place.latitude}"` : ''} 
          ${place.longitude ? `data-lng="${place.longitude}"` : ''} 
          data-name="${place.name}">
        <h4>${place.name}</h4>
        <div class="destination-info">
          <div class="destination-category">${place.category}</div>
          <div class="destination-location">
            <i class="fas fa-map-marker-alt"></i> ${place.city || destinationName}
          </div>
        </div>
        <img src="${imagePath}" alt="${place.name}" class="destination-image" onerror="this.style.display='none'">
        <p class="destination-description">${place.description ? place.description.substring(0, 120) + '...' : 'No description available'}</p>
        <div class="destination-actions">
    `;
    
    // Add coordinates button if available
    if (place.latitude && place.longitude) {
      itineraryHtml += `
        <button class="view-map-btn" data-lat="${place.latitude}" data-lng="${place.longitude}" data-name="${place.name}">
          <i class="fas fa-map"></i> View on Map
        </button>
      `;
    }
    
    itineraryHtml += `</div></div>`;
  });
  
  // Add routing option if we have multiple destinations with coordinates
  if (hasRouteableDestinations) {
    itineraryHtml += `
      <div class="routing-section">
        <h4>Plan Your Route</h4>
        <p>Create a route between your selected destinations:</p>
        <div class="routing-options">
          <div class="route-start">
            <label>Start from:</label>
            <select id="route-start-select">
              ${routeableDestinations.map(dest => 
                `<option value="${dest.name}" data-lat="${dest.latitude}" data-lng="${dest.longitude}">${dest.name}</option>`
              ).join('')}
            </select>
          </div>
          <div class="route-end">
            <label>End at:</label>
            <select id="route-end-select">
              ${routeableDestinations.map((dest, index) => 
                `<option value="${dest.name}" data-lat="${dest.latitude}" data-lng="${dest.longitude}" ${index === routeableDestinations.length - 1 ? 'selected' : ''}>${dest.name}</option>`
              ).join('')}
            </select>
          </div>
          <div class="route-waypoints">
            <label>Include stops:</label>
            <div id="waypoints-container">
              ${routeableDestinations.length > 2 ? 
                routeableDestinations.slice(1, -1).map(dest => 
                  `<div class="waypoint-item">
                    <input type="checkbox" id="waypoint-${dest.name.replace(/\s+/g, '-')}" 
                      data-name="${dest.name}" data-lat="${dest.latitude}" data-lng="${dest.longitude}" checked>
                    <label for="waypoint-${dest.name.replace(/\s+/g, '-')}">${dest.name}</label>
                  </div>`
                ).join('') : 
                '<p>No additional stops available.</p>'
              }
            </div>
          </div>
          <button id="calculate-route-btn" class="calculate-route-btn">
            <i class="fas fa-route"></i> Calculate Route
          </button>
        </div>
        <div id="route-results" class="route-results" style="display: none;">
          <h4>Route Information</h4>
          <div class="route-summary">
            <div class="route-detail">
              <i class="fas fa-road"></i> Distance: <span id="route-distance">0 km</span>
            </div>
            <div class="route-detail">
              <i class="fas fa-clock"></i> Estimated Time: <span id="route-time">0 min</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  // Add summary and save button
  itineraryHtml += `
      </div>
      <div class="trip-summary">
        <div class="summary-item">
          <span class="summary-label">Destinations:</span>
          <span class="summary-value">${destinationsToDisplay.length}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Total Budget:</span>
          <span class="summary-value">${formattedBudget}</span>
        </div>
      </div>
      <button class="save-trip-btn" id="savePlanBtn">Save Plan</button>
    </div>
  `;
  
  // Add the itinerary to the chat
  addMessage(itineraryHtml, false);
  
  // Add event listener to the save button
  setTimeout(() => {
    const saveBtn = document.getElementById('savePlanBtn');
    if (saveBtn) {
      // Remove any existing event listeners by replacing the button with a clone
      saveBtn.replaceWith(saveBtn.cloneNode(true));
      
      // Get the new button reference after replacing
      const newSaveBtn = document.getElementById('savePlanBtn');
      
      // Add the event listener to the new button
      newSaveBtn.addEventListener('click', () => {
        // Disable the button to prevent multiple submissions
        newSaveBtn.disabled = true;
        newSaveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        
        // Prepare the trip data with the correct destinations
        const tripWithAllDestinations = {
          ...trip,
          selected_destinations: destinationsToDisplay
        };
        
        // Log the number of destinations being saved
        console.log(`Saving trip with ${destinationsToDisplay.length} destinations`);
        
        // Call saveTrip function with the updated trip data
        saveTrip(tripWithAllDestinations);
      });
    }
    
    // Add event listeners to map buttons
    document.querySelectorAll('.view-map-btn').forEach(btn => {
      // Clone and replace to remove any existing event listeners
      const newBtn = btn.cloneNode(true);
      btn.replaceWith(newBtn);
      
      newBtn.addEventListener('click', () => {
        const lat = parseFloat(newBtn.dataset.lat);
        const lng = parseFloat(newBtn.dataset.lng);
        const name = newBtn.dataset.name;
        
        if (typeof window.showOnMap === 'function') {
          window.showOnMap(lat, lng, name);
        }
        
        // Scroll to the map
        const mapElement = document.getElementById('map');
        if (mapElement) {
          mapElement.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
    
    // Add event listener to calculate route button
    const calculateRouteBtn = document.getElementById('calculate-route-btn');
    if (calculateRouteBtn && hasRouteableDestinations) {
      calculateRouteBtn.addEventListener('click', () => {
        // Get selected start and end points
        const startSelect = document.getElementById('route-start-select');
        const endSelect = document.getElementById('route-end-select');
        
        if (!startSelect || !endSelect) return;
        
        const startOption = startSelect.options[startSelect.selectedIndex];
        const endOption = endSelect.options[endSelect.selectedIndex];
        
        // Get waypoints
        const waypoints = [];
        document.querySelectorAll('#waypoints-container input[type="checkbox"]:checked').forEach(checkbox => {
          waypoints.push({
            name: checkbox.dataset.name,
            lat: parseFloat(checkbox.dataset.lat),
            lng: parseFloat(checkbox.dataset.lng)
          });
        });
        
        // Create route request
        const routePoints = [
          {
            name: startOption.value,
            lat: parseFloat(startOption.dataset.lat),
            lng: parseFloat(startOption.dataset.lng)
          },
          ...waypoints,
          {
            name: endOption.value,
            lat: parseFloat(endOption.dataset.lat),
            lng: parseFloat(endOption.dataset.lng)
          }
        ];
        
        // Update button state
        calculateRouteBtn.disabled = true;
        calculateRouteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calculating...';
        
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
          calculateRouteBtn.disabled = false;
          calculateRouteBtn.innerHTML = '<i class="fas fa-route"></i> Calculate Route';
          
          if (data.route) {
            // Display route on map if map manager is available
            if (typeof window.displayRouteOnMap === 'function') {
              const routeSummary = window.displayRouteOnMap(data.route, routePoints);
              
              // Update route summary
              const routeDistanceElement = document.getElementById('route-distance');
              const routeTimeElement = document.getElementById('route-time');
              
              if (routeDistanceElement) {
                routeDistanceElement.textContent = `${data.route.distance_km.toFixed(1)} km`;
              }
              
              if (routeTimeElement) {
                const hours = Math.floor(data.route.time_min / 60);
                const mins = Math.round(data.route.time_min % 60);
                routeTimeElement.textContent = hours > 0 ? 
                  `${hours} h ${mins} min` : 
                  `${mins} min`;
              }
              
              // Show route results
              const routeResults = document.getElementById('route-results');
              if (routeResults) {
                routeResults.style.display = 'block';
              }
              
              // Scroll to map
              const mapElement = document.getElementById('map');
              if (mapElement) {
                mapElement.scrollIntoView({ behavior: 'smooth' });
              }
            } else {
              // No map manager available, show alert
              alert('Route calculated! Distance: ' + data.route.distance_km.toFixed(1) + ' km');
            }
          } else {
            alert('Could not calculate a route between these points. Please try different locations.');
          }
        })
        .catch(error => {
          console.error('Error calculating route:', error);
          
          // Reset button
          calculateRouteBtn.disabled = false;
          calculateRouteBtn.innerHTML = '<i class="fas fa-route"></i> Calculate Route';
          
          alert('Error calculating route. Please try again.');
        });
      });
    }
  }, 100);
}

// Function to show destination suggestions
function showDestinationSuggestions(suggestions) {
  let suggestionsHtml = `
    <div class="destination-suggestions">
      <p>I couldn't find "${tripData.destination}" in my database. Did you mean one of these?</p>
      <div class="suggestion-buttons">
  `;
  
  suggestions.forEach(suggestion => {
    suggestionsHtml += `<button class="suggestion-btn" data-destination="${suggestion}">${suggestion}</button>`;
  });
  
  suggestionsHtml += `
      </div>
    </div>
  `;
  
  addMessage(suggestionsHtml, false);
  
  // Add event listeners to the suggestion buttons
  setTimeout(() => {
    document.querySelectorAll('.suggestion-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        tripData.destination = btn.dataset.destination;
        addMessage(`Great! Let's plan your trip to ${tripData.destination} instead.`, false);
        createItinerary();
      });
    });
  }, 100);
}

// Function to save trip
function saveTrip(trip) {
  // Remove any existing itineraries or ticket-creation elements to prevent duplication
  const existingElements = document.querySelectorAll('.trip-itinerary, .ticket-creation, .destination-suggestions');
  existingElements.forEach(element => {
    const messageContainer = element.closest('.message');
    if (messageContainer) {
      messageContainer.remove();
    }
  });
  
  // Disable the save button that was clicked to prevent multiple submissions
  const saveButton = document.querySelector('.save-trip-btn');
  if (saveButton) {
    saveButton.disabled = true;
    saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
  }
  
  // Prepare the trip data, ensuring coordinates are included
  const selectedDestinations = trip.selected_destinations || tripData.selected_destinations;
  
  // Log the number of destinations to save (for debugging)
  console.log(`Preparing to save ${selectedDestinations.length} destinations`);
  
  // Ensure all destinations have the latest coordinates
  const updatedDestinations = selectedDestinations.map(dest => {
    // Check if updated coordinates are available in the DOM
    const destElement = document.querySelector(`.destination-card[data-name="${dest.name}"]`);
    if (destElement && destElement.dataset.lat && destElement.dataset.lng) {
      return {
        ...dest,
        latitude: parseFloat(destElement.dataset.lat),
        longitude: parseFloat(destElement.dataset.lng)
      };
    }
    return dest;
  });
  
  // Log the updated destinations array
  console.log(`Updated destinations array has ${updatedDestinations.length} items`);
  
  // Create a deep clone of the destinations array to avoid reference issues
  const destinationsToSave = JSON.parse(JSON.stringify(updatedDestinations));
  
  // Calculate total budget as numeric value
  let totalBudgetNumeric = 0;
  destinationsToSave.forEach(dest => {
    if (dest.budget) {
      // Try to extract numeric value from budget
      let budgetValue = 0;
      if (typeof dest.budget === 'number') {
        budgetValue = dest.budget;
      } else if (typeof dest.budget === 'string') {
        const matches = dest.budget.match(/\d+/g);
        if (matches && matches.length > 0) {
          budgetValue = parseInt(matches[0]);
        } else {
          // Assign default values based on budget category
          if (dest.budget.toLowerCase().includes('low')) {
            budgetValue = 1000;
          } else if (dest.budget.toLowerCase().includes('high')) {
            budgetValue = 5000;
          } else {
            budgetValue = 2500; // medium budget
          }
        }
      }
      totalBudgetNumeric += budgetValue;
    }
  });
  
  // Format the budget with peso sign
  const formattedBudget = `₱${totalBudgetNumeric.toLocaleString()}`;
  
  // Calculate comprehensive budget with breakdown
  calculateTotalBudget();
  
  // Prepare the trip data with updated destinations and comprehensive budget
  const tripToSave = {
    destination: trip.destination,
    travelers: trip.travelers || 1,
    budget: tripData.budget || formattedBudget,
    budget_numeric: tripData.budget_numeric || totalBudgetNumeric,
    budget_breakdown: tripData.budget_breakdown || {},
    selected_destinations: destinationsToSave,
    itinerary: trip.itinerary || [],
          travel_dates: tripData.travel_dates || null,
    trip_summary: {
      total_destinations: destinationsToSave.length,
      main_categories: [...new Set(destinationsToSave.map(d => d.category))],
      estimated_duration: Math.ceil(destinationsToSave.length / 3) + ' days'
    }
  };
  
  // Include any route data if available
  const routeResultsElement = document.getElementById('route-results');
  if (routeResultsElement && routeResultsElement.style.display !== 'none') {
    const distanceElement = document.getElementById('route-distance');
    const timeElement = document.getElementById('route-time');
    
    if (distanceElement && timeElement) {
      tripToSave.route_info = {
        distance_km: parseFloat(distanceElement.textContent.replace(' km', '')),
        time_min: parseTimeToMinutes(timeElement.textContent)
      };
    }
  }
  
  // Create email form HTML with the trip data embedded
  const emailFormHtml = `
    <div class="ticket-creation">
      <h4 style="color: #000000 !important; font-weight: bold;">Your travel plan is ready!</h4>
      <p style="color: #000000 !important;">Enter your email to receive your travel plan:</p>
      <div class="ticket-input-container">
        <input type="email" id="userEmail" placeholder="your@email.com" required>
        <button class="create-ticket-btn" id="createTicketBtn">Send Plan</button>
      </div>
      <p class="ticket-note" style="color: #000000 !important;">You'll receive a confirmation email with your trip details</p>
      <div id="ticketResult" style="display: none;"></div>
    </div>
  `;
  
  addMessage(emailFormHtml, false);
  
  // Track if a ticket creation is in progress to prevent duplicate submissions
  let ticketSubmissionInProgress = false;
  
  // Add event listener to the create ticket button
  setTimeout(() => {
    const createTicketBtn = document.getElementById('createTicketBtn');
    const emailInput = document.getElementById('userEmail');
    const ticketResult = document.getElementById('ticketResult');
    
    if (createTicketBtn && emailInput && ticketResult) {
      // Remove any existing click event listener first to prevent duplicates
      createTicketBtn.replaceWith(createTicketBtn.cloneNode(true));
      
      // Get the new button reference after replacing
      const newCreateTicketBtn = document.getElementById('createTicketBtn');
      
      // Add the click event listener to the new button
      newCreateTicketBtn.addEventListener('click', () => {
        // Prevent duplicate submissions
        if (ticketSubmissionInProgress) {
          console.log('Ticket submission already in progress, ignoring duplicate click');
          return;
        }
        
        const email = emailInput.value.trim();
        
        if (!email || !email.includes('@')) {
          ticketResult.style.display = 'block';
          ticketResult.innerHTML = '<p class="error-message">Please enter a valid email address</p>';
          emailInput.classList.add('error');
          return;
        }
        
        // Set submission flag to prevent duplicates
        ticketSubmissionInProgress = true;
        
        // Remove error styling
        emailInput.classList.remove('error');
        
        // Show loading state
        newCreateTicketBtn.disabled = true;
        newCreateTicketBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        ticketResult.style.display = 'block';
        ticketResult.innerHTML = '<p style="color: #000000 !important;">Creating your travel plan ticket...</p>';
        
        // Create ticket with the API - add a unique timestamp to prevent caching
        const timestamp = new Date().getTime();
        // Add a unique ID to the trip data to help the server detect duplicates
        const uniqueTripId = `trip_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
        console.log(`Creating ticket with unique trip ID: ${uniqueTripId}`);
        
        // Log the data being sent to verify all destinations are included
        console.log(`Sending ${tripToSave.selected_destinations.length} destinations to server`);
        
        const requestBody = {
          email: email,
          itinerary: tripToSave,
          request_id: uniqueTripId // Include in body as well for servers that don't check headers
        };
        
        // Stringify the request body once to ensure proper conversion
        const requestBodyString = JSON.stringify(requestBody);
        
        fetch(getApiUrl(`/create_ticket?_=${timestamp}`), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'X-Request-ID': uniqueTripId // Add request ID header for duplicate detection
          },
          body: requestBodyString
        })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          if (data.ticket_id) {
            // Show success message
            ticketResult.innerHTML = `
              <div class="ticket-success">
                <i class="fas fa-check-circle"></i>
                <h4 style="color: #000000 !important; font-weight: bold;">Travel Plan Saved!</h4>
                <p style="color: #000000 !important;">Your travel plan has been sent to <strong>${email}</strong></p>
                <p style="color: #000000 !important;">Ticket ID: <strong>${data.ticket_id}</strong></p>
                <p style="color: #000000 !important;">You can track your travel plan with this ticket ID in the Ticket Tracker page.</p>
                <a href="tracker.html?ticket=${data.ticket_id}" class="tracker-link" target="_blank">
                  <i class="fas fa-external-link-alt"></i> Go to Ticket Tracker
                </a>
              </div>
            `;
            
            // Hide the form
            emailInput.style.display = 'none';
            newCreateTicketBtn.style.display = 'none';
          } else {
            // Show error
            ticketResult.innerHTML = `
              <div class="ticket-error">
                <i class="fas fa-exclamation-circle"></i>
                <p>There was an issue creating your ticket.</p>
                <p>${data.error || 'Please try again later.'}</p>
              </div>
            `;
            newCreateTicketBtn.disabled = false;
            newCreateTicketBtn.innerHTML = 'Try Again';
            
            // Reset submission flag to allow retry
            ticketSubmissionInProgress = false;
          }
        })
        .catch(error => {
          console.error('Error creating ticket:', error);
          ticketResult.innerHTML = `
            <div class="ticket-error">
              <i class="fas fa-exclamation-circle"></i>
              <p>Error: ${error.message || 'Could not connect to the server.'}</p>
              <p>Please try again later.</p>
            </div>
          `;
          newCreateTicketBtn.disabled = false;
          newCreateTicketBtn.innerHTML = 'Try Again';
          
          // Reset submission flag to allow retry
          ticketSubmissionInProgress = false;
        });
      });
    }
  }, 100);
}

// Helper function to convert time string like "1 h 30 min" to total minutes
function parseTimeToMinutes(timeString) {
  let totalMinutes = 0;
  
  // Match hours if present
  const hoursMatch = timeString.match(/(\d+)\s*h/);
  if (hoursMatch) {
    totalMinutes += parseInt(hoursMatch[1]) * 60;
  }
  
  // Match minutes
  const minsMatch = timeString.match(/(\d+)\s*min/);
  if (minsMatch) {
    totalMinutes += parseInt(minsMatch[1]);
  }
  
  return totalMinutes;
}

// Make the handleChatInput function available globally
window.handleChatInput = handleChatInput;

// Connect to map functions
if (typeof window.displayRouteOnMap !== 'function' && typeof displayRouteOnMap === 'function') {
  window.displayRouteOnMap = displayRouteOnMap;
}

// Function to initialize the trip planner
function initTripPlanner() {
  console.log("Initializing trip planner...");
  
  // Reset global submission tracking flags
  window.itineraryCreationInProgress = false;
  
  // Set up event listeners for the trip planner buttons
  const savePlanBtn = document.getElementById('save-planner-btn');
  const clearPlanBtn = document.getElementById('clear-planner-btn');
  const addDestinationBtn = document.getElementById('add-destination-btn');
  const saveDestinationBtn = document.getElementById('save-destination-btn');
  const cancelDestinationBtn = document.getElementById('cancel-destination-btn');
  
  // Save Plan button
  if (savePlanBtn) {
    savePlanBtn.addEventListener('click', () => {
      // Check if we have destinations in the planner
      const destinationsList = document.getElementById('destinations-list');
      if (destinationsList && destinationsList.children.length > 0) {
        // We have destinations, proceed with saving the plan
        createItinerary();
      } else {
        // No destinations added yet, show error message
        alert('No destinations to save. Please add at least one destination first.');
      }
    });
  }
  
  // Clear Plan button
  if (clearPlanBtn) {
    clearPlanBtn.addEventListener('click', () => {
      // Clear destinations list
      const destinationsList = document.getElementById('destinations-list');
      if (destinationsList) {
        destinationsList.innerHTML = '';
      }
      
      // Reset trip data
      tripData.selected_destinations = [];
      
      // Update summary
      updateTripSummary();
    });
  }
  
  // Add destination button
  if (addDestinationBtn) {
    addDestinationBtn.addEventListener('click', () => {
      // Show the destination form
      const destinationForm = document.getElementById('destination-form');
      if (destinationForm) {
        destinationForm.style.display = 'block';
        
        // Clear form fields
        const nameInput = document.getElementById('destination-name');
        const locationInput = document.getElementById('destination-location');
        const budgetInput = document.getElementById('destination-budget');
        const notesInput = document.getElementById('destination-notes');
        const previewImage = document.getElementById('preview-image');
        const noImageMessage = document.getElementById('no-image-message');
        
        if (nameInput) nameInput.value = '';
        if (locationInput) locationInput.value = '';
        if (budgetInput) budgetInput.value = '';
        if (notesInput) notesInput.value = '';
        if (previewImage) {
          previewImage.src = '';
          previewImage.style.display = 'none';
        }
        if (noImageMessage) noImageMessage.style.display = 'block';
        
        // Remove any edit item ID
        destinationForm.dataset.editItemId = '';
      }
    });
  }
  
  // Add event listener for name input to update image preview
  const nameInput = document.getElementById('destination-name');
  if (nameInput) {
    nameInput.addEventListener('input', () => {
      const name = nameInput.value.trim();
      const previewImage = document.getElementById('preview-image');
      const noImageMessage = document.getElementById('no-image-message');
      
      if (name) {
        // Pick a random image index (1, 2, or 3)
        const imageIndex = Math.floor(Math.random() * 3) + 1;
        const imagePath = `images/location/${encodeURIComponent(name)}/${imageIndex}.jpg`;
        
        // Try to load the image
        const img = new Image();
        img.onload = () => {
          if (previewImage) {
            previewImage.src = imagePath;
            previewImage.style.display = 'block';
          }
          if (noImageMessage) noImageMessage.style.display = 'none';
        };
        img.onerror = () => {
          if (previewImage) {
            previewImage.src = '';
            previewImage.style.display = 'none';
          }
          if (noImageMessage) noImageMessage.style.display = 'block';
        };
        img.src = imagePath;
      } else {
        if (previewImage) {
          previewImage.src = '';
          previewImage.style.display = 'none';
        }
        if (noImageMessage) noImageMessage.style.display = 'block';
      }
    });
  }
  
  // Save destination button
  if (saveDestinationBtn) {
    saveDestinationBtn.addEventListener('click', () => {
      // Get form values
      const nameInput = document.getElementById('destination-name');
      const categorySelect = document.getElementById('destination-category');
      const locationInput = document.getElementById('destination-location');
      const budgetInput = document.getElementById('destination-budget');
      const notesInput = document.getElementById('destination-notes');
      
      if (!nameInput || !categorySelect || !locationInput) return;
      
      const name = nameInput.value.trim();
      const category = categorySelect.options[categorySelect.selectedIndex].value;
      const location = locationInput.value.trim();
      const budget = budgetInput ? budgetInput.value.trim() : '';
      const notes = notesInput ? notesInput.value.trim() : '';
      
      if (!name || !location) {
        alert('Please enter a name and location for the destination.');
        return;
      }
      
      const dayInput = document.getElementById('destination-day');
      const day = dayInput ? parseInt(dayInput.value) : null;
      
      const destination = {
        id: Date.now().toString(),
        name: name,
        category: category,
        city: location,
        description: notes,
        budget: budget,
        day: day
      };
      
      // Check if we're editing an existing item
      const destinationForm = document.getElementById('destination-form');
      if (destinationForm && destinationForm.dataset.editItemId) {
        // Edit existing destination
        const existingItemId = destinationForm.dataset.editItemId;
        const destinationsList = document.getElementById('destinations-list');
        
        if (destinationsList) {
          const existingItem = destinationsList.querySelector(`[data-id="${existingItemId}"]`);
          if (existingItem) {
            // Update the item in the UI
            const nameElement = existingItem.querySelector('.destination-item-name');
            const categoryElement = existingItem.querySelector('.destination-item-category');
            const locationElement = existingItem.querySelector('.destination-item-location');
            const budgetElement = existingItem.querySelector('.destination-item-budget');
            
            if (nameElement) nameElement.textContent = name;
            if (categoryElement) categoryElement.textContent = category;
            if (locationElement) locationElement.textContent = location;
            if (budgetElement) budgetElement.textContent = `Budget: ₱${budget || 'N/A'}`;
            
            // Update in tripData as well
            const index = tripData.selected_destinations.findIndex(d => d.id === existingItemId);
            if (index !== -1) {
              tripData.selected_destinations[index] = {
                ...tripData.selected_destinations[index],
                name: name,
                category: category,
                city: location,
                description: notes,
                budget: budget
              };
            }
          }
        }
      } else {
        // Add new destination
        addDestinationToList(destination);
        
        // Add to tripData
        tripData.selected_destinations.push(destination);
      }
      
      // Hide the form
      if (destinationForm) {
        destinationForm.style.display = 'none';
      }
      
      // Update trip summary
      updateTripSummary();
    });
  }
  
  // Cancel destination button
  if (cancelDestinationBtn) {
    cancelDestinationBtn.addEventListener('click', () => {
      // Hide the destination form
      const destinationForm = document.getElementById('destination-form');
      if (destinationForm) {
        destinationForm.style.display = 'none';
      }
    });
  }
  
  // Make functions globally available
  window.tripData = tripData;
  window.addDestinationToTrip = addDestinationToTrip;
  window.handleChatInput = handleChatInput;
  window.startTripCreationFlow = startTripCreationFlow;

  // Add routing section
  addRoutingSection();
}

// Initialize the trip planner when document is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize trip planner functionality
  initTripPlanner();
});

// Function to add a destination to the destinations list in the planner UI
function addDestinationToList(destination) {
  const destinationsList = document.getElementById('destinations-list');
  if (!destinationsList) return;
  
  // Create a new destination item element
  const destinationItem = document.createElement('div');
  destinationItem.className = 'destination-item';
  destinationItem.dataset.id = destination.id;
  destinationItem.dataset.description = destination.description || '';
  
  // Store coordinates as data attributes if available
  if (destination.latitude && destination.longitude) {
    destinationItem.dataset.lat = destination.latitude;
    destinationItem.dataset.lng = destination.longitude;
  }
  
  // Format budget for display
  const budgetDisplay = destination.budget ? `₱${destination.budget}` : '₱N/A';
  
  // Pick a random image index (1, 2, or 3)
  const imageIndex = Math.floor(Math.random() * 3) + 1;
  const imagePath = `images/location/${encodeURIComponent(destination.name)}/${imageIndex}.jpg`;
  
  // Create the HTML for the destination item
  destinationItem.innerHTML = `
    <div class="destination-item-header">
      <div class="destination-item-name">${destination.name}</div>
      <div class="destination-item-category">${destination.category}</div>
    </div>
    <div class="destination-item-location">${destination.city}</div>
    <div class="destination-item-budget">Budget: ${budgetDisplay}</div>
    <img src="${imagePath}" alt="${destination.name}" class="destination-image" onerror="this.style.display='none'">
    <div class="destination-item-actions">
      <button class="destination-item-btn edit-btn">
        <i class="fas fa-edit"></i> Edit
      </button>
      <button class="destination-item-btn delete-btn">
        <i class="fas fa-trash-alt"></i> Delete
      </button>
    </div>
  `;
  
  // Add event listeners for the edit and delete buttons
  const editBtn = destinationItem.querySelector('.edit-btn');
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      // Show the destination form for editing
      const destinationForm = document.getElementById('destination-form');
      if (!destinationForm) return;
      
      // Set form fields
      const nameInput = document.getElementById('destination-name');
      const categorySelect = document.getElementById('destination-category');
      const locationInput = document.getElementById('destination-location');
      const budgetInput = document.getElementById('destination-budget');
      const notesInput = document.getElementById('destination-notes');
      
      if (nameInput) nameInput.value = destination.name;
      if (locationInput) locationInput.value = destination.city;
      
      // Try to select the matching category
      if (categorySelect) {
        for (let i = 0; i < categorySelect.options.length; i++) {
          if (categorySelect.options[i].value === destination.category) {
            categorySelect.selectedIndex = i;
            break;
          }
        }
      }
      
      // Set budget and notes if available
      if (budgetInput) {
        // Extract numeric value from budget if possible
        if (typeof destination.budget === 'string') {
          const matches = destination.budget.match(/\d+/g);
          if (matches && matches.length > 0) {
            budgetInput.value = matches[0];
          } else {
            budgetInput.value = '';
          }
        } else if (typeof destination.budget === 'number') {
          budgetInput.value = destination.budget;
        }
      }
      
      if (notesInput) notesInput.value = destination.description || '';
      
      // Set the edit item ID
      destinationForm.dataset.editItemId = destination.id;
      
      // Show the form
      destinationForm.style.display = 'block';
    });
  }
  
  const deleteBtn = destinationItem.querySelector('.delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      // Remove from UI
      destinationItem.remove();
      
      // Remove from tripData
      const index = tripData.selected_destinations.findIndex(d => d.id === destination.id);
      if (index !== -1) {
        tripData.selected_destinations.splice(index, 1);
      }
      
      // Update trip summary
      updateTripSummary();
    });
  }
  
  // Add the destination item to the list
  destinationsList.appendChild(destinationItem);
}

// Function to update the trip summary based on selected destinations
function updateTripSummary() {
  // Update destination count
  const destinationsCount = document.getElementById('trip-destinations-count');
  if (destinationsCount) {
    destinationsCount.textContent = tripData.selected_destinations.length;
  }
  
  // Calculate and update budget
  const totalBudget = calculateTotalBudget();
  const tripBudgetElement = document.getElementById('trip-budget');
  if (tripBudgetElement) {
    tripBudgetElement.textContent = tripData.budget;
  }
  
  // Update travel days display if element exists
  const travelDaysElement = document.getElementById('trip-travel-days');
  if (travelDaysElement) {
    travelDaysElement.textContent = `${tripData.travel_days} day${tripData.travel_days > 1 ? 's' : ''}`;
  }
  
  // Update route info if available
  const routeInfoElement = document.getElementById('trip-route-info');
  if (routeInfoElement && tripData.route_info) {
    const hours = Math.floor(tripData.route_info.time_min / 60);
    const mins = Math.round(tripData.route_info.time_min % 60);
    const timeString = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    
    routeInfoElement.innerHTML = `
      <div class="route-info-item">
        <i class="fas fa-road"></i> ${tripData.route_info.distance_km.toFixed(1)} km
      </div>
      <div class="route-info-item">
        <i class="fas fa-clock"></i> ${timeString}
      </div>
    `;
  }
}

// Function to update the planner schedule display
function updatePlannerScheduleDisplay() {
  const plannerContainer = document.getElementById('destination-planner');
  if (!plannerContainer) return;
  
  // Check if schedule section already exists
  let scheduleSection = plannerContainer.querySelector('.planner-schedule-section');
  
  if (!scheduleSection) {
    // Create schedule section if it doesn't exist
    scheduleSection = document.createElement('div');
    scheduleSection.className = 'planner-schedule-section';
    scheduleSection.innerHTML = `
      <h4><i class="fas fa-calendar-alt"></i> Travel Schedule</h4>
      <div class="planner-schedule-content"></div>
    `;
    
    // Insert before the summary section
    const summarySection = plannerContainer.querySelector('.summary-section');
    if (summarySection) {
      plannerContainer.insertBefore(scheduleSection, summarySection);
    } else {
      plannerContainer.appendChild(scheduleSection);
    }
  }
  
  // Update schedule content
  const scheduleContent = scheduleSection.querySelector('.planner-schedule-content');
  if (scheduleContent && tripData.daily_schedule.length > 0) {
    let scheduleHtml = `
      <div class="schedule-overview">
        <div class="schedule-stat">
          <i class="fas fa-calendar"></i> ${tripData.travel_days} Days
        </div>
        <div class="schedule-stat">
          <i class="fas fa-map-marker-alt"></i> ${tripData.selected_destinations.length} Places
        </div>
    `;
    
    if (tripData.route_info) {
      const hours = Math.floor(tripData.route_info.time_min / 60);
      const mins = Math.round(tripData.route_info.time_min % 60);
      const timeString = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
      
      scheduleHtml += `
        <div class="schedule-stat">
          <i class="fas fa-road"></i> ${tripData.route_info.distance_km.toFixed(1)} km
        </div>
        <div class="schedule-stat">
          <i class="fas fa-clock"></i> ${timeString}
        </div>
      `;
    }
    
    scheduleHtml += `</div>`;
    
    // Add mini day view
    scheduleHtml += `<div class="mini-schedule">`;
    tripData.daily_schedule.forEach((dayPlan, index) => {
      scheduleHtml += `
        <div class="mini-day">
          <div class="mini-day-header">Day ${dayPlan.day}</div>
          <div class="mini-day-destinations">${dayPlan.destinations.length} places</div>
        </div>
      `;
    });
    scheduleHtml += `</div>`;
    
    scheduleContent.innerHTML = scheduleHtml;
  } else if (scheduleContent) {
    scheduleContent.innerHTML = `
      <div class="no-schedule">
        <i class="fas fa-calendar-plus"></i>
        <p>Add destinations to generate a travel schedule</p>
      </div>
    `;
  }
}

// Add routing section to the trip planner
function addRoutingSection() {
  const routingSection = document.createElement('div');
  routingSection.className = 'routing-section';
  routingSection.innerHTML = `
    <h3>Plan Your Route</h3>
    <div class="routing-controls">
      <div class="route-points">
        <div class="route-start">
          <label>Start from:</label>
          <select id="route-start-select"></select>
        </div>
        <div class="route-end">
          <label>End at:</label>
          <select id="route-end-select"></select>
        </div>
      </div>
      <div class="route-waypoints">
        <label>Include stops:</label>
        <div id="waypoints-container"></div>
      </div>
      <button id="calculate-route-btn" class="calculate-route-btn">
        <i class="fas fa-route"></i> Calculate Route
      </button>
    </div>
    <div id="route-results" class="route-results" style="display: none;">
      <div class="route-summary">
        <div class="route-detail">
          <i class="fas fa-road"></i> Distance: <span id="route-distance">0 km</span>
        </div>
        <div class="route-detail">
          <i class="fas fa-clock"></i> Estimated Time: <span id="route-time">0 min</span>
        </div>
      </div>
    </div>
  `;

  // Add the routing section to the trip planner
  const tripPlanner = document.querySelector('.trip-planner');
  if (tripPlanner) {
    tripPlanner.appendChild(routingSection);
  }

  // Initialize routing controls
  initializeRoutingControls();
}

// Initialize routing controls
function initializeRoutingControls() {
  const startSelect = document.getElementById('route-start-select');
  const endSelect = document.getElementById('route-end-select');
  const waypointsContainer = document.getElementById('waypoints-container');
  const calculateRouteBtn = document.getElementById('calculate-route-btn');

  // Clear existing options
  if (startSelect) startSelect.innerHTML = '';
  if (endSelect) endSelect.innerHTML = '';
  if (waypointsContainer) waypointsContainer.innerHTML = '';

  // Get destinations with coordinates
  const destinations = tripData.selected_destinations.filter(dest => 
    dest.latitude && dest.longitude
  );

  if (destinations.length < 2) {
    if (calculateRouteBtn) {
      calculateRouteBtn.disabled = true;
      calculateRouteBtn.title = 'Need at least 2 destinations with coordinates to calculate route';
    }
    return;
  }

  // Add options to start and end selects
  destinations.forEach((dest, index) => {
    const option = document.createElement('option');
    option.value = dest.name;
    option.textContent = dest.name;
    option.dataset.lat = dest.latitude;
    option.dataset.lng = dest.longitude;

    if (startSelect) startSelect.appendChild(option.cloneNode(true));
    if (endSelect) endSelect.appendChild(option.cloneNode(true));

    // Set default selections
    if (index === 0) startSelect.selectedIndex = 0;
    if (index === destinations.length - 1) endSelect.selectedIndex = destinations.length - 1;
  });

  // Add waypoints checkboxes
  destinations.slice(1, -1).forEach(dest => {
    const waypointDiv = document.createElement('div');
    waypointDiv.className = 'waypoint-item';
    waypointDiv.innerHTML = `
      <input type="checkbox" id="waypoint-${dest.name.replace(/\s+/g, '-')}" 
        data-name="${dest.name}" data-lat="${dest.latitude}" data-lng="${dest.longitude}" checked>
      <label for="waypoint-${dest.name.replace(/\s+/g, '-')}">${dest.name}</label>
    `;
    if (waypointsContainer) waypointsContainer.appendChild(waypointDiv);
  });

  // Add event listener to calculate route button
  if (calculateRouteBtn) {
    calculateRouteBtn.disabled = false;
    calculateRouteBtn.addEventListener('click', calculateRoute);
  }
}

// Calculate route between selected points
function calculateRoute() {
  const startSelect = document.getElementById('route-start-select');
  const endSelect = document.getElementById('route-end-select');
  const calculateRouteBtn = document.getElementById('calculate-route-btn');
  const routeResults = document.getElementById('route-results');

  if (!startSelect || !endSelect || !calculateRouteBtn) return;

  // Get selected points
  const startOption = startSelect.options[startSelect.selectedIndex];
  const endOption = endSelect.options[endSelect.selectedIndex];

  // Get waypoints
  const waypoints = [];
  document.querySelectorAll('#waypoints-container input[type="checkbox"]:checked').forEach(checkbox => {
    waypoints.push({
      name: checkbox.dataset.name,
      lat: parseFloat(checkbox.dataset.lat),
      lng: parseFloat(checkbox.dataset.lng)
    });
  });

  // Create route points array
  const routePoints = [
    {
      name: startOption.value,
      lat: parseFloat(startOption.dataset.lat),
      lng: parseFloat(startOption.dataset.lng)
    },
    ...waypoints,
    {
      name: endOption.value,
      lat: parseFloat(endOption.dataset.lat),
      lng: parseFloat(endOption.dataset.lng)
    }
  ];

  // Update button state
  calculateRouteBtn.disabled = true;
  calculateRouteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calculating...';

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
    calculateRouteBtn.disabled = false;
    calculateRouteBtn.innerHTML = '<i class="fas fa-route"></i> Calculate Route';

    if (data.route) {
      // Display route on map if map manager is available
      if (typeof window.displayRouteOnMap === 'function') {
        const routeSummary = window.displayRouteOnMap(data.route, routePoints);
        
        // Update route summary
        const routeDistanceElement = document.getElementById('route-distance');
        const routeTimeElement = document.getElementById('route-time');
        
        if (routeDistanceElement) {
          routeDistanceElement.textContent = `${data.route.distance_km.toFixed(1)} km`;
        }
        
        if (routeTimeElement) {
          const hours = Math.floor(data.route.time_min / 60);
          const mins = Math.round(data.route.time_min % 60);
          routeTimeElement.textContent = hours > 0 ? 
            `${hours} h ${mins} min` : 
            `${mins} min`;
        }
        
        // Show route results
        if (routeResults) {
          routeResults.style.display = 'block';
        }
        
        // Scroll to map
        const mapElement = document.getElementById('map');
        if (mapElement) {
          mapElement.scrollIntoView({ behavior: 'smooth' });
        }
      }
    } else {
      alert('Could not calculate a route between these points. Please try different locations.');
    }
  })
  .catch(error => {
    console.error('Error calculating route:', error);
    
    // Reset button
    calculateRouteBtn.disabled = false;
    calculateRouteBtn.innerHTML = '<i class="fas fa-route"></i> Calculate Route';
    
    alert('Error calculating route. Please try again.');
  });
} 