// Planner manager functions for WerTigo Trip Planner

// Function to initialize trip planner
function initTripPlanner() {
  // Add Day button
  document.addEventListener('click', function(e) {
    if (e.target.id === 'add-day-btn' || e.target.closest('#add-day-btn')) {
      addNewDay();
    }
  });
  
  // Day tab selection
  document.addEventListener('click', function(e) {
    const dayTab = e.target.closest('.day-tab');
    if (dayTab && !dayTab.classList.contains('add-day')) {
      const day = dayTab.dataset.day;
      switchToDay(day);
    }
  });
  
  // Add Activity buttons
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('add-activity-btn') || e.target.closest('.add-activity-btn')) {
      const btn = e.target.closest('.add-activity-btn');
      const day = btn.id.replace('add-activity-btn-', '');
      showActivityForm(day);
    }
  });
  
  // Add Destination button
  document.getElementById('add-destination-btn').addEventListener('click', function() {
    showDestinationForm();
  });
  
  // Cancel destination button
  document.getElementById('cancel-destination-btn').addEventListener('click', function() {
    hideDestinationForm();
  });
  
  // Save destination button
  document.getElementById('save-destination-btn').addEventListener('click', function() {
    saveDestination();
  });
  
  // Cancel activity buttons
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('cancel-activity-btn')) {
      const day = e.target.dataset.day;
      hideActivityForm(day);
    }
  });
  
  // Save activity buttons
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('save-activity-btn')) {
      const day = e.target.dataset.day;
      saveActivity(day);
    }
  });
  
  // Clear planner button
  document.getElementById('clear-planner-btn').addEventListener('click', function() {
    if (confirm('Are you sure you want to clear the planner?')) {
      resetPlanner();
      window.plannerData = {
        destination: window.plannerData ? window.plannerData.destination : null,
        days: 1,
        activities: [],
        totalBudget: 0
      };
      updatePlannerStats();
    }
  });
  
  // Save plan button
  document.getElementById('save-planner-btn').addEventListener('click', function() {
    savePlan();
  });
  
  // Delete activity buttons (delegated event)
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('delete-activity-btn') || e.target.closest('.delete-activity-btn')) {
      const btn = e.target.closest('.delete-activity-btn');
      const activityId = btn.dataset.id;
      deleteActivity(activityId);
    }
  });
  
  // Delete destination buttons (delegated event)
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('destination-item-btn') || e.target.closest('.destination-item-btn')) {
      const btn = e.target.closest('.destination-item-btn');
      if (btn.classList.contains('delete-destination-btn')) {
        const destinationId = btn.dataset.id;
        deleteDestination(destinationId);
      }
    }
  });
}

// Function to reset the planner to initial state
function resetPlanner() {
  // Clear activities
  const activitiesList = document.getElementById('day-1-activities');
  if (activitiesList) {
    activitiesList.innerHTML = '';
  }
  
  // Clear destinations list
  const destinationsList = document.getElementById('destinations-list');
  if (destinationsList) {
    destinationsList.innerHTML = '';
  }
  
  // Reset day tabs - keep only Day 1 and add day button
  const daysTabsContainer = document.getElementById('planner-days-tabs');
  if (daysTabsContainer) {
    daysTabsContainer.innerHTML = `
      <div class="day-tab active" data-day="1">Day 1</div>
      <div class="day-tab add-day" id="add-day-btn">
        <i class="fas fa-plus"></i> Add Day
      </div>
    `;
  }
  
  // Make sure only day 1 content is visible
  document.querySelectorAll('.day-content').forEach(content => {
    content.classList.remove('active');
    if (content.dataset.day === '1') {
      content.classList.add('active');
    }
  });
  
  // Reset stats
  document.getElementById('trip-days-count').textContent = '1';
  document.getElementById('trip-destinations-count').textContent = '0';
  document.getElementById('trip-activities-count').textContent = '0';
  document.getElementById('trip-budget').textContent = '₱0';
  
  // Hide forms
  const activityForm = document.getElementById('activity-form-1');
  if (activityForm) {
    activityForm.style.display = 'none';
  }
  
  const destinationForm = document.getElementById('destination-form');
  if (destinationForm) {
    destinationForm.style.display = 'none';
  }
  
  // Show add buttons
  const addDestBtn = document.getElementById('add-destination-btn');
  if (addDestBtn) {
    addDestBtn.style.display = 'flex';
  }
}

// Function to update planner statistics
function updatePlannerStats() {
  if (!window.plannerData) return;
  
  // Update days count
  document.getElementById('trip-days-count').textContent = window.plannerData.days;
  
  // Update activities count
  const activitiesCount = window.plannerData.activities ? window.plannerData.activities.length : 0;
  document.getElementById('trip-activities-count').textContent = activitiesCount;
  
  // Update budget - using the destination budget for now
  document.getElementById('trip-budget').textContent = `₱${window.plannerData.totalBudget.toLocaleString()}`;
}

// Function to save the plan
function savePlan() {
  if (!window.plannerData || !window.plannerData.destinations || window.plannerData.destinations.length === 0) {
    alert('No destinations to save. Please add at least one destination first.');
    return;
  }
  
  // Prepare trip data
  const tripData = {
    destination: window.plannerData.destinations[0].city || window.plannerData.destinations[0].name,
    selected_destination_data: window.plannerData.destinations[0],
    days: window.plannerData.days,
    activities: window.plannerData.activities || [],
    budget: window.plannerData.totalBudget,
    travelers: 1  // Default value
  };
  
  // Create trip in the backend
  fetch(getApiUrl('/create_trip'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(tripData)
  })
  .then(response => response.json())
  .then(data => {
    if (data.trip) {
      // Show success message
      alert('Trip plan saved successfully!');
      
      // Add a message to the chat
      addMessage(`
        <div class="trip-confirmation">
          <h3>Trip Plan Saved!</h3>
          <p>Your trip to ${tripData.destination} has been saved. You can view and manage it from your account.</p>
        </div>
      `, false);
    } else if (data.error) {
      alert(`Error saving trip: ${data.error}`);
    }
  })
  .catch(error => {
    console.error('Error saving trip:', error);
    alert('There was an error saving your trip. Please try again.');
  });
}

// Initialize the planner when document is loaded
document.addEventListener('DOMContentLoaded', function() {
  initTripPlanner();
}); 