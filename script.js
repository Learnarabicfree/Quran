// Install Prompt with path correction
let deferredPrompt;
const installPopup = document.getElementById('installPopup');
const installButton = document.getElementById('installButton');

// Modified beforeinstallprompt handler
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallPromotion();
    
    // Optional: Log for debugging
    console.log('beforeinstallprompt event fired');
});

// Modified install button handler
installButton.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
        console.log('User accepted install');
        trackInstallEvent(); // Optional: Add analytics tracking
    }
    
    // Reset the deferred prompt variable
    deferredPrompt = null;
    installPopup.classList.add('hidden');
});

// New function to track installations
function trackInstallEvent() {
    if (typeof gtag !== 'undefined') {
        gtag('event', 'install', {
            'event_category': 'PWA',
            'event_label': 'App Installation'
        });
    }
}

// Modified show promotion function
function showInstallPromotion() {
    if (deferredPrompt && !isAppInstalled()) {
        installPopup.classList.remove('hidden');
        // Set timeout to auto-hide after 30 seconds
        setTimeout(() => {
            installPopup.classList.add('hidden');
        }, 30000);
    }
}

// New installation check function
function isAppInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches || 
           window.navigator.standalone ||
           document.referrer.includes('android-app://');
}

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
        'Tafsir': 'තෆ්සීර්',
        'Main Lessons': 'ප්රධාන පාඩම්'
    },
    'Tamil': {
        'Courses': 'பாடநெறிகள்',
        'Surah': 'ஸூரா',
        'Arabic': 'அரபு',
        'Tafsir': 'தப்ஸீர்',
        'Main Lessons': 'முக்கிய பாடங்கள்' // Added translation
    },
    'English': {
        'Courses': 'Courses',
        'Surah': 'Surah',
        'Arabic': 'Arabic',
        'Tafsir': 'Tafsir',
        'Main Lessons': 'Main Lessons' // Added translation
    }
};

const shareMessages = {
    'English': {
        message: "𝐋𝐞𝐚𝐫𝐧 𝐁𝐚𝐬𝐢𝐜 𝐐𝐮𝐫𝐚𝐧𝐢𝐜 𝐀𝐫𝐚𝐛𝐢𝐜 𝐢𝐧 𝐋𝐞𝐬𝐬 𝐭𝐡𝐚𝐧 𝟔 𝐇𝐨𝐮𝐫𝐬! 🕔\n\n📚 Dedicate your time to learning the most valuable knowledge—understanding the Quran in Arabic. Deepen your connection with ALLAH S.W.T by comprehending His words as you recite in Salah.\n\nUpon completion, we can discuss verses of the Quran, In Shaa ALLAH S.W.T.\n\n🔗 Join now: ",
        subject: "📖 Learn Basic Quranic Arabic in Less than 6 Hours! 🕔",
        copied: "Link copied to clipboard!"
    },
    'Sinhala': {
        message: "📖 කුර්ආනයේ අරාබි භාෂාව ඉගෙන ගෙන අල්ලාහ්ගේ වචනය කෙලින්ම තේරුම් ගෙන ඔහුට සමීප වෙමු.\n\n🔗 දැන්ම පිවිසෙන්න: ",
        subject: "📖 පැය 6 ට අඩු කාලයකින් මූලික කුර්ආනික අරාබි ඉගෙන ගන්න!",
        copied: "Link copied to clipboard!"
    },
    'Tamil': {
        message: "📖 குர்ஆனின் அரபி மொழியை படித்து அல்லாஹுத்தஆலாவின் வசனங்களை நேரடியாக விளங்கி அவனின் நெருக்கத்தைப் பெற்றுக் கொள்வோம்.\n\n🔗 இப்பொழுதே  கற்றுக்கொள்ளத் தொடங்குங்கள்: ",
        subject: "📖 6 மணி நேரத்திற்குள் அடிப்படை குர்ஆனிக அரபு மொழியைக் கற்றுக்கொள்ளுங்கள்!",
        copied: "Link copied to clipboard!"
    }
};

let navigationStack = [];
let currentPosition = -1;
let currentState = {
    language: null,
    category: null,
};

let appData = null; // Stores fetched data from Firebase

// Update initializeNotifications function
function initializeNotifications() {
    const marqueeContent = document.querySelector('.notice-text');
    const marqueeContainer = document.querySelector('.app-notification-marquee');

    db.collection('notifications')
        .orderBy('timestamp', 'desc')
        .limit(1)
        .onSnapshot(snapshot => {
            if (!snapshot.empty && !sessionStorage.getItem('notificationDismissed')) {
                const doc = snapshot.docs[0];
                const notification = doc.data();

                let notificationHTML = `<strong>${notification.title}</strong> - ${notification.body}`;
                
                if (notification.link) {
                    let safeLink = notification.link.startsWith('http') ? notification.link : 'https://' + notification.link;
                    notificationHTML += ` <a href="${safeLink}" class="notification-link" rel="noopener noreferrer">Click here</a>`;
                }

                marqueeContent.innerHTML = notificationHTML;
                marqueeContainer.style.display = 'flex';
            } else {
                marqueeContainer.style.display = 'none';
            }
        });
}

function showAppNotification(notification) {
    const notificationElement = document.createElement('div');
    notificationElement.className = 'notification-card';
    notificationElement.innerHTML = `
        <h4>${notification.title}</h4>
        <p>${notification.body}</p>
        <small>${new Date(notification.timestamp?.toDate()).toLocaleString()}</small>
    `;
    
    // Prepend to notifications container
    const container = document.getElementById('notifications-container');
    container.insertBefore(notificationElement, container.firstChild);
    
    // Auto-remove after 1 hour
    setTimeout(() => notificationElement.remove(), 3600000);
}

function showSystemNotification(notification) {
    if (Notification.permission === 'granted') {
        new Notification(notification.title, {
            body: notification.body,
            icon: 'img/logo-app.png'
        });
    }
}


document.addEventListener("DOMContentLoaded", async () => {
    showLoading();
    await fetchData(); // Make sure data is loaded first

    // Check URL hash if present
    if (window.location.hash) {
        parseHash();
    } else {
        loadState();
    }

    setupEventListeners();
    updateUI();
    initializeNotifications();
    hideLoading();

    // Preserve initial hash in history
    history.replaceState({}, document.title, window.location.pathname + window.location.hash);
});


  
async function fetchData() {
    try {


        // Fetch fresh data
        appData = {};
        const languages = ['English', 'Sinhala', 'Tamil'];
        const categories = ['Arabic', 'Tafsir', 'Courses', 'Surah'];

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
    const categories = ['Arabic', 'Tafsir', 'Courses', 'Surah'];

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

// YouTube Player Variables
let youtubePlayer = null;
let isModalOpen = false;

// YouTube API Ready Callback
function onYouTubeIframeAPIReady() {
    console.log('YouTube API ready');
}

// Initialize Video Player
function initializeVideoPlayer(videoId) {
    if (!videoId) {
        showToast('Invalid video URL', true);
        return;
    }

    try {
        if (!youtubePlayer) {
            youtubePlayer = new YT.Player('player', {
                height: '100%',
                width: '100%',
                videoId: videoId,
                host: 'https://www.youtube-nocookie.com', // Add this line
                playerVars: {
                    autoplay: 1,
                    modestbranding: 1,
                    rel: 0,
                    controls: 1,
                    origin: window.location.origin // Important for security
                },
                events: {
                    'onReady': onPlayerReady,
                    'onStateChange': onPlayerStateChange
                }
            });
        } else {
            youtubePlayer.loadVideoById(videoId);
            youtubePlayer.playVideo();
        }
    } catch (error) {
        console.error('YouTube player error:', error);
        showToast('Error loading video', true);
    }
}

// Player Event Handlers
function onPlayerReady(event) {
    event.target.playVideo();
}

function onPlayerStateChange(event) {
    // Optional: Handle player state changes
}

// Open Video Modal
function openVideoPlayer(videoId) {
    const modal = document.getElementById('videoModal');
    modal.classList.add('modal-show');
    isModalOpen = true;
    initializeVideoPlayer(videoId);
}

// Close Video Modal
function closeVideoPlayer() {
    const modal = document.getElementById('videoModal');
    modal.classList.remove('modal-show');
    isModalOpen = false;
    
    if (youtubePlayer) {
        youtubePlayer.stopVideo();
    }
}

// YouTube URL Parser
function getYouTubeId(url) {
    try {
        // Clean up whitespace and emojis
        url = url.trim().replace(/^🔗\s*/, '');

        // Handle Shorts URLs
        if (url.includes("youtube.com/shorts/")) {
            const id = url.split("/shorts/")[1].split("?")[0];
            return id;
        }

        // Regular expressions for all other formats
        const regExp = /^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]{11}).*/;
        const match = url.match(regExp);
        return (match && match[1]) ? match[1] : null;
    } catch (error) {
        console.error('URL parsing error:', error);
        return null;
    }
}

// Handle ESC Key Press
function handleKeyDown(event) {
    if (event.key === 'Escape' && isModalOpen) {
        closeVideoPlayer();
    }
}

// Attachment handling
const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
let currentAttachmentUrl = '';

function showAttachmentModal(url) {
    const modal = document.getElementById('attachmentModal');
    const previewImg = document.getElementById('attachmentPreview');
    
    currentAttachmentUrl = url;
    
    // Check if it's an image
    const isImage = imageExtensions.some(ext => url.toLowerCase().endsWith(ext));
    
    if (isImage) {
        previewImg.src = url;
        previewImg.style.display = 'block';
        modal.classList.add('modal-show');
    } else {
        // For non-image files, force download immediately
        forceDownload(url);
    }
}

function closeAttachmentModal() {
    document.getElementById('attachmentModal').classList.remove('modal-show');
}

function forceDownload(url) {
    // Extract filename from URL
    const filename = url.split('/').pop().split('?')[0] || 'download';
    
    // Fetch the file and create a download link
    fetch(url, {
        mode: 'cors',
        headers: new Headers({
            'Origin': window.location.origin
        }),
    })
    .then(response => response.blob())
    .then(blob => {
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(a);
    })
    .catch(() => {
        // Fallback to normal download if fetch fails
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });
    
    closeAttachmentModal();
}

function setupEventListeners() {
    // Language selection
    document.addEventListener("click", (e) => {
        if (e.target.closest(".language-card")) {
            const card = e.target.closest(".language-card");
            currentState.language = card.dataset.language;
            currentState.category = null;
            currentState.subcategory = null;
            updateNavigation();
            updateUI();
        }
    });

    // Click handler for marking as watched
    let allowMarking = false;
    document.addEventListener("click", (e) => {
        if (!allowMarking) return;

        const card = e.target.closest('.lesson-card');
        if (card) {
            const title = card.dataset.title;
            const isNowWatched = toggleWatchedStatus(title);

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

    // Category and subcategory selection
    document.addEventListener("click", (e) => {
        const categoryCard = e.target.closest(".category-card");
        const subcategoryCard = e.target.closest(".subcategory-card");

        if (categoryCard) {
            currentState.category = categoryCard.dataset.category;

            if (categoryCard.hasAttribute('data-direct-lessons')) {
                currentState.subcategory = null;
                updateNavigation();
                loadLessons();
            } else {
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

    // Share button toggle
    document.getElementById("floating-share").addEventListener("click", (e) => {
        e.stopPropagation();
        toggleShareMenu();
    });

    document.querySelectorAll('.share-option').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            handleShare(button.dataset.platform);
        });
    });

    // Video Modal Events
    document.querySelector('.close').addEventListener('click', closeVideoPlayer);
    document.getElementById('videoModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('videoModal')) {
            closeVideoPlayer();
        }
    });

    // ESC Key to close modals
    document.addEventListener('keydown', handleKeyDown);

    // Attachment Modal Events
    const attachmentModal = document.getElementById('attachmentModal');

    document.querySelector('.attachment-modal-close')?.addEventListener('click', closeAttachmentModal);
    document.querySelector('.attachment-modal-close-btn')?.addEventListener('click', closeAttachmentModal);

    attachmentModal?.addEventListener('click', (e) => {
        if (e.target === attachmentModal) {
            closeAttachmentModal();
        }
    });

    document.querySelector('.attachment-modal-download')?.addEventListener('click', () => {
        forceDownload(currentAttachmentUrl);
    });

    document.querySelector('.attachment-modal-view')?.addEventListener('click', () => {
        window.open(currentAttachmentUrl, '_blank');
        closeAttachmentModal();
    });
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
        showLoading(); // Start loading indicator

        // Validate required state
        if (!currentState.language || !currentState.category) {
            throw new Error("Invalid state for loading lessons");
        }

        console.log("Loading lessons for:", currentState); // Debug log

        let lessonRef;
        const language = currentState.language;
        const category = currentState.category;
        const subcategory = currentState.subcategory;

        // Determine Firestore path
        if (subcategory) {
            lessonRef = db.collection(language)
                .doc(category)
                .collection('subCategories')
                .doc(subcategory)
                .collection('lessons');
        } else {
            lessonRef = db.collection(language)
                .doc(category)
                .collection('lessons');
        }

        const snapshot = await lessonRef.get();
        console.log("Lessons fetched:", snapshot.size); // Debug log

        if (snapshot.empty) {
            showToast("No lessons found in this category", true);
            return;
        }

        let lessons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Get selected sort order
        const sortOrder = document.getElementById("lesson-sort")?.value || "lessonNumber";

        // Apply sorting
        if (sortOrder === "newest") {
            lessons.reverse();
        } else if (sortOrder === "lessonNumber") {
            lessons.sort((a, b) => extractLessonNumber(a.title) - extractLessonNumber(b.title));
        } else if (sortOrder === "recentlyViewed") {
            const recentLessons = JSON.parse(localStorage.getItem("recentlyViewed")) || {};
            lessons.sort((a, b) => (recentLessons[b.id] || 0) - (recentLessons[a.id] || 0));
        }

        // Update lesson title
        const subCatText = subcategory ? ` - ${subcategory}` : '';
        document.getElementById("lesson-title").textContent =
            `${languageTranslations[language]} - ${categoryTranslations[language][category]}${subCatText}`;

        renderLessons(lessons);
        updateUI();

    } catch (error) {
        console.error("Error loading lessons:", error);
        showToast("Error loading lessons. Please try again.", true);
        navigateBack(); // Return if error
    } finally {
        hideLoading(); // Always hide loading at the end
    }
}


// Helper function to check if lesson is new (less than 1 week old)
function isLessonNew(createdAt) {
    if (!createdAt) return false;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return createdAt > oneWeekAgo;

    function getNoCookieYouTubeUrl(url) {
    const videoId = getYouTubeId(url);
    return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : url;
}
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



// Replace the existing popstate listener with this corrected version
window.addEventListener('popstate', () => {
    parseHash();  // Handle the hash in the URL
    updateUI();   // Update the UI based on the parsed state
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
    // Add validation for loaded data
    if (currentState.language && !appData[currentState.language]) {
        // If language is set but invalid, reset state
        currentState.language = null;
        currentState.category = null;
        currentState.subcategory = null;
    }

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
        category: null,
        subcategory: null
    };

    // Clear UI elements
    document.getElementById("language-selection").classList.remove("hidden");
    document.getElementById("category-selection").classList.add("hidden");
    document.getElementById("lesson-list").classList.add("hidden");

    // Reset to initial state
    localStorage.removeItem("navigationState");
    populateLanguages(Object.keys(appData));
    
    // Update URL to remove hash
    history.pushState({}, document.title, window.location.pathname);
    
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

// Update your service worker registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/Quran/sw.js')
            .then(registration => {
                console.log('SW registered:', registration);
                // Optional: Check for updates
                registration.update();
            })
            .catch(err => console.log('SW registration failed:', err));
    });
}



function showToast(message, isError = false) {
    // If message is a boolean (for backward compatibility), use default messages
    if (typeof message === 'boolean') {
        message = currentState.language === 'Sinhala' ? 
            (message ? 'සාර්ථකව සම්පූර්ණයි!' : 'දෝෂයක් ඇතිවිය') :
            currentState.language === 'Tamil' ? 
            (message ? 'வெற்றிகரமாக முடிந்தது!' : 'பிழை ஏற்பட்டது') :
            (message ? 'Completed successfully!' : 'An error occurred');
        isError = !message;
    }
    
    // Remove any existing toast first
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create the new toast
    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'error' : ''}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Auto-remove after delay with fade-out effect
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}



// Replace previous share functions with these
function toggleShareMenu() {
    const shareMenu = document.querySelector('.share-menu');
    shareMenu.classList.toggle('active');
    
    // Close when clicking outside
    if (shareMenu.classList.contains('active')) {
        document.addEventListener('click', closeShareMenuOnClickOutside);
    } else {
        document.removeEventListener('click', closeShareMenuOnClickOutside);
    }
}

function closeShareMenuOnClickOutside(e) {
    const shareMenu = document.querySelector('.share-menu');
    if (!shareMenu.contains(e.target)) {
        shareMenu.classList.remove('active');
        document.removeEventListener('click', closeShareMenuOnClickOutside);
    }
}

function copyToClipboard(text) {
    // Modern clipboard API
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text)
            .then(() => showToast('Link copied to clipboard!'))
            .catch(() => fallbackCopy(text));
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
        document.execCommand('copy');
        showToast('Link copied to clipboard!');
    } catch (err) {
        showToast('Failed to copy link', true);
    }
    
    document.body.removeChild(textarea);
}

// Update event listener in setupEventListeners
document.getElementById("floating-share").addEventListener("click", (e) => {
    e.stopPropagation();
    toggleShareMenu();
});

document.querySelectorAll('.share-option').forEach(button => {
    button.addEventListener('click', (e) => {
        e.stopPropagation();
        handleShare(button.dataset.platform);
    });
});
