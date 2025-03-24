
const firebaseConfig = {
    projectId: "quranic-wisdom",
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

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
        'Arabic': 'අරාබි',
        'Main Lessons': 'ප්රධාන පාඩම්' // Added translation
    },
    'Tamil': {
        'Courses': 'பாடநெறிகள்',
        'Surah': 'ஸூரா',
        'Arabic': 'அரபு',
        'Main Lessons': 'முக்கிய பாடங்கள்' // Added translation
    },
    'English': {
        'Courses': 'Courses',
        'Surah': 'Surah',
        'Arabic': 'Arabic',
        'Main Lessons': 'Main Lessons' // Added translation
    }
};

let navigationStack = [];
let currentPosition = -1;
let currentState = {
    language: null,
    category: null,
};

let appData = null; // Stores fetched data from Firebase


document.addEventListener("DOMContentLoaded", async () => {
    showLoading();
    await fetchData(); // Ensure this is called
    loadState(); // Restore the state
    setupEventListeners();
    hideLoading();
    history.replaceState({}, document.title, window.location.pathname);
});
  
async function fetchData() {
    try {


        // Fetch fresh data
        appData = {};
        const languages = ['English', 'Sinhala', 'Tamil'];
        const categories = ['Courses', 'Surah', 'Arabic'];

        // Parallel fetch for all languages
        await Promise.all(languages.map(async (language) => {
            console.log(`Fetching data for language: ${language}`); // Debug log
            appData[language] = {};

            await Promise.all(categories.map(async (category) => {
                console.log(`Fetching data for category: ${category}`); // Debug log
                const categoryRef = db.collection(language).doc(category);

                // Fetch main lessons
                const mainLessonsSnapshot = await categoryRef.collection('lessons').get();
                const mainLessonCount = mainLessonsSnapshot.size;

                // Fetch subcategories (if they exist)
                let subCategories = [];
                const subCategoriesSnapshot = await categoryRef.collection('subCategories').get();
                if (subCategoriesSnapshot.size > 0) {
                    subCategories = await Promise.all(
                        subCategoriesSnapshot.docs.map(async (subCatDoc) => {
                            const subLessons = await subCatDoc.ref.collection('lessons').get();
                            return {
                                id: subCatDoc.id,
                                name: subCatDoc.data().name || subCatDoc.id,
                                lessonCount: subLessons.size
                            };
                        })
                    );
                }

                // Store category data
                appData[language][category] = {
                    subCategories,
                    lessonCount: mainLessonCount
                };

                console.log(`Data for ${language}/${category}:`, appData[language][category]); // Debug log
            }));
        }));

        populateLanguages(languages);
    } catch (error) {
        console.error("Error fetching data:", error);
        // If there's an error, ensure appData is initialized
        appData = appData || {};
    }
}

function animateDots() {
    const dotsElement = document.querySelector('.dots');
    let dots = '';
    let count = 0;

    setInterval(() => {
        dots = '.'.repeat(count % 4); // Cycle through 0 to 3 dots
        dotsElement.textContent = dots;
        count++;
    }, 500); // Adjust speed of animation
}

// Add loading indicator functions
function showLoading() {
    document.getElementById('language-selection').classList.add('hidden');
    document.getElementById('loading-indicator').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading-indicator').classList.add('hidden');
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

function populateCategories() {
    const container = document.getElementById("categories-container");
    const subContainer = document.getElementById("subcategories-container");
    const currentLang = currentState.language;
    const categories = ['Courses', 'Surah', 'Arabic'];

    // Show categories container and hide subcategories
    container.style.display = 'grid';
    subContainer.style.display = 'none';
    document.getElementById('category-title').textContent = 'Choose Category';

    container.innerHTML = categories.map(category => {
        const categoryData = appData[currentLang][category];
        const translatedCategory = categoryTranslations[currentLang]?.[category] || category;

        // If no subcategories but has main lessons, show direct link to lessons
        if (categoryData.subCategories.length === 0 && categoryData.lessonCount > 0) {
            return `
                <div class="card category-card" data-category="${category}" data-direct-lessons>
                    <i class="fas fa-book"></i>
                    <h3>${translatedCategory}</h3>
                    <span class="lesson-count">${categoryData.lessonCount} lessons</span>
                </div>
            `;
        } else {
            return `
                <div class="card category-card" data-category="${category}">
                    <i class="fas fa-folder-open"></i>
                    <h3>${translatedCategory}</h3>
                    <span class="lesson-count">${categoryData.subCategories.length} subcategories</span>
                </div>
            `;
        }
    }).join("");
}

function populateSubCategories(category) {
    const subContainer = document.getElementById("subcategories-container");
    const currentLang = currentState.language;
    const categoryData = appData[currentLang][category];

    if (!categoryData) {
        console.error("Category data not found for:", category);
        return;
    }

    let html = '';

    // Add Main Lessons card if there are lessons in the main category
    if (categoryData.lessonCount > 0) {
        html += `
            <div class="card subcategory-card" 
                 data-category="${category}" 
                 data-is-main>
                <i class="fas fa-book"></i>
                <h3>${categoryTranslations[currentLang]?.['Main Lessons'] || 'Main Lessons'}</h3>
                <span class="lesson-count">${categoryData.lessonCount} lessons</span>
            </div>
        `;
    }

    // Add subcategories
    html += categoryData.subCategories.map(subCat => `
        <div class="card subcategory-card" 
             data-category="${category}" 
             data-subcategory="${subCat.id}">
            <i class="fas fa-folder"></i>
            <h3>${subCat.name}</h3>
            <span class="lesson-count">${subCat.lessonCount} lessons</span>
        </div>
    `).join('');

    subContainer.innerHTML = html;
}

function showMainCategories() {
    currentState.category = null;
    updateNavigation();
    populateCategories();
    updateUI();
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
    let allowMarking = false; // Flag to control marking

    document.addEventListener("click", (e) => {
        if (!allowMarking) return; // Prevent marking if the flag is false
    
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

    

    // Category selection
    document.addEventListener("click", (e) => {
        const categoryCard = e.target.closest(".category-card");
        const subcategoryCard = e.target.closest(".subcategory-card");
    
        if (categoryCard) {
            currentState.category = categoryCard.dataset.category;
            const categoryData = appData[currentState.language][currentState.category];
    
            // If the category has no subcategories, load lessons directly
            if (categoryCard.hasAttribute('data-direct-lessons')) {
                currentState.subcategory = null;
                updateNavigation();
                loadLessons();
            } else {
                // Otherwise, show subcategories
                currentState.subcategory = null;
                updateNavigation();
                populateSubCategories(currentState.category);
                updateUI();
            }
        } else if (subcategoryCard) {
            currentState.subcategory = subcategoryCard.dataset.subcategory;
            updateNavigation();
            loadLessons();
        }
    });



    // Navigation buttons
    document.getElementById("back-button").addEventListener("click", navigateBack);
    document.getElementById("home-button").addEventListener("click", goHome);
    document.getElementById("mobile-back-button").addEventListener("click", navigateBack);
    document.getElementById("mobile-home-button").addEventListener("click", goHome);
}

async function loadCategories() {
    try {
        const snapshot = await db.collection(currentState.language).get();
        const categories = snapshot.docs.map(doc => doc.id);
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
        console.log("Loading lessons for:", currentState); // Debug log

        let lessonRef;

        // Determine Firestore path
        if (currentState.subcategory) {
            // Load lessons from subcategory
            lessonRef = db.collection(currentState.language)
                .doc(currentState.category)
                .collection('subCategories')
                .doc(currentState.subcategory)
                .collection('lessons');
        } else {
            // Load direct lessons from category
            lessonRef = db.collection(currentState.language)
                .doc(currentState.category)
                .collection('lessons');
        }

        const snapshot = await lessonRef.get();
        console.log("Lessons fetched:", snapshot.size); // Debug log

        let lessons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Get selected sort order safely
        const sortOrder = document.getElementById("lesson-sort")?.value || "lessonOrder";

        // Apply sorting logic
        if (sortOrder === "newest") {
            lessons.reverse(); // Reverse for newest first
        } else if (sortOrder === "lessonNumber") {
            lessons.sort((a, b) => extractLessonNumber(a.title) - extractLessonNumber(b.title));
        } else if (sortOrder === "recentlyViewed") {
            const recentLessons = JSON.parse(localStorage.getItem("recentlyViewed")) || {};
            lessons.sort((a, b) => (recentLessons[b.id] || 0) - (recentLessons[a.id] || 0));
        }

        // Update lesson title dynamically
        const subCatText = currentState.subcategory ? ` - ${currentState.subcategory}` : '';
        document.getElementById("lesson-title").textContent =
            `${languageTranslations[currentState.language]} - ${categoryTranslations[currentState.language][currentState.category]}${subCatText}`;

        // Render sorted lessons
        renderLessons(lessons);
        updateUI();
    } catch (error) {
        console.error("Error loading lessons:", error);
        showToast("Error loading lessons. Please try again.", true);
    }
}


function renderLessons(lessons) {
    const container = document.getElementById("lessons-container");
    container.innerHTML = lessons.map(lesson => {
        const isNew = isLessonNew(lesson.createdAt?.toDate());

        return `
        <div class="lesson-card ${getWatchedLessons()[lesson.title] ? 'watched' : ''}" 
             data-title="${lesson.title}">
            ${getWatchedLessons()[lesson.title] ? `
                <div class="watched-marker">
                    <i class="fas fa-check"></i>
                    Watched
                </div>
            ` : ''}
            <h3>${lesson.title}</h3>
            ${isNew ? '<span class="new-lesson-badge">✨New Lesson</span>' : ''}
            <small class="search-meta">
                ${languageTranslations[currentState.language]} / 
                ${categoryTranslations[currentState.language][currentState.category]}
                ${currentState.subcategory ? ` / ${currentState.subcategory}` : ''}
            </small>
            ${lesson.parts.map(part => `
                <div class="lesson-part">
                    <p>${part.name}</p>
                    <a href="${part.youtube}" class="button watch-video" data-title="${lesson.title}" target="_blank">
                        Watch <i class="fas fa-external-link-alt"></i>
                    </a>
                </div>
            `).join("")}
        </div>
        `;
    }).join("");

    // Update watched status for videos
    document.querySelectorAll(".watch-video").forEach(button => {
        button.addEventListener("click", () => {
            const lessonTitle = button.dataset.title;
            let recentLessons = JSON.parse(localStorage.getItem("recentlyViewed")) || {};
            recentLessons[lessonTitle] = Date.now();
            localStorage.setItem("recentlyViewed", JSON.stringify(recentLessons));
        });
    });
}

// Helper function to check if lesson is new (less than 1 week old)
function isLessonNew(createdAt) {
    if (!createdAt) return false;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return createdAt > oneWeekAgo;
}






document.addEventListener("click", (e) => {
    const categoryCard = e.target.closest(".category-card");
    const subcategoryCard = e.target.closest(".subcategory-card");

    if (categoryCard) {
        currentState.category = categoryCard.dataset.category;
        const categoryData = appData[currentState.language][currentState.category];

        console.log("Category clicked:", currentState); // Debug log

        // If the category has no subcategories, load lessons directly
        if (categoryCard.hasAttribute('data-direct-lessons')) {
            currentState.subcategory = null;
            updateNavigation();
            loadLessons();
        } else {
            // Otherwise, show subcategories
            currentState.subcategory = null;
            updateNavigation();
            populateSubCategories(currentState.category);
            updateUI();
        }
    } else if (subcategoryCard) {
        currentState.subcategory = subcategoryCard.dataset.subcategory;
        console.log("Subcategory clicked:", currentState); // Debug log
        updateNavigation();
        loadLessons();
    }
});


document.getElementById("lesson-sort").addEventListener("change", loadLessons);




function displaySearchResults(results) {
    const container = document.getElementById("results-container");
    
    if (results.length === 0) {
        container.innerHTML = '<div class="lesson-card">No results found</div>';
    } else {
        container.innerHTML = results.map(result => `
            <div class="lesson-card ${getWatchedLessons()[result.title] ? 'watched' : ''}" 
                 data-title="${result.title}">
                ${getWatchedLessons()[result.title] ? `
                    <div class="watched-marker">
                        <i class="fas fa-check"></i>
                        Watched
                    </div>
                ` : ''}
                <small class="search-meta">
                    ${languageTranslations[result.language]} / ${categoryTranslations[result.language][result.category]}
                </small>
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
        `).join("");
    }
    
    document.getElementById("search-results").classList.remove("hidden");
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

        // If a language is selected, load its categories
        if (currentState.language && appData?.[currentState.language]) {
            loadCategories().then(() => {
                // If a category is selected, load its subcategories
                if (currentState.category) {
                    populateSubCategories(currentState.category);

                    // If a subcategory is selected, load its lessons
                    if (currentState.subcategory) {
                        loadLessons();
                    }
                }
            });
        }
    } else {
        // Reset to initial state if no saved state
        currentState = { 
            language: null, 
            category: null,
            subcategory: null
        };
    }

    updateUI();
}

function updateUI() {
    // Reset all containers first
    document.querySelectorAll(".selection-screen, #lesson-list")
           .forEach(el => el.classList.add("hidden"));

    let shouldLoadLessons = false; // Track whether we need to load lessons

    // Show/hide back button based on current state
    const backButton = document.getElementById("back-button");
    const mobileBackButton = document.getElementById("mobile-back-button");
    const mobileHomeButton = document.getElementById("mobile-home-button");
    const mobileNav = document.querySelector('.bottom-nav');

    if (!currentState.language) {
        // Home page: Hide back button
        backButton.classList.add("hidden");
        mobileBackButton.classList.add("hidden");
        mobileHomeButton.classList.remove("hidden");
        mobileNav.classList.add('centered');
    } else {
        // Not home page: Show back button
        backButton.classList.remove("hidden");
        mobileBackButton.classList.remove("hidden");
        mobileHomeButton.classList.remove("hidden");
        mobileNav.classList.remove('centered');
    }

    // Determine which container to show
    if (currentState.subcategory || (currentState.category && appData[currentState.language][currentState.category].subCategories.length === 0)) {
        document.getElementById("lesson-list").classList.remove("hidden");
        shouldLoadLessons = true;
    } else if (currentState.category) {
        document.getElementById("category-selection").classList.remove("hidden");
        document.getElementById("subcategories-container").style.display = 'grid';
        document.getElementById("categories-container").style.display = 'none';
        populateSubCategories(currentState.category);
    } else if (currentState.language) {
        document.getElementById("category-selection").classList.remove("hidden");
        document.getElementById("subcategories-container").style.display = 'none';
        document.getElementById("categories-container").style.display = 'grid';
        populateCategories();
    } else {
        document.getElementById("language-selection").classList.remove("hidden");
        return;
    }

    // Ensure lessons are only loaded if necessary
    if (shouldLoadLessons && !document.getElementById("lesson-list").dataset.loaded) {
        loadLessons();
        document.getElementById("lesson-list").dataset.loaded = "true"; // Mark as loaded
    }
}










function navigateBack() {
    if (currentState.subcategory) {
        // Back from lessons to subcategories
        currentState.subcategory = null;
    } else if (currentState.category) {
        // Back from subcategories to main categories
        currentState.category = null;
    } else if (currentState.language) {
        // Back from categories to languages
        currentState.language = null;
    }
    updateNavigation();
    updateUI();
}


function goHome() {
    // Reset all states
    navigationStack = [];
    currentPosition = -1;
    currentState = { 
        language: null, 
        category: null 
    };

    // Clear UI elements
    document.getElementById("language-selection").classList.remove("hidden");
    document.getElementById("category-selection").classList.add("hidden");
    document.getElementById("lesson-list").classList.add("hidden");

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
        dropdown.innerHTML = `
            <option value="all">All Items</option>
            <optgroup label="Languages">
                ${Object.keys(languageTranslations).map(lang => `
                    <option value="${lang}">${languageTranslations[lang]}</option>
                `).join("")}
            </optgroup>
            <optgroup label="Categories">
                ${Object.keys(categoryTranslations['English']).map(cat => `
                    <option value="${cat}">${categoryTranslations['English'][cat]}</option>
                `).join("")}
            </optgroup>
        `;
    } catch (error) {
        console.error("Error loading dropdown:", error);
        showToast("Error loading filter options", true);
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
