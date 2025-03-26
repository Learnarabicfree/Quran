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

// Load saved credentials if "Remember Me" was checked previously
const savedCredentials = localStorage.getItem('savedCredentials');
if (savedCredentials) {
  try {
    const credentials = JSON.parse(savedCredentials);
    document.getElementById('username').value = credentials.username;
    document.getElementById('password').value = credentials.password;
    rememberMeCheckbox.checked = true;
    
    // Trigger the visual checked state
    document.querySelector('.checkmark').style.backgroundColor = '#2B6D4F';
    document.querySelector('.checkmark').style.borderColor = '#2B6D4F';
    document.querySelector('.checkmark').style.display = 'after';
  } catch (e) {
    console.error('Error loading saved credentials:', e);
    localStorage.removeItem('savedCredentials');
  }
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
      // WARNING: Storing passwords in localStorage is not secure
      // This is for demonstration purposes only
      const credentials = {
        username: username,
        password: password
      };
      localStorage.setItem('savedCredentials', JSON.stringify(credentials));
    } else {
      localStorage.removeItem('savedCredentials');
    }

    // Update UI
    document.getElementById('username-display').textContent = user.username;
    
    // Smooth transition animation
    loginPage.style.opacity = '0';
    loginPage.style.transform = 'translateY(-20px)';
    loginPage.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';

    setTimeout(() => {
      // Reload the page after the animation completes
      window.location.reload();
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

// Add logout functionality to clear credentials
function logout() {
  sessionStorage.removeItem('loggedIn');
  sessionStorage.removeItem('userRole');
  sessionStorage.removeItem('username');
  localStorage.removeItem('savedCredentials');
  window.location.href = window.location.href;
}