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

const firebaseConfig = {
    databaseURL: "https://quranic-wisdom-default-rtdb.firebaseio.com",
};

const app = firebase.initializeApp(firebaseConfig);
const database = firebase.database();
let currentPath = '';
let currentLessonData = [];

document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('loggedIn') === 'true') {
        document.getElementById('login-page').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
        document.getElementById('username-display').textContent = 'Hello, ' + sessionStorage.getItem('username');
    }
});

// Toast function
function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast${isError ? ' error' : ''}`;
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// Tab switching function
function switchTab(tabNumber) {
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`tab${tabNumber}`).classList.add('active');
    document.querySelectorAll('.tab-btn')[tabNumber-1].classList.add('active');
    
    if(tabNumber > 1) {
        const language = ['Sinhala', 'Tamil', 'English'][tabNumber-2];
        loadAllLessons(language);
        
        // Update category filter options
        const filterCategoryId = `filterCategory${language}`;
        const filterSelect = document.getElementById(filterCategoryId);
        if (filterSelect) {
            const categories = categoryTranslations[language];
            filterSelect.innerHTML = '<option value="">All Categories</option>';
            Object.entries(categories).forEach(([key, label]) => {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = label;
                filterSelect.appendChild(option);
            });
        }
    }
}
// In admin.js, update the loadAllLessons function
async function loadAllLessons(language) {
    try {
        const categories = ['Courses', 'Surah', 'Arabic'];
        let allLessons = [];

        for(const category of categories) {
            const snapshot = await database.ref(`${language}/${category}`).once('value');
            const lessons = snapshot.val() || [];
            lessons.forEach((lesson, originalIndex) => { // Add originalIndex here
                lesson.category = category;
                lesson.language = language;
                lesson.originalIndex = originalIndex; // Store original index
                allLessons.push(lesson);
            });
        }

        renderLanguageLessons(language, allLessons);
    } catch (error) {
        console.error('Error loading lessons:', error);
        alert('Error loading lessons. Please Contact Administrator.');
    }
}

// In admin.js, update the renderLanguageLessons function
function renderLanguageLessons(language, lessons) {
    const container = document.getElementById(`${language.toLowerCase()}Lessons`);
    container.innerHTML = lessons.map((lesson) => {
        const categoryName = categoryTranslations[lesson.language][lesson.category];
        return `
        <div class="lesson-card" data-category="${lesson.category}" data-title="${lesson.title.toLowerCase()}">
            <h3>${lesson.title} (${categoryName})</h3>
            ${lesson.parts.map(part => `
                <p>${part.name}: ${part.youtube}</p>
            `).join('')}
            <div class="actions">
                <button onclick="editLanguageLesson('${lesson.language}', '${lesson.category}', ${lesson.originalIndex}, this)">Edit</button>
                <button onclick="deleteLanguageLesson('${lesson.language}', '${lesson.category}', ${lesson.originalIndex})" class="danger">Delete</button>
            </div>
        </div>
    `}).join('');
}

// Filter function for language tabs
function filterLessons(language) {
    const searchTerm = document.getElementById(`search${language}`).value.toLowerCase();
    const categoryFilter = document.getElementById(`filterCategory${language}`).value;
    const container = document.getElementById(`${language.toLowerCase()}Lessons`);

    Array.from(container.getElementsByClassName('lesson-card')).forEach(card => {
        const matchesCategory = !categoryFilter || card.dataset.category === categoryFilter;
        const matchesSearch = card.dataset.title.includes(searchTerm);
        card.style.display = (matchesCategory && matchesSearch) ? 'block' : 'none';
    });
}

// Modified edit function for language tabs
async function editLanguageLesson(language, category, index, element) {
    const container = element.closest('.lesson-list');
    const snapshot = await database.ref(`${language}/${category}`).once('value');
    const lessons = snapshot.val() || [];
    const lesson = lessons[index];

    const formHtml = `
        <div class="edit-form-container">
            <h3>Edit Lesson (${languageTranslations[language]} - ${categoryTranslations[language][category]})</h3>
            <div class="form-group">
                <label>Title:</label>
                <input id="editTitle-${language}" value="${lesson.title}">
            </div>
            
            <div id="partsContainer-${language}">
                ${lesson.parts.map((part, i) => `
                    <div class="part-inputs">
                        <div class="form-group">
                            <label>Part Name:</label>
                            <input value="${part.name}">
                        </div>
                        <div class="form-group">
                            <label>YouTube URL:</label>
                            <input value="${part.youtube}">
                        </div>
                        ${lesson.parts.length > 1 ? `
                            <button onclick="removePart(this)" class="remove-part danger">Remove Part</button>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
            
            <div class="actions">
                <button onclick="addPart('${language}')">Add Part</button>
                <button onclick="saveLanguageLesson('${language}', '${category}', ${index}, this)">Save</button>
                <button onclick="loadAllLessons('${language}')">Cancel</button>
            </div>
        </div>
    `;

    // Replace the lesson card with edit form
    element.closest('.lesson-card').outerHTML = formHtml;
}

// Modified delete function for language tabs
async function deleteLanguageLesson(language, category, index) {
    if (!confirm('Are you sure you want to delete this lesson?')) return;
    
    try {
        const ref = database.ref(`${language}/${category}`);
        const snapshot = await ref.once('value');
        const lessons = snapshot.val() || [];
        lessons.splice(index, 1);
        await ref.set(lessons);
        loadAllLessons(language);
        showToast('Lesson deleted successfully!');
    } catch (error) {
        console.error('Error deleting lesson:', error);
        showToast('Error deleting lesson. Please check console.', true);
    }
}

async function saveLanguageLesson(language, category, index, element) {
    const title = document.getElementById(`editTitle-${language}`).value;
    const partsContainer = document.getElementById(`partsContainer-${language}`);
    const parts = Array.from(partsContainer.querySelectorAll('.part-inputs')).map(div => {
        const inputs = div.querySelectorAll('input');
        return {
            name: inputs[0].value,
            youtube: inputs[1].value
        };
    });

    if (!title) {
        alert('Please enter a title for the lesson');
        return;
    }

    if (parts.some(part => !part.name || !part.youtube)) {
        alert('Please fill in all part fields');
        return;
    }

    try {
        const ref = database.ref(`${language}/${category}`);
        const snapshot = await ref.once('value');
        let lessons = snapshot.val() || [];
        
        lessons[index] = { title, parts, category };
        await ref.set(lessons);
        loadAllLessons(language);
        showToast('Lesson updated successfully!');
    } catch (error) {
        console.error('Error saving lesson:', error);
        showToast('Error saving lesson. Please check console.', true);
    }
}

// UI Functions
function loadCategories() {
    const language = document.getElementById('languageSelect').value;
    const translations = categoryTranslations[language] || {};
    const categorySelect = document.getElementById('categorySelect');
    categorySelect.innerHTML = '<option value="">Select Category</option>';
    Object.entries(translations).forEach(([key, label]) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = label;
        categorySelect.appendChild(option);
    });
    loadLessons();
}

async function loadLessons() {
    const language = document.getElementById('languageSelect').value;
    const category = document.getElementById('categorySelect').value;
    if (!language || !category) return;

    currentPath = `${language}/${category}`;
    try {
        const snapshot = await database.ref(currentPath).once('value');
        const lessons = snapshot.val() || [];
        
        const lessonList = document.getElementById('lessonList');
        lessonList.innerHTML = lessons.map((lesson, index) => `
            <div class="lesson-card">
                <h3>${lesson.title}</h3>
                ${lesson.parts.map(part => `
                    <p>${part.name}: ${part.youtube}</p>
                `).join('')}
                <div class="actions">
                    <button onclick="editLesson(${index})">Edit</button>
                    <button onclick="deleteLesson(${index})" class="danger">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading lessons:', error);
        alert('Error loading lessons. Please check console.');
    }
}

function showAddForm(lessonIndex = -1) {
    const lesson = lessonIndex === -1 ? { 
        title: '', 
        parts: [{ name: '', youtube: '' }] 
    } : currentLessonData[lessonIndex];

    document.getElementById('lessonList').innerHTML = `
        <div class="lesson-card">
            <h3>${lessonIndex === -1 ? 'Add New' : 'Edit'} Lesson</h3>
            <div class="form-group">
                <label>Title:</label>
                <input id="editTitle" value="${lesson.title}">
            </div>
            
            <div id="partsContainer">
                ${lesson.parts.map((part, i) => `
                    <div class="part-inputs">
                        <div class="form-group">
                            <label>Part Name:</label>
                            <input value="${part.name}">
                        </div>
                        <div class="form-group">
                            <label>YouTube URL:</label>
                            <input value="${part.youtube}">
                        </div>
                        ${lesson.parts.length > 1 ? `
                            <button onclick="removePart(this)" class="remove-part danger">Remove Part</button>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
            
            <div class="actions">
                <button onclick="addPart()">Add Part</button>
                <button onclick="saveLesson(${lessonIndex})">Save</button>
                <button onclick="loadLessons()">Cancel</button>
            </div>
        </div>
    `;
}

function addPart(language = '') {
    const containerId = language ? `partsContainer-${language}` : 'partsContainer';
    const container = document.getElementById(containerId);
    
    container.insertAdjacentHTML('beforeend', `
        <div class="part-inputs">
            <div class="form-group">
                <label>Part Name:</label>
                <input>
            </div>
            <div class="form-group">
                <label>YouTube URL:</label>
                <input>
            </div>
            <button onclick="removePart(this)" class="remove-part danger">Remove Part</button>
        </div>
    `);
}

function removePart(button) {
    button.closest('.part-inputs').remove();
}

async function saveLesson() {
    const language = document.getElementById('languageSelect').value;
    const category = document.getElementById('categorySelect').value;
    
    if (!language || !category) {
        showToast('Please select both language and category', true);
        return;
    }

    const title = document.getElementById('editTitle').value;
    const parts = Array.from(document.querySelectorAll('#partsContainer .part-inputs')).map(div => {
        const inputs = div.querySelectorAll('input');
        return {
            name: inputs[0].value,
            youtube: inputs[1].value
        };
    });

    if (!title) {
        showToast('Please enter a title for the lesson', true);
        return;
    }

    if (parts.some(part => !part.name || !part.youtube)) {
        showToast('Please fill in all part fields', true);
        return;
    }

    try {
        const path = `${language}/${category}`;
        const ref = database.ref(path);
        const snapshot = await ref.once('value');
        let lessons = snapshot.val() || [];

        lessons.push({ title, parts });
        await ref.set(lessons);
        
        clearForm();
        showToast('Lesson saved successfully!');

    } catch (error) {
        console.error('Error saving lesson:', error);
        showToast('Error saving lesson. Please check console.', true);
    }
}

function clearForm() {
    document.getElementById('editTitle').value = '';
    document.querySelectorAll('#partsContainer .part-inputs').forEach((div, index) => {
        const inputs = div.querySelectorAll('input');
        inputs[0].value = '';
        inputs[1].value = '';
        if (index > 0) div.remove();
    });
}

async function deleteLesson(index) {
    if (!confirm('Are you sure you want to delete this lesson?')) return;
    
    try {
        const ref = database.ref(currentPath);
        const snapshot = await ref.once('value');
        const lessons = snapshot.val() || [];
        lessons.splice(index, 1);
        await ref.set(lessons);
        loadLessons();
        showToast('Lesson deleted successfully!');
    } catch (error) {
        console.error('Error deleting lesson:', error);
        showToast('Error deleting lesson. Please check console.', true);
    }
}

// Initialize edit function
window.editLesson = (index) => {
    database.ref(currentPath).once('value').then(snapshot => {
        currentLessonData = snapshot.val() || [];
        showAddForm(index);
    });
}

switchTab(1);
