// UI Management for WerTigo Application

/* Nav bar toggle */
function initNavbarToggle() {
  let menuIcon = document.querySelector('#menu-icon');
  let navbar = document.querySelector('.navbar');

  if (menuIcon) {
    menuIcon.onclick = () => {
      menuIcon.classList.toggle('fa-xmark');
      navbar.classList.toggle('active');
    };
  }
}

/* Transparent scrolling */
function initTransparentScrolling() {
  const header = document.querySelector('.header');
  
  if (header) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        header.classList.add('header-scrolled');
      } else if (window.scrollY <= 50) {
        header.classList.remove('header-scrolled');
      }
    });
  }
}

/* Scroll section active link */
function initActiveLinks() {
  let sections = document.querySelectorAll('section'); 
  let navLinks = document.querySelectorAll('header nav a');
  let header = document.querySelector('header');
  let menuIcon = document.querySelector('#menu-icon');
  let navbar = document.querySelector('.navbar');

  window.onscroll = () => {
    if (sections.length > 0 && navLinks.length > 0) {
      sections.forEach(sec => {
        let top = window.scrollY;
        let offset = sec.offsetTop - 150;
        let height = sec.offsetHeight;
        let id = sec.getAttribute('id');

        if (top >= offset && top < offset + height) {
          navLinks.forEach(links => {
            links.classList.remove('active');
            
            // Fix the selector syntax
            try {
              document.querySelector('header nav a[href="#' + id + '"]').classList.add('active');
            } catch(e) {
              console.log('Could not find selector for: ' + id);
            }
          });
        }
      });
    }
    
    /* sticky navbar */
    if (header) {
      header.classList.toggle('sticky', window.scrollY > 100);
    }

    /* remove toggle icon and navbar */
    if (menuIcon && navbar) {
      menuIcon.classList.remove('fa-xmark');
      navbar.classList.remove('active');
    }
  };
}

/* Sign up/sign in popup functionality */
function initAuthPopups() {
  // Get the elements
  const signUpBox = document.getElementById('signUpBox');
  const signInBox = document.getElementById('signInBox');
  const toggleToSignUp = document.getElementById('toggleToSignUp');
  const toggleToSignIn = document.getElementById('toggleToSignIn');

  if (signUpBox && signInBox && toggleToSignUp && toggleToSignIn) {
    // Initially show the Sign Up box and hide the Sign In box
    signUpBox.style.display = 'block'; // Show the sign up form initially
    signInBox.style.display = 'none'; // Hide the sign in form initially

    // When the user clicks on "Don't have an account? Sign Up", show the sign up form
    toggleToSignUp.addEventListener('click', () => {
      signUpBox.style.display = 'block';
      signInBox.style.display = 'none'; // Hide the sign in form
    });

    // When the user clicks on "Already have an account? Sign In", show the sign in form
    toggleToSignIn.addEventListener('click', () => {
      signInBox.style.display = 'block';
      signUpBox.style.display = 'none'; // Hide the sign up form
    });
  }
}

/* Initialize UI components */
function initUI() {
  initNavbarToggle();
  initTransparentScrolling();
  initActiveLinks();
  initAuthPopups();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initUI); 