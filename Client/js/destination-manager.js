// Destination management functions for WerTigo Trip Planner

// Function to show the destination form
function showDestinationForm() {
  const form = document.getElementById('destination-form');
  if (form) {
    form.style.display = 'block';
    document.getElementById('add-destination-btn').style.display = 'none';
    
    // Focus the first input
    document.getElementById('destination-name').focus();
  }
}

// Function to hide the destination form
function hideDestinationForm() {
  const form = document.getElementById('destination-form');
  if (form) {
    form.style.display = 'none';
    document.getElementById('add-destination-btn').style.display = 'flex';
    
    // Clear form inputs
    document.getElementById('destination-name').value = '';
    document.getElementById('destination-location').value = '';
    document.getElementById('destination-budget').value = '';
    document.getElementById('destination-notes').value = '';
  }
}

// Function to save a destination
function saveDestination() {
  // Get form values
  const name = document.getElementById('destination-name').value.trim();
  const location = document.getElementById('destination-location').value.trim();
  const category = document.getElementById('destination-category').value;
  const budget = parseInt(document.getElementById('destination-budget').value) || 0;
  const notes = document.getElementById('destination-notes').value.trim();
  
  // Validate
  if (!name) {
    alert('Please enter a name for the destination.');
    return;
  }
  
  // Generate a unique ID for this destination
  const destinationId = 'destination-' + Date.now();
  
  // Create destination object
  const destination = {
    id: destinationId,
    name,
    city: location,
    category,
    budget,
    description: notes,
    rating: 4 // Default rating
  };
  
  // Display in planner
  displayDestinationInPlanner(destination);
  
  // Hide the form
  hideDestinationForm();
}

// Function to add a destination to the list
function addDestinationToList(destination) {
  const destinationsList = document.getElementById('destinations-list');
  if (!destinationsList) return;
  
  // Don't add if this destination is already in the list
  if (document.getElementById(destination.id)) return;
  
  // Create destination element
  const destinationElement = document.createElement('div');
  destinationElement.className = 'destination-item';
  destinationElement.id = destination.id;
  
  const budgetDisplay = destination.budget ? `₱${typeof destination.budget === 'number' ? destination.budget.toLocaleString() : destination.budget}` : '';
  
  destinationElement.innerHTML = `
    <div class="destination-item-body">
      <div class="destination-item-header">
        <div class="destination-item-name">${destination.name}</div>
        <div class="destination-item-category">${destination.category || 'General'}</div>
      </div>
      <div class="destination-item-details">
        <div>${destination.city || 'Unknown location'}</div>
        ${budgetDisplay ? `<div class="destination-item-budget">${budgetDisplay}</div>` : ''}
      </div>
    </div>
    <div class="destination-item-actions">
      <button class="destination-item-btn delete-destination-btn" data-id="${destination.id}">
        <i class="fas fa-trash-alt"></i>
      </button>
    </div>
  `;
  
  // Add to the destinations list
  destinationsList.appendChild(destinationElement);
}

// Function to delete a destination
function deleteDestination(destinationId) {
  // Remove from DOM
  const destinationElement = document.getElementById(destinationId);
  if (!destinationElement) return;
  
  destinationElement.remove();
  
  // Remove from planner data
  if (window.plannerData && window.plannerData.destinations) {
    const destinationToRemove = window.plannerData.destinations.find(dest => dest.id === destinationId);
    
    if (destinationToRemove && destinationToRemove.budget) {
      // Calculate budget to remove
      let budgetToRemove = 0;
      if (typeof destinationToRemove.budget === 'number') {
        budgetToRemove = destinationToRemove.budget;
      } else if (typeof destinationToRemove.budget === 'string') {
        // Try to extract a number from the budget string
        const matches = destinationToRemove.budget.match(/(\d+)/g);
        if (matches && matches.length > 0) {
          budgetToRemove = parseInt(matches[0]);
        }
      }
      
      // Update total budget
      window.plannerData.totalBudget -= budgetToRemove;
      if (window.plannerData.totalBudget < 0) window.plannerData.totalBudget = 0;
      
      // Update the display
      document.getElementById('trip-budget').textContent = `₱${window.plannerData.totalBudget.toLocaleString()}`;
    }
    
    // Remove from destinations array
    window.plannerData.destinations = window.plannerData.destinations.filter(dest => dest.id !== destinationId);
    
    // Update the destination count
    const destinationsCount = window.plannerData.destinations.length;
    document.getElementById('trip-destinations-count').textContent = destinationsCount;
  }
}

// Function to geocode a destination by name
function geocodeDestination(locationName) {
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

// Function to display destination in the planner
function displayDestinationInPlanner(destination) {
  // Show the planner container
  const planner = document.getElementById('destination-planner');
  planner.style.display = 'block';
  
  // Update destination details
  document.getElementById('planner-destination-name').textContent = destination.name;
  document.getElementById('planner-destination-city').textContent = destination.city || 'Unknown location';
  document.getElementById('planner-destination-category').textContent = destination.category || 'General';
  
  // Update rating with stars
  const rating = destination.rating || 0;
  const starRating = getStarRating(rating);
  document.getElementById('planner-destination-rating').innerHTML = starRating;
  
  // Update description
  document.getElementById('planner-destination-description').textContent = destination.description || 'No description available.';
  
  // If the destination has coordinates, show it on the map
  if (destination.latitude && destination.longitude) {
    // Update map center
    map.setView([destination.latitude, destination.longitude], 13);
    
    // Add marker
    const marker = L.marker([destination.latitude, destination.longitude])
      .addTo(map)
      .bindPopup(`<b>${destination.name}</b><br>${destination.city}`);
    
    // Add to current markers so it can be cleared if needed
    currentRouteMarkers.push(marker);
  } else {
    // Try to geocode the city name
    geocodeDestination(destination.city || destination.name);
  }
  
  // Initialize planner data if it doesn't exist
  if (!window.plannerData) {
    // Clear existing activities and reset the planner
    resetPlanner();
    
    window.plannerData = {
      destinations: [],
      days: 1,
      activities: [],
      totalBudget: 0
    };
  }
  
  // Generate a unique ID if the destination doesn't have one
  if (!destination.id) {
    destination.id = 'destination-' + Date.now();
  }
  
  // Add to the destinations list
  addDestinationToList(destination);
  
  // Add to the destinations array if not already present
  if (!window.plannerData.destinations) {
    window.plannerData.destinations = [];
  }
  
  // Check if this destination already exists
  const existingIndex = window.plannerData.destinations.findIndex(d => 
    d.id === destination.id || (d.name === destination.name && d.city === destination.city)
  );
  
  // Only add if it's not already in the planner
  if (existingIndex === -1) {
    window.plannerData.destinations.push(destination);
  }
  
  // Update trip budget if available
  if (destination.budget) {
    let budgetValue = 0;
    
    if (typeof destination.budget === 'string') {
      // Try to extract a number from the budget string
      const matches = destination.budget.match(/(\d+)/g);
      if (matches && matches.length > 0) {
        budgetValue = parseInt(matches[0]);
      } else if (destination.budget.toLowerCase().includes('low')) {
        budgetValue = 5000;
      } else if (destination.budget.toLowerCase().includes('high')) {
        budgetValue = 15000;
      } else {
        budgetValue = 10000; // Default medium budget
      }
    } else if (typeof destination.budget === 'number') {
      budgetValue = destination.budget;
    }
    
    // Only add to the budget if it's a new destination
    if (existingIndex === -1) {
      // Update planner data
      if (!window.plannerData.totalBudget) {
        window.plannerData.totalBudget = 0;
      }
      window.plannerData.totalBudget += budgetValue;
      
      // Update the display
      document.getElementById('trip-budget').textContent = `₱${window.plannerData.totalBudget.toLocaleString()}`;
    }
  }
  
  // Update the destination count
  const destinationsCount = window.plannerData.destinations.length;
  document.getElementById('trip-destinations-count').textContent = destinationsCount;
  
  // Scroll to the planner
  planner.scrollIntoView({ behavior: 'smooth' });
}

// Initialize destination functions when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Add Destination button
  const addDestBtn = document.getElementById('add-destination-btn');
  if (addDestBtn) {
    addDestBtn.addEventListener('click', function() {
      showDestinationForm();
    });
  }
  
  // Cancel destination button
  const cancelDestBtn = document.getElementById('cancel-destination-btn');
  if (cancelDestBtn) {
    cancelDestBtn.addEventListener('click', function() {
      hideDestinationForm();
    });
  }
  
  // Save destination button
  const saveDestBtn = document.getElementById('save-destination-btn');
  if (saveDestBtn) {
    saveDestBtn.addEventListener('click', function() {
      saveDestination();
    });
  }
  
  // Delete destination buttons (delegated event)
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('delete-destination-btn') || e.target.closest('.delete-destination-btn')) {
      const btn = e.target.closest('.delete-destination-btn');
      const destinationId = btn.dataset.id;
      deleteDestination(destinationId);
    }
  });
}); 