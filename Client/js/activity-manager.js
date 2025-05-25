// Activity management functions for WerTigo Trip Planner

// Function to add a new day to the planner
function addNewDay() {
  // Get the current number of days
  const daysTabsContainer = document.getElementById('planner-days-tabs');
  const dayTabs = daysTabsContainer.querySelectorAll('.day-tab:not(.add-day)');
  const newDayNumber = dayTabs.length + 1;
  
  // Create new day tab
  const newDayTab = document.createElement('div');
  newDayTab.className = 'day-tab';
  newDayTab.dataset.day = newDayNumber;
  newDayTab.textContent = `Day ${newDayNumber}`;
  
  // Insert before the add button
  const addDayBtn = document.getElementById('add-day-btn');
  daysTabsContainer.insertBefore(newDayTab, addDayBtn);
  
  // Create day content
  const newDayContent = document.createElement('div');
  newDayContent.className = 'day-content';
  newDayContent.dataset.day = newDayNumber;
  newDayContent.innerHTML = `
    <div class="activity-list" id="day-${newDayNumber}-activities">
      <!-- Activities will be added here dynamically -->
    </div>
    
    <button class="add-activity-btn" id="add-activity-btn-${newDayNumber}">
      <i class="fas fa-plus"></i> Add Activity
    </button>
    
    <!-- Add activity form - initially hidden -->
    <div class="activity-form" id="activity-form-${newDayNumber}" style="display: none;">
      <div class="form-row">
        <div class="form-field">
          <label for="activity-name-${newDayNumber}">Activity Name</label>
          <input type="text" id="activity-name-${newDayNumber}" placeholder="E.g., Visit Museum">
        </div>
        <div class="form-field">
          <label for="activity-time-${newDayNumber}">Time</label>
          <input type="text" id="activity-time-${newDayNumber}" placeholder="E.g., 9:00 AM">
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-field">
          <label for="activity-location-${newDayNumber}">Location</label>
          <input type="text" id="activity-location-${newDayNumber}" placeholder="E.g., Downtown">
        </div>
        <div class="form-field">
          <label for="activity-category-${newDayNumber}">Category</label>
          <select id="activity-category-${newDayNumber}">
            <option value="sightseeing">Sightseeing</option>
            <option value="food">Food & Dining</option>
            <option value="shopping">Shopping</option>
            <option value="activity">Activity</option>
            <option value="transportation">Transportation</option>
            <option value="accommodation">Accommodation</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>
      
      <div class="form-field">
        <label for="activity-notes-${newDayNumber}">Notes</label>
        <textarea id="activity-notes-${newDayNumber}" placeholder="Additional details about this activity..."></textarea>
      </div>
      
      <div class="form-actions">
        <button class="planner-btn secondary cancel-activity-btn" data-day="${newDayNumber}">Cancel</button>
        <button class="planner-btn save-activity-btn" data-day="${newDayNumber}">Save Activity</button>
      </div>
    </div>
  `;
  
  // Add to the itinerary planner after the existing day content
  const itineraryPlanner = document.querySelector('.itinerary-planner');
  itineraryPlanner.appendChild(newDayContent);
  
  // Switch to the new day
  switchToDay(newDayNumber);
  
  // Update planner data
  if (window.plannerData) {
    window.plannerData.days = newDayNumber;
    updatePlannerStats();
  }
}

// Function to switch to a specific day
function switchToDay(dayNumber) {
  // Update active tab
  document.querySelectorAll('.day-tab').forEach(tab => {
    tab.classList.remove('active');
    if (tab.dataset.day === dayNumber.toString()) {
      tab.classList.add('active');
    }
  });
  
  // Update active content
  document.querySelectorAll('.day-content').forEach(content => {
    content.classList.remove('active');
    if (content.dataset.day === dayNumber.toString()) {
      content.classList.add('active');
    }
  });
}

// Function to show the activity form for a day
function showActivityForm(day) {
  const form = document.getElementById(`activity-form-${day}`);
  if (form) {
    form.style.display = 'block';
    document.getElementById(`add-activity-btn-${day}`).style.display = 'none';
    
    // Focus the first input
    document.getElementById(`activity-name-${day}`).focus();
  }
}

// Function to hide the activity form for a day
function hideActivityForm(day) {
  const form = document.getElementById(`activity-form-${day}`);
  if (form) {
    form.style.display = 'none';
    document.getElementById(`add-activity-btn-${day}`).style.display = 'flex';
    
    // Clear form inputs
    document.getElementById(`activity-name-${day}`).value = '';
    document.getElementById(`activity-time-${day}`).value = '';
    document.getElementById(`activity-location-${day}`).value = '';
    document.getElementById(`activity-notes-${day}`).value = '';
  }
}

// Function to save an activity
function saveActivity(day) {
  // Get form values
  const name = document.getElementById(`activity-name-${day}`).value.trim();
  const time = document.getElementById(`activity-time-${day}`).value.trim();
  const location = document.getElementById(`activity-location-${day}`).value.trim();
  const category = document.getElementById(`activity-category-${day}`).value;
  const notes = document.getElementById(`activity-notes-${day}`).value.trim();
  
  // Validate
  if (!name) {
    alert('Please enter a name for the activity.');
    return;
  }
  
  // Generate a unique ID for this activity
  const activityId = 'activity-' + Date.now();
  
  // Create activity object
  const activity = {
    id: activityId,
    name,
    time,
    location,
    category,
    notes,
    day: parseInt(day)
  };
  
  // Add to planner data
  if (window.plannerData) {
    if (!window.plannerData.activities) {
      window.plannerData.activities = [];
    }
    window.plannerData.activities.push(activity);
  }
  
  // Create activity element
  const activityElement = document.createElement('div');
  activityElement.className = 'activity-item';
  activityElement.id = activityId;
  activityElement.innerHTML = `
    <div class="activity-time">${time || 'Any time'}</div>
    <div class="activity-info">
      <div class="activity-name">${name}</div>
      <div class="activity-location">${location || 'No location specified'}</div>
    </div>
    <div class="activity-actions">
      <button class="activity-btn delete-activity-btn" data-id="${activityId}">
        <i class="fas fa-trash-alt"></i>
      </button>
    </div>
  `;
  
  // Add to the activity list
  document.getElementById(`day-${day}-activities`).appendChild(activityElement);
  
  // Hide the form
  hideActivityForm(day);
  
  // Update stats
  updatePlannerStats();
  
  // Try to geocode the location and add it to the map
  if (location) {
    geocodeActivityLocation(location, activityId);
  }
}

// Function to delete an activity
function deleteActivity(activityId) {
  // Remove from DOM
  const activityElement = document.getElementById(activityId);
  if (activityElement) {
    activityElement.remove();
  }
  
  // Remove from planner data
  if (window.plannerData && window.plannerData.activities) {
    window.plannerData.activities = window.plannerData.activities.filter(activity => activity.id !== activityId);
  }
  
  // Update stats
  updatePlannerStats();
} 