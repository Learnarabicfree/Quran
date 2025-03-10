if (sessionStorage.getItem('loggedIn') === 'true') {
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('main-content').style.display = 'block';
}

const loginPage = document.getElementById('login-page');
const mainContent = document.getElementById('main-content');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');

loginForm.addEventListener('submit', function (event) {
  event.preventDefault();

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  const user = users.find(user => user.username.toLowerCase() === username.toLowerCase() && user.password === password);

  if (user) {
    sessionStorage.setItem('loggedIn', 'true');
    sessionStorage.setItem('userRole', user.role);
    sessionStorage.setItem('username', user.username);
    document.getElementById('username-display').textContent = user.username;
    
    loginPage.style.opacity = '0';
    loginPage.style.transform = 'translateY(-20px)';
    loginPage.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';

    setTimeout(() => {
      loginPage.style.display = 'none';
      mainContent.style.display = 'block';
    }, 500);
  } else {
    loginError.style.display = 'block';
  }
});