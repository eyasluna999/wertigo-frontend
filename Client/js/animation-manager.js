// Animation and Effects Management for WerTigo Application

/* Slideshow functionality */
function initSlideshow() {
  // Get all the slides and total number of slides
  const slides = document.querySelectorAll('.slide');
  const totalSlides = slides.length;
  
  if (totalSlides > 0) {
    let currentSlideIndex = 0;

    // Function to set the background image of the section with a sliding effect
    function setBackgroundImage(index) {
      const homeSection = document.querySelector('.home');
      if (homeSection) {
        const bgImage = slides[index].getAttribute('data-bg'); // Get the background image from the data attribute
        
        // Triggering the background image change with animation
        homeSection.style.backgroundImage = `url(${bgImage})`; // Set the background image of the section

        // Apply the fade from left to right animation
        homeSection.style.animation = 'fadeFromLeft 1s ease-in-out'; // Trigger the slide animation
      }
    }

    // Function to move to the next slide
    function nextSlide() {
      currentSlideIndex = (currentSlideIndex + 1) % totalSlides; // Loop back to the first slide
      setBackgroundImage(currentSlideIndex);
    }

    // Initially set the background image of the first slide
    setBackgroundImage(currentSlideIndex);

    // Change to the next slide every 3500ms (3.5 seconds)
    setInterval(nextSlide, 3500); // Change slide every 3500ms
  }
}

/* Carousel/Slides functionality */
function initCarousel() {
  const slides = document.querySelectorAll('.slide');
  if (slides.length > 0) {
    let currentSlide = 0;
    
    function showSlide(index) {
      slides.forEach((slide, i) => {
        if (i === index) {
          slide.style.display = 'block';
        } else {
          slide.style.display = 'none';
        }
      });
    }
    
    function nextSlide() {
      currentSlide = (currentSlide + 1) % slides.length;
      showSlide(currentSlide);
    }
    
    // Initialize with the first slide
    showSlide(0);
    
    // Auto-advance slides every 5 seconds
    setInterval(nextSlide, 5000);
  }
}

/* Typed.js for text animation */
function initTypedText() {
  // Check if Typed.js is available
  if (typeof Typed !== 'undefined') {
    const typedTextElement = document.querySelector('.multiple-text');
    if (typedTextElement) {
      const typed = new Typed('.multiple-text', {
        strings: ['Bohol', 'Boracay', 'El Nido'],
        typeSpeed: 40,
        backSpeed: 20,
        backDelay: 3000,
        startDelay: 0,
        loop: true,
      });
    }
  }
}

/* Scroll Reveal for animation on scroll */
function initScrollReveal() {
  // Check if ScrollReveal is available
  if (typeof ScrollReveal === 'function') {
    window.sr = ScrollReveal();

    ScrollReveal({
      distance: '80px',
      duration: 2000,
      delay: 200,
    });

    ScrollReveal().reveal('.home-content, heading', {origin: 'top'});
    ScrollReveal().reveal('.home-img, .services-container, .portfolio-box, .contact form', {origin: 'bottom'});
    ScrollReveal().reveal('.home-content h1, .about-img', {origin: 'left'});
    ScrollReveal().reveal('.home-contact p, about-content', {origin: 'right'});
    ScrollReveal().reveal('.skills', {origin: 'right'});
  }
}

/* Initialize animations */
function initAnimations() {
  initTypedText();
  initScrollReveal();
  
  // Only run one of these as they might conflict
  const isHomePage = document.querySelector('.home');
  if (isHomePage) {
    initSlideshow();
  } else {
    initCarousel();
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initAnimations); 