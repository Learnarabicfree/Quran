// Check if user is already logged in
if (sessionStorage.getItem('loggedIn') === 'true') {
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('main-content').style.display = 'block';
  document.getElementById('username-display').textContent = sessionStorage.getItem('username');
}

// DOM elements
const loginPage = document.getElementById('login-page');
const mainContent = document.getElementById('main-content');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const rememberMeCheckbox = document.getElementById('rememberMe');

// Load saved username if "Remember Me" was checked previously
const savedUsername = localStorage.getItem('savedUsername');
const rememberMe = localStorage.getItem('rememberMe') === 'true';
if (rememberMe && savedUsername) {
  document.getElementById('username').value = savedUsername;
  rememberMeCheckbox.checked = true;
  
  // Trigger the visual checked state
  document.querySelector('.checkmark').style.backgroundColor = '#2B6D4F';
  document.querySelector('.checkmark').style.borderColor = '#2B6D4F';
  document.querySelector('.checkmark').style.display = 'after';
}

// Login form submission
loginForm.addEventListener('submit', function (event) {
  event.preventDefault();

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const rememberMe = rememberMeCheckbox.checked;

  // Find user in your users array
  const user = users.find(user => 
    user.username.toLowerCase() === username.toLowerCase() && 
    user.password === password
  );

  if (user) {
    // Save session
    sessionStorage.setItem('loggedIn', 'true');
    sessionStorage.setItem('userRole', user.role);
    sessionStorage.setItem('username', user.username);
    
    // Handle "Remember Me" functionality
    if (rememberMe) {
      localStorage.setItem('rememberMe', 'true');
      localStorage.setItem('savedUsername', username);
    } else {
      localStorage.removeItem('rememberMe');
      localStorage.removeItem('savedUsername');
    }

    // Update UI
    document.getElementById('username-display').textContent = user.username;
    
    // Smooth transition animation
    loginPage.style.opacity = '0';
    loginPage.style.transform = 'translateY(-20px)';
    loginPage.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';

    setTimeout(() => {
      loginPage.style.display = 'none';
      mainContent.style.display = 'block';
      
      // Additional animation for main content appearance
      mainContent.style.opacity = '0';
      mainContent.style.transform = 'translateY(20px)';
      mainContent.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
      
      setTimeout(() => {
        mainContent.style.opacity = '1';
        mainContent.style.transform = 'translateY(0)';
      }, 50);
    }, 500);
  } else {
    // Shake animation for invalid login
    loginError.style.display = 'block';
    loginForm.style.animation = 'shake 0.5s';
    setTimeout(() => {
      loginForm.style.animation = '';
    }, 500);
  }
});