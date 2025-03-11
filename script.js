// Firebase configuration
const firebaseConfig = {
    databaseURL: "https://quranic-wisdom-default-rtdb.firebaseio.com",
  };
  
  // Initialize Firebase
  const app = firebase.initializeApp(firebaseConfig);
  const database = firebase.database(app);
  const WATCHED_STORAGE_KEY = 'watchedLessons';

  // Add these after firebaseConfig
const languageTranslations = {
    'Sinhala': 'සිංහල',
    'Tamil': 'தமிழ்',
    'English': 'English'
};

const categoryTranslations = {
    'Sinhala': {
        'Courses': 'පාඨමාලා',
        'Surah': 'සූරා',
        'Arabic': 'අරාබි'
    },
    'Tamil': {
        'Courses': 'பாடநெறிகள்',
        'Surah': 'ஸூரா',
        'Arabic': 'அரபு'
    },
    'English': {
        'Courses': 'Courses',
        'Surah': 'Surah',
        'Arabic': 'Arabic'
    }
};

let navigationStack = [];
let currentPosition = -1;
let currentState = {
    language: null,
    category: null,
    searchQuery: null
};
let appData = null; // Stores fetched data from Firebase


document.addEventListener("DOMContentLoaded", async () => {
    await fetchData(); // Fetch data first
    loadState();
    setupEventListeners();
    populateDropdown();
});
  
async function fetchData() {
    try {
        const snapshot = await database.ref('/').once('value');
        appData = snapshot.val();
        populateLanguages(Object.keys(appData));
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

function populateLanguages(languages) {
    const container = document.getElementById("languages-container");
    container.innerHTML = languages.map(language => `
        <div class="card language-card" data-language="${language}">
            <i class="flag fas fa-globe"></i>
            <h3>${languageTranslations[language]}</h3>
        </div>
    `).join("");
}

function populateCategories(categories) {
    const container = document.getElementById("categories-container");
    const currentLang = currentState.language;
    
    container.innerHTML = categories.map(category => `
        <div class="card category-card" data-category="${category}">
            <i class="fas fa-book card-icon"></i>
            <h3>${categoryTranslations[currentLang][category]}</h3>
        </div>
    `).join("");
}

function setupEventListeners() {
    // Language selection
    document.addEventListener("click", (e) => {
        if (e.target.closest(".language-card")) {
            const card = e.target.closest(".language-card");
            currentState.language = card.dataset.language;
            currentState.category = null;
            updateNavigation();
            loadCategories();
            document.querySelector(".site-title").addEventListener("click", goHome);
        }
    });

    // Click handler for marking as watched
document.addEventListener("click", (e) => {
    const card = e.target.closest('.lesson-card');
    if (card) {
        const title = card.dataset.title;
        const isNowWatched = toggleWatchedStatus(title);
        
        // Update UI
        card.classList.toggle('watched', isNowWatched);
        const marker = card.querySelector('.watched-marker');
        
        if (isNowWatched && !marker) {
            const newMarker = document.createElement('div');
            newMarker.className = 'watched-marker';
            newMarker.innerHTML = `<i class="fas fa-check"></i> Watched`;
            card.prepend(newMarker);
        } else if (!isNowWatched && marker) {
            marker.remove();
        }
    }
});

// Double-click handler for removing watched status
document.addEventListener("dblclick", (e) => {
    const card = e.target.closest('.lesson-card');
    if (card) {
        const title = card.dataset.title;
        const watched = getWatchedLessons();
        
        if (watched[title]) {
            delete watched[title];
            localStorage.setItem(WATCHED_STORAGE_KEY, JSON.stringify(watched));
            card.classList.remove('watched');
            card.querySelector('.watched-marker')?.remove();
        }
    }
});

    // Add filter change listener
    document.getElementById("search-filter").addEventListener("change", (e) => {
        const searchQuery = document.getElementById("global-search").value.trim();
        currentState.searchQuery = searchQuery;
        performSearch(searchQuery);
    });
    

    // Category selection
    document.addEventListener("click", (e) => {
        if (e.target.closest(".category-card")) {
            const card = e.target.closest(".category-card");
            currentState.category = card.dataset.category;
            updateNavigation();
            loadLessons();
        }
    });

    // Search functionality
    document.getElementById("global-search").addEventListener("input", 
        debounce((e) => {
            currentState.searchQuery = e.target.value.trim();
            if (currentState.searchQuery) {
                performSearch(currentState.searchQuery);
            } else {
                clearSearch();
            }
        }, 300)
    );

    // Navigation buttons
    document.getElementById("back-button").addEventListener("click", navigateBack);
    document.getElementById("home-button").addEventListener("click", goHome);
    document.getElementById("mobile-back-button").addEventListener("click", navigateBack);
    document.getElementById("mobile-home-button").addEventListener("click", goHome);
}

async function loadCategories() {
    try {
        const categories = Object.keys(appData[currentState.language]);
        populateCategories(categories);
        updateUI();
    } catch (error) {
        console.error("Error loading categories:", error);
    }
}

function extractLessonNumber(title) {
    const match = title.match(/\d+/); // Extract first number found
    return match ? parseInt(match[0], 10) : 0; // Convert to integer
}

async function loadLessons() {
    try {
        let lessons = appData[currentState.language][currentState.category];

        // Get selected sort order
        const sortOrder = document.getElementById("lesson-sort").value;

        if (sortOrder === "newest") {
            lessons = [...lessons].reverse(); // Reverse order for newest first
        } else if (sortOrder === "lessonNumber") {
            lessons = [...lessons].sort((a, b) => {
                return extractLessonNumber(a.title) - extractLessonNumber(b.title);
            });
        } else if (sortOrder === "recentlyViewed") {
            const recentLessons = JSON.parse(localStorage.getItem("recentlyViewed")) || {};
            lessons = [...lessons].sort((a, b) => {
                return (recentLessons[b.title] || 0) - (recentLessons[a.title] || 0);
            });
        }

        document.getElementById("lesson-title").textContent = 
    `${languageTranslations[currentState.language]} - ${categoryTranslations[currentState.language][currentState.category]}`;

        // Render sorted lessons
        const container = document.getElementById("lessons-container");
        // Replace the existing container.innerHTML code with:
container.innerHTML = lessons.map(lesson => `
    <div class="lesson-card ${getWatchedLessons()[lesson.title] ? 'watched' : ''}" 
         data-title="${lesson.title}">
        ${getWatchedLessons()[lesson.title] ? `
            <div class="watched-marker">
                <i class="fas fa-check"></i>
                Watched
            </div>
        ` : ''}
        <h3>${lesson.title}</h3>
        ${lesson.parts.map(part => `
            <div class="lesson-part">
                <p>${part.name}</p>
                <a href="${part.youtube}" class="button watch-video" data-title="${lesson.title}" target="_blank">
                    Watch <i class="fas fa-external-link-alt"></i>
                </a>
            </div>
        `).join("")}
    </div>
`).join("");

        

        updateUI();
    } catch (error) {
        console.error("Error loading lessons:", error);
    }
}


document.addEventListener("click", (e) => {
    if (e.target.classList.contains("watch-video")) {
        const lessonTitle = e.target.dataset.title;
        let recentLessons = JSON.parse(localStorage.getItem("recentlyViewed")) || {};
        recentLessons[lessonTitle] = Date.now(); // Store timestamp
        localStorage.setItem("recentlyViewed", JSON.stringify(recentLessons));
    }
});


document.getElementById("lesson-sort").addEventListener("change", loadLessons);


async function performSearch(query) {
    try {
        const results = [];
        const filterValue = document.getElementById("search-filter").value;

        Object.entries(appData).forEach(([lang, categories]) => {
            Object.entries(categories).forEach(([cat, lessons]) => {
                // Apply filter based on dropdown selection
                const matchesFilter = 
                    filterValue === "all" ||
                    (['Sinhala', 'Tamil', 'English'].includes(filterValue) && lang === filterValue) ||
                    (['Courses', 'Surah', 'Arabic'].includes(filterValue) && cat === filterValue);

                if (!matchesFilter) return;

                lessons.forEach(lesson => {
                    // Apply search query if exists
                    const matchesQuery = !query || 
                        lesson.title.toLowerCase().includes(query.toLowerCase()) ||
                        lesson.parts.some(part => 
                            part.name.toLowerCase().includes(query.toLowerCase())
                        );

                    if (matchesQuery) {
                        results.push({
                            language: lang,
                            category: cat,
                            ...lesson
                        });
                    }
                });
            });
        });

        // Always show results when filter is active
        displaySearchResults(results);
        document.getElementById("search-results").classList.remove("hidden");
        updateUI();
    } catch (error) {
        console.error("Search error:", error);
    }
}



function displaySearchResults(results) {
    const container = document.getElementById("results-container");
    container.innerHTML = results.length ? results.map(result => `
        <div class="lesson-card ${getWatchedLessons()[result.title] ? 'watched' : ''}" 
             data-title="${result.title}">
            ${getWatchedLessons()[result.title] ? `
                <div class="watched-marker">
                    <i class="fas fa-check"></i>
                    Watched
                </div>
            ` : ''}
            <small class="search-meta">${languageTranslations[result.language]} / ${categoryTranslations[result.language][result.category]}</small>
            <h3>${result.title}</h3>
            ${result.parts.map(part => `
                <div class="lesson-part">
                    <p>${part.name}</p>
                    <a href="${part.youtube}" class="button" target="_blank">
                        Watch <i class="fas fa-external-link-alt"></i>
                    </a>
                </div>
            `).join("")}
        </div>
    `).join("") : '<div class="lesson-card">No results found</div>';
    
    document.getElementById("search-results").classList.remove("hidden");
    updateUI();
}

function clearSearch() {
    document.getElementById("global-search").value = "";
    currentState.searchQuery = null;
    // Show all results for current filter
    performSearch("");
}

function updateNavigation() {
    navigationStack = navigationStack.slice(0, currentPosition + 1);
    navigationStack.push({ ...currentState });
    currentPosition++;
    saveState();
    history.pushState({ state: currentState }, "", `#${currentState.language || "home"}`);
}

window.addEventListener("popstate", (event) => {
    if (event.state) {
        currentState = event.state.state;
        updateUI(); // Update UI based on the restored state
    } else {
        goHome(); // If no history, reset to the home screen
    }
});


function saveState() {
    localStorage.setItem("navigationState", JSON.stringify({
        stack: navigationStack,
        position: currentPosition,
        currentState: currentState
    }));
}

function loadState() {
    const saved = localStorage.getItem("navigationState");
    if (saved) {
        const { stack, position, currentState: savedState } = JSON.parse(saved);
        navigationStack = stack;
        currentPosition = position;
        currentState = savedState;
        
        // If we have a language selected, load categories
        if (currentState.language) {
            loadCategories().then(() => {
                // If we also have a category selected, load lessons
                if (currentState.category) {
                    loadLessons();
                }
            });
        }
    }
    updateUI();
}

function updateUI() {
    // Reset all containers first
    document.querySelectorAll(".selection-screen, #lesson-list, #search-results")
           .forEach(el => el.classList.add("hidden"));

    const hasActiveSearch = document.getElementById("search-filter").value !== "all" || 
                          currentState.searchQuery;

    if (hasActiveSearch) {
        document.getElementById("search-results").classList.remove("hidden");
    } else if (currentState.category) {
        document.getElementById("lesson-list").classList.remove("hidden");
    } else if (currentState.language) {
        document.getElementById("category-selection").classList.remove("hidden");
    } else {
        document.getElementById("language-selection").classList.remove("hidden");
    }

    // Mobile button visibility logic
    const mobileBackButton = document.getElementById("mobile-back-button");
    const mobileHomeButton = document.getElementById("mobile-home-button");
    const mobileNav = document.querySelector('.bottom-nav'); // Get the nav container

    if (window.innerWidth <= 768) { // Mobile view
        if (!currentState.language) {
            mobileBackButton.classList.add("hidden"); // Hide back button on home page
            mobileHomeButton.classList.remove("hidden"); // Show home button
            mobileNav.classList.add('centered'); // Apply centered class for home page
        } else {
            mobileBackButton.classList.remove("hidden"); // Show back button when not on home page
            mobileHomeButton.classList.remove("hidden"); // Always show home button
            mobileNav.classList.remove('centered'); // Remove centered class when on other pages
        }
    } else { // PC view
        // Back button visibility on PC view
        const backButton = document.getElementById("back-button");
        const isHomePage = !currentState.language && !currentState.category;

        if (isHomePage) {
            backButton.classList.add("hidden"); // Hide back button on PC Home page
        } else {
            backButton.classList.remove("hidden"); // Show back button on other pages
        }
    }
}




function navigateBack() {
    if (currentState.category) {
        currentState.category = null;
        updateNavigation();
        updateUI();
    } else if (currentState.language) {
        currentState.language = null;
        updateNavigation();
        updateUI();
    }
}


function goHome() {
    // Reset all states and filters
    navigationStack = [];
    currentPosition = -1;
    currentState = { 
        language: null, 
        category: null, 
        searchQuery: null 
    };
    
    // Clear UI elements
    document.getElementById("global-search").value = "";
    document.getElementById("search-filter").value = "all";
    document.getElementById("search-results").classList.add("hidden");
    
    // Reset to initial state
    localStorage.removeItem("navigationState");
    populateLanguages(Object.keys(appData));
    updateUI();
    
    // Optional: Scroll to top
    window.scrollTo(0, 0);
}

function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// script.js
// Add mobile filter toggle
document.querySelector('.filter-trigger').addEventListener('click', () => {
    document.querySelector('.mobile-filter-dropdown').classList.toggle('active');
});

// Close filter when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
        document.querySelector('.mobile-filter-dropdown').classList.remove('active');
    }
});

async function populateDropdown() {
    try {
        const dropdown = document.getElementById("search-filter");
        dropdown.innerHTML = `<option value="all">All Items</option>`;

        // Languages
        dropdown.innerHTML += `<option disabled>Languages 🎯</option>`;
        Object.keys(appData).forEach(language => {
            dropdown.innerHTML += `<option value="${language}">${languageTranslations[language]}</option>`;
        });

        // Categories
        dropdown.innerHTML += `<option disabled>Categories 🎯</option>`;
        const uniqueCategories = new Set();
        Object.values(appData).forEach(categories => {
            Object.keys(categories).forEach(category => {
                uniqueCategories.add(category);
            });
        });
        uniqueCategories.forEach(category => {
            dropdown.innerHTML += `<option value="${category}">${categoryTranslations['English'][category]}</option>`;
        });
    } catch (error) {
        console.error("Error loading dropdown:", error);
    }
}

document.addEventListener("DOMContentLoaded", populateDropdown);

// Get watched lessons from storage
function getWatchedLessons() {
    return JSON.parse(localStorage.getItem(WATCHED_STORAGE_KEY)) || {};
}

// Toggle watched status
function toggleWatchedStatus(lessonTitle) {
    const watched = getWatchedLessons();
    watched[lessonTitle] = !watched[lessonTitle];
    localStorage.setItem(WATCHED_STORAGE_KEY, JSON.stringify(watched));
    return watched[lessonTitle];
}

// Updated Service Worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/Quran/sw.js')
      .then(registration => console.log('SW registered'))
      .catch(err => console.log('SW registration failed:', err));
  });
}

// Install Prompt with path correction
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallPromotion();
});

function showInstallPromotion() {
  const installPopup = document.getElementById('installPopup');
  if (installPopup && deferredPrompt) {
    installPopup.classList.remove('hidden');
  }
}

// Add click handler for install button
document.getElementById('installButton').addEventListener('click', async () => {
  const installPopup = document.getElementById('installPopup');
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted install');
    }
    installPopup.classList.add('hidden');
    deferredPrompt = null;
  }
});
