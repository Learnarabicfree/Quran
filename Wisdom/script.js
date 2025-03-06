// Firebase configuration
const firebaseConfig = {
    databaseURL: "https://quranic-wisdom-default-rtdb.firebaseio.com",
  };
  
  // Initialize Firebase
  const app = firebase.initializeApp(firebaseConfig);
  const database = firebase.database(app);

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
            <h3>${language}</h3>
        </div>
    `).join("");
}

function populateCategories(categories) {
    const container = document.getElementById("categories-container");
    container.innerHTML = categories.map(category => `
        <div class="card category-card" data-category="${category}">
            <i class="fas fa-book card-icon"></i>
            <h3>${category}</h3>
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

    // Add filter change listener
    document.getElementById("search-filter").addEventListener("change", () => {
        if (currentState.searchQuery) {
            performSearch(currentState.searchQuery);
        }
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

        // Render sorted lessons
        const container = document.getElementById("lessons-container");
        container.innerHTML = lessons.map(lesson => `
            <div class="lesson-card" data-title="${lesson.title}">
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
    if (!query) return clearSearch();
    
    try {
        const results = [];
        const filterValue = document.getElementById("search-filter").value;

        if (filterValue === "all") {
            Object.entries(appData).forEach(([lang, categories]) => {
                Object.entries(categories).forEach(([cat, lessons]) => {
                    lessons.forEach(lesson => {
                        const matches = lesson.title.toLowerCase().includes(query.toLowerCase()) ||
                            lesson.parts.some(part => 
                                part.name.toLowerCase().includes(query.toLowerCase())
                            );
                        if (matches) {
                            results.push({
                                language: lang,
                                category: cat,
                                ...lesson
                            });
                        }
                    });
                });
            });
        } else {
            Object.entries(appData).forEach(([lang, categories]) => {
                if (['Sinhala', 'Tamil', 'English'].includes(filterValue) && lang !== filterValue) return;
                Object.entries(categories).forEach(([cat, lessons]) => {
                    if (['Al Quran', 'Hadith'].includes(filterValue) && cat !== filterValue) return;
                    lessons.forEach(lesson => {
                        const matches = lesson.title.toLowerCase().includes(query.toLowerCase()) ||
                            lesson.parts.some(part => 
                                part.name.toLowerCase().includes(query.toLowerCase())
                            );
                        if (matches) {
                            results.push({
                                language: lang,
                                category: cat,
                                ...lesson
                            });
                        }
                    });
                });
            });
        }

        displaySearchResults(results);
    } catch (error) {
        console.error("Search error:", error);
    }
}



function displaySearchResults(results) {
    const container = document.getElementById("results-container");
    container.innerHTML = results.length ? results.map(result => `
        <div class="lesson-card">
            <small class="search-meta">${result.language} / ${result.category}</small>
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
    document.getElementById("search-results").classList.add("hidden");
    currentState.searchQuery = null;
    updateUI();
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
    // Show/hide sections
    document.querySelectorAll(".selection-screen, #lesson-list, #search-results")
           .forEach(el => el.classList.add("hidden"));

    if (currentState.searchQuery) {
        document.getElementById("search-results").classList.remove("hidden");
    } else if (currentState.category) {
        document.getElementById("lesson-list").classList.remove("hidden");
        document.getElementById("lesson-title").textContent = 
            `${currentState.language} / ${currentState.category}`;
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
    navigationStack = [];
    currentPosition = -1;
    currentState = { language: null, category: null, searchQuery: null };
    localStorage.removeItem("navigationState");
    clearSearch();
    updateUI();
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
        dropdown.innerHTML += `<option disabled>Languages ????</option>`;
        Object.keys(appData).forEach(language => {
            dropdown.innerHTML += `<option value="${language}">${language}</option>`;
        });

        // Categories
        dropdown.innerHTML += `<option disabled>Categories ????</option>`;
        const uniqueCategories = new Set();
        Object.values(appData).forEach(categories => {
            Object.keys(categories).forEach(category => {
                uniqueCategories.add(category);
            });
        });
        uniqueCategories.forEach(category => {
            dropdown.innerHTML += `<option value="${category}">${category}</option>`;
        });
    } catch (error) {
        console.error("Error loading dropdown:", error);
    }
}


document.addEventListener("DOMContentLoaded", populateDropdown);