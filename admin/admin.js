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
    projectId: "quranic-wisdom",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let currentSubCategories = [];

document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('loggedIn') === 'true') {
        document.getElementById('login-page').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
        document.getElementById('username-display').textContent = 'Hello, ' + sessionStorage.getItem('username');
        
        // Load sub-categories when page loads
        document.getElementById('languageSelect').addEventListener('change', loadCategories);
        document.getElementById('categorySelect').addEventListener('change', loadSubCategories);
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
    
    if(tabNumber === 5) { // New subcategories tab
        loadSubcategoriesTab();
    } else if(tabNumber > 1 && tabNumber < 5) {
        const language = ['Sinhala', 'Tamil', 'English'][tabNumber-2];
        loadAllLessons(language);
    } else {
        // Clear any lesson list content when on form tab
        document.getElementById('lessonList').innerHTML = `
            <div class="lesson-card">
                <h3>Add New Lesson</h3>
                <div class="form-group">
                    <label>Title:</label>
                    <input id="editTitle">
                </div>
                <div id="partsContainer">
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
                </div>
                <div class="actions">
                    <button onclick="addPart()">Add Part</button>
                    <button onclick="clearForm()">Clear Form</button>
                    <button onclick="saveLesson()">Submit Lesson</button>
                </div>
            </div>
        `;
    }
}

async function loadSubcategoriesTab() {
    const language = document.getElementById('subcatLanguageSelect').value;
    const category = document.getElementById('subcatCategorySelect').value;
    
    if (!language || !category) return;

    try {
        const subcatsSnapshot = await db.collection(language)
            .doc(category)
            .collection('subCategories')
            .get();

        const container = document.getElementById('subcategoriesList');
        container.innerHTML = subcatsSnapshot.docs.map(doc => {
            const subcatData = doc.data();
            return `
                <div class="subcategory-folder">
                    <div class="folder-header" onclick="toggleSubcategory('${doc.id}')">
                        <i class="fas fa-folder"></i>
                        <h3>${subcatData.name}</h3>
                        <span class="lesson-count">${subcatData.lessonCount || 0} lessons</span>
                    </div>
                    <div id="subcat-${doc.id}" class="subcategory-lessons hidden"></div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading subcategories:', error);
        showToast('Error loading subcategories', true);
    }
}

async function toggleSubcategory(subcatId) {
    const container = document.getElementById(`subcat-${subcatId}`);
    if (container.classList.contains('hidden')) {
        const language = document.getElementById('subcatLanguageSelect').value;
        const category = document.getElementById('subcatCategorySelect').value;
        
        try {
            const lessonsSnapshot = await db.collection(language)
                .doc(category)
                .collection('subCategories')
                .doc(subcatId)
                .collection('lessons')
                .orderBy('createdAt')
                .get();

            container.innerHTML = lessonsSnapshot.docs.map(doc => `
                <div class="lesson-card">
                    <h4>${doc.data().title}</h4>
                    ${doc.data().parts.map(part => `
                        <p>${part.name}: ${part.youtube}</p>
                    `).join('')}
                    <div class="actions">
                        <button onclick="editSubcategoryLesson('${subcatId}', '${doc.id}')">Edit</button>
                        <button onclick="deleteSubcategoryLesson('${subcatId}', '${doc.id}')" class="danger">Delete</button>
                    </div>
                </div>
            `).join('');
            
            container.classList.remove('hidden');
        } catch (error) {
            console.error('Error loading subcategory lessons:', error);
            showToast('Error loading lessons', true);
        }
    } else {
        container.classList.add('hidden');
    }
}

// Add to DOMContentLoaded event
document.getElementById('subcatLanguageSelect').addEventListener('change', async (e) => {
    const language = e.target.value;
    const categorySelect = document.getElementById('subcatCategorySelect');
    categorySelect.innerHTML = '<option value="">Select Category</option>';
    
    if (language) {
        const categories = Object.keys(categoryTranslations[language]);
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = categoryTranslations[language][category];
            categorySelect.appendChild(option);
        });
    }
});

document.getElementById('subcatCategorySelect').addEventListener('change', () => {
    loadSubcategoriesTab();
});

// In admin.js, update the loadAllLessons function
async function loadAllLessons(language) {
    try {
        const categories = ['Courses', 'Surah', 'Arabic'];
        let allLessons = [];

        for(const category of categories) {
            // Get main category lessons
            const mainLessonsSnapshot = await db.collection(language)
                .doc(category)
                .collection('lessons')
                .get();

            mainLessonsSnapshot.forEach(doc => {
                allLessons.push({
                    id: doc.id,
                    ...doc.data(),
                    language,
                    category,
                    isSubcategory: false
                });
            });

            // Get subcategories and their lessons
            const subCategoriesSnapshot = await db.collection(language)
                .doc(category)
                .collection('subCategories')
                .get();

            for(const subCatDoc of subCategoriesSnapshot.docs) {
                const subLessonsSnapshot = await subCatDoc.ref.collection('lessons').get();
                
                subLessonsSnapshot.forEach(doc => {
                    allLessons.push({
                        id: doc.id,
                        ...doc.data(),
                        language,
                        category,
                        subCategory: subCatDoc.id,
                        isSubcategory: true
                    });
                });
            }
        }

        renderLanguageLessons(language, allLessons);
    } catch (error) {
        console.error('Error loading lessons:', error);
        showToast('Error loading lessons', true);
    }
}

// Modify the renderLanguageLessons function in admin.js
function renderLanguageLessons(language, lessons) {
    const container = document.getElementById(`${language.toLowerCase()}Lessons`);
    container.innerHTML = lessons.map((lesson) => {
        const isNew = isLessonNew(lesson.createdAt?.toDate());
        const categoryName = categoryTranslations[lesson.language][lesson.category];
        const subCatText = lesson.isSubcategory ? ` - ${lesson.subCategory}` : '';
        
        return `
        <div class="lesson-card" 
            data-category="${lesson.category}" 
            data-subcategory="${lesson.subCategory || ''}"
            data-title="${lesson.title.toLowerCase()}">
            
            <h3>${lesson.title} (${categoryName}${subCatText})</h3>
            ${isNew ? '<span class="new-lesson-badge">✨New Lesson</span>' : ''}
            
            ${lesson.parts.map(part => `
                <p>${part.name}: ${part.youtube}</p>
            `).join('')}
            
            <div class="actions">
                <button onclick="editLanguageLesson('${lesson.language}', 
                    '${lesson.category}', 
                    '${lesson.id}', 
                    ${lesson.isSubcategory}, 
                    '${lesson.subCategory || ''}', 
                    this)">
                    Edit
                </button>
                <button onclick="deleteLanguageLesson('${lesson.language}', 
                    '${lesson.category}', 
                    '${lesson.id}', 
                    ${lesson.isSubcategory}, 
                    '${lesson.subCategory || ''}')" 
                    class="danger">
                    Delete
                </button>
            </div>
        </div>
        `;
    }).join('');
}

// Add this helper function to admin.js (same as in script.js)
function isLessonNew(createdAt) {
    if (!createdAt) return false;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return createdAt > oneWeekAgo;
}

async function saveLessonEdit(language, category, lessonId, isSubcategory, subCategory) {
    try {
        let title = document.getElementById(`edit-title-${lessonId}`).value.trim();
        const partsContainer = document.getElementById(`parts-container-${lessonId}`);
        
        // Add emoji to title if missing
        if (!title.startsWith('📜 ')) {
            title = '📜 ' + title;
        }

        // Process parts with emojis for name and YouTube URL
        const parts = Array.from(partsContainer.querySelectorAll('.part-inputs')).map(partDiv => {
            const inputs = partDiv.querySelectorAll('input');
            let partName = inputs[0].value.trim();
            let youtubeUrl = inputs[1].value.trim();

            // Add emojis to part name and YouTube URL if missing
            if (!partName.startsWith('📖 ')) {
                partName = '📖 ' + partName;
            }
            if (!youtubeUrl.startsWith('🔗 ')) {
                youtubeUrl = '🔗 ' + youtubeUrl;
            }

            return {
                name: partName,
                youtube: youtubeUrl
            };
        });

        // Validation
        if (!title) {
            showToast('Title is required', true);
            return;
        }
        
        if (parts.length === 0) {
            showToast('At least one part is required', true);
            return;
        }

        if (parts.some(part => !part.name || !part.youtube)) {
            showToast('All parts must have both fields filled', true);
            return;
        }

        // Prepare update data
        const updateData = {
            title,
            parts,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Get correct reference for updating the lesson
        let lessonRef;
        if (isSubcategory) {
            lessonRef = db.collection(language)
                .doc(category)
                .collection('subCategories')
                .doc(subCategory)
                .collection('lessons')
                .doc(lessonId);
        } else {
            lessonRef = db.collection(language)
                .doc(category)
                .collection('lessons')
                .doc(lessonId);
        }

        // Update document in Firestore
        await lessonRef.update(updateData);
        showToast('Lesson updated successfully!');
        loadAllLessons(language);
        
    } catch (error) {
        console.error('Save error:', error);
        showToast('Error saving changes', true);
    }
}


// Filter function for language tabs
function filterLessons(language) {
    const searchTerm = document.getElementById(`search${language}`).value.toLowerCase();
    const categoryFilter = document.getElementById(`filterCategory${language}`).value;
    const newOnly = document.getElementById(`newOnly${language}`).checked;
    const container = document.getElementById(`${language.toLowerCase()}Lessons`);

    Array.from(container.getElementsByClassName('lesson-card')).forEach(card => {
        const matchesCategory = !categoryFilter || card.dataset.category === categoryFilter;
        const matchesSearch = card.dataset.title.includes(searchTerm);
        const isNew = card.querySelector('.new-lesson-badge') !== null;
        const matchesNewFilter = !newOnly || isNew;
        
        card.style.display = (matchesCategory && matchesSearch && matchesNewFilter) ? 'block' : 'none';
    });
}
// Modified edit function for language tabs
async function editLanguageLesson(language, category, lessonId, isSubcategory, subCategory, element) {
    try {
        let lessonRef;

        // Reference to the correct lesson document based on subcategory
        if (isSubcategory) {
            lessonRef = db.collection(language)
                .doc(category)
                .collection('subCategories')
                .doc(subCategory)
                .collection('lessons')
                .doc(lessonId);
        } else {
            lessonRef = db.collection(language)
                .doc(category)
                .collection('lessons')
                .doc(lessonId);
        }

        // Fetch lesson data
        const docSnap = await lessonRef.get();

        // Check if lesson exists
        if (!docSnap.exists) {
            showToast('Lesson not found', true);
            return;
        }

        const lesson = docSnap.data();
        
        // Generate form HTML
        const formHtml = `
            <div class="edit-form-container">
                <h3>Edit Lesson</h3>
                <div class="form-group">
                    <label>Title:</label>
                    <input value="${lesson.title}" id="edit-title-${lessonId}" class="full-width">
                </div>

                <div id="parts-container-${lessonId}">
                    ${lesson.parts.map((part, index) => `
                        <div class="part-inputs">
                            <div class="form-group">
                                <label>Part ${index + 1} Name:</label>
                                <input value="${part.name}" class="full-width">
                            </div>
                            <div class="form-group">
                                <label>YouTube URL:</label>
                                <input value="${part.youtube}" class="full-width">
                            </div>
                            <button onclick="removePart(this)" class="remove-part danger">
                                Remove Part
                            </button>
                        </div>
                    `).join('')}
                </div>

                <div class="actions">
                    <button onclick="addPart('${lessonId}')">Add New Part</button>
                    <button onclick="saveLessonEdit('${language}', '${category}', '${lessonId}', ${isSubcategory}, '${subCategory}')" class="save-btn">
                        Save Changes
                    </button>
                    <button onclick="loadAllLessons('${language}')" class="cancel-btn">
                        Cancel
                    </button>
                </div>
            </div>
        `;

        // Replace the current lesson card with the new form
        element.closest('.lesson-card').outerHTML = formHtml;
    } catch (error) {
        console.error('Edit error:', error);
        showToast('Error editing lesson', true);
    }
}


// Updated addPart function to work with edit forms
function addPart(lessonId = '') {
    const containerId = lessonId ? `parts-container-${lessonId}` : 'partsContainer';
    const container = document.getElementById(containerId);
    
    const partHtml = `
        <div class="part-inputs">
            <div class="form-group">
                <label>Part Name:</label>
                <input class="full-width">
            </div>
            <div class="form-group">
                <label>YouTube URL:</label>
                <input class="full-width">
            </div>
            <button onclick="removePart(this)" class="remove-part danger">
                Remove Part
            </button>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', partHtml);
}

// Modified delete function for language tabs
async function deleteLanguageLesson(language, category, lessonId, isSubcategory, subCategory) {
    if (!confirm('Are you sure?')) return;
    
    try {
        let lessonRef;

        if (isSubcategory) {
            lessonRef = db.collection(language)
                .doc(category)
                .collection('subCategories')
                .doc(subCategory)
                .collection('lessons')
                .doc(lessonId);
        } else {
            lessonRef = db.collection(language)
                .doc(category)
                .collection('lessons')
                .doc(lessonId);
        }

        await lessonRef.delete();
        showToast('Lesson deleted!');
        loadAllLessons(language);
    } catch (error) {
        console.error('Delete error:', error);
        showToast('Delete failed', true);
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
    // Don't load lessons if we're on the "Submit New Lessons" tab
    if (document.getElementById('tab1').classList.contains('active')) {
        return;
    }

    const language = document.getElementById('languageSelect').value;
    const category = document.getElementById('categorySelect').value;
    const subCategory = document.getElementById('subCategorySelect').value;
    
    if (!language || !category) {
        showToast("Please select language and category", true);
        return;
    }

    try {
        let lessonPath;
        if (subCategory) {
            lessonPath = `${language}/${category}/subCategories/${subCategory}/lessons`;
        } else {
            lessonPath = `${language}/${category}/lessons`;
        }

        const snapshot = await db.collection(lessonPath).orderBy('createdAt').get();
        
        if (snapshot.empty) {
            document.getElementById('lessonList').innerHTML = '<div class="lesson-card">No lessons found</div>';
            return;
        }

        const lessons = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Get selected sort order
        const sortOrder = document.getElementById('lessonSort')?.value || "newest";

        // Apply sorting
        if (sortOrder === "newest") {
            lessons.reverse();
        } else if (sortOrder === "lessonNumber") {
            lessons.sort((a, b) => extractLessonNumber(a.title) - extractLessonNumber(b.title));
        } else if (sortOrder === "recentlyViewed") {
            const recentLessons = JSON.parse(localStorage.getItem("recentlyViewed")) || {};
            lessons.sort((a, b) => (recentLessons[b.title] || 0) - (recentLessons[a.title] || 0));
        }

        // Render sorted lessons
        const container = document.getElementById('lessonList');
        container.innerHTML = lessons.map(lesson => `
            <div class="lesson-card">
                <h3>${lesson.title}</h3>
                ${lesson.parts.map(part => `
                    <div class="lesson-part">
                        <p>${part.name}</p>
                        <a href="${part.youtube}" target="_blank" class="button">
                            Watch <i class="fas fa-external-link-alt"></i>
                        </a>
                    </div>
                `).join('')}
                <div class="actions">
                    <button onclick="editLesson('${lesson.id}')">Edit</button>
                    <button onclick="deleteLesson('${lesson.id}')" class="danger">Delete</button>
                </div>
            </div>
        `).join('');

        // Add click handlers for video links
        document.querySelectorAll('.lesson-card .button').forEach(button => {
            button.addEventListener('click', () => {
                const lessonTitle = button.closest('.lesson-card').querySelector('h3').textContent;
                let recentLessons = JSON.parse(localStorage.getItem("recentlyViewed")) || {};
                recentLessons[lessonTitle] = Date.now();
                localStorage.setItem("recentlyViewed", JSON.stringify(recentLessons));
            });
        });

        updateUI();
    } catch (error) {
        console.error('Error loading lessons:', error);
        showToast('Error loading lessons. Please check console.', true);
    }
}


// Helper function to extract lesson numbers
function extractLessonNumber(title) {
    const match = title.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
}

// Update the editLesson function
async function editLesson(lessonId) {
    const language = document.getElementById('languageSelect').value;
    const category = document.getElementById('categorySelect').value;
    const subCategory = document.getElementById('subCategorySelect').value;
    
    try {
        const lessonPath = `${language}/${category}/subCategories/${subCategory}/lessons`;
        const docRef = db.collection(lessonPath).doc(lessonId);
        const docSnap = await docRef.get();
        
        if (!docSnap.exists) {
            showToast('Lesson not found', true);
            return;
        }

        const lesson = docSnap.data();
        showAddForm(lesson);
    } catch (error) {
        console.error('Error loading lesson:', error);
        showToast('Error loading lesson. Please check console.', true);
    }
}

// Update the deleteLesson function
async function deleteLesson(lessonId) {
    if (!confirm('Are you sure you want to delete this lesson?')) return;
    
    const language = document.getElementById('languageSelect').value;
    const category = document.getElementById('categorySelect').value;
    const subCategory = document.getElementById('subCategorySelect').value;
    
    try {
        const lessonPath = `${language}/${category}/subCategories/${subCategory}/lessons`;
        await db.collection(lessonPath).doc(lessonId).delete();
        loadLessons();
        showToast('Lesson deleted successfully!');
    } catch (error) {
        console.error('Error deleting lesson:', error);
        showToast('Error deleting lesson. Please check console.', true);
    }
}

// Update the showAddForm function
function showAddForm(lesson = null) {
    const isEdit = lesson !== null;
    
    document.getElementById('lessonList').innerHTML = `
        <div class="lesson-card">
            <h3>${isEdit ? 'Edit' : 'Add New'} Lesson</h3>
            <div class="form-group">
                <label>Title:</label>
                <input id="editTitle" value="${isEdit ? lesson.title : ''}">
            </div>
            
            <div id="partsContainer">
                ${(isEdit ? lesson.parts : [{ name: '', youtube: '' }]).map((part, i) => `
                    <div class="part-inputs">
                        <div class="form-group">
                            <label>Part Name:</label>
                            <input value="${part.name}">
                        </div>
                        <div class="form-group">
                            <label>YouTube URL:</label>
                            <input value="${part.youtube}">
                        </div>
                        ${(isEdit ? lesson.parts.length > 1 : i > 0) ? `
                            <button onclick="removePart(this)" class="remove-part danger">Remove Part</button>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
            
            <div class="actions">
                <button onclick="addPart()">Add Part</button>
                <button onclick="saveLesson('${isEdit ? lesson.id : ''}')">Save</button>
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

async function saveLesson(lessonId = null) {
    const language = document.getElementById('languageSelect').value;
    const category = document.getElementById('categorySelect').value;
    const subCategory = document.getElementById('subCategorySelect').value;
    
    if (!language || !category) {
        showToast("Please select language and category", true);
        return;
    }

    // Get title input from the correct form
    const titleInput = document.getElementById('editTitle');
    if (!titleInput) {
        showToast("Could not find title input field", true);
        return;
    }
    let title = titleInput.value.trim();

    // Add emoji to title if missing
    if (!title.startsWith('📜 ')) {
        title = '📜 ' + title;
    }

    const parts = Array.from(document.querySelectorAll('#partsContainer .part-inputs')).map(div => {
        const inputs = div.querySelectorAll('input');
        let partName = inputs[0].value.trim();
        let youtubeUrl = inputs[1].value.trim();

        // Add emojis to part name and YouTube URL
        if (!partName.startsWith('📖 ')) {
            partName = '📖 ' + partName;
        }
        if (!youtubeUrl.startsWith('🔗 ')) {
            youtubeUrl = '🔗 ' + youtubeUrl;
        }

        return {
            name: partName,
            youtube: youtubeUrl
        };
    });

    if (!title) {
        showToast("Please enter a title for the lesson", true);
        return;
    }

    if (parts.some(part => !part.name || !part.youtube)) {
        showToast("Please fill in all part fields", true);
        return;
    }

    try {
        let lessonRef;
        const lessonData = {
            title,
            parts,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(), // Store creation timestamp
            isNew: true // Flag to mark the lesson as new
        };

        if (subCategory) {
            // Save to subcategory
            const subCatRef = db.collection(language)
                .doc(category)
                .collection('subCategories')
                .doc(subCategory);

            lessonRef = subCatRef.collection('lessons');
        } else {
            // Save to main category
            lessonRef = db.collection(language)
                .doc(category)
                .collection('lessons');
        }

        if (lessonId) {
            await lessonRef.doc(lessonId).update(lessonData); // Update existing lesson
            showToast('Lesson updated successfully!');
        } else {
            await lessonRef.add(lessonData); // Create a new lesson
            showToast('Lesson saved successfully!');
        }

        clearForm(); // Clear the form after saving the lesson
        loadLessons(); // Load updated lessons
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



// Initialize edit function
window.editLesson = async (index) => {
    const language = document.getElementById('languageSelect').value;
    const category = document.getElementById('categorySelect').value;
    
    const docRef = db.collection(language).doc(category);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
        showToast('Lesson not found', true);
        return;
    }

    const lessons = docSnap.data().lessons || [];
    currentLessonData = lessons;
    showAddForm(index);
}

async function loadSubCategories() {
    const language = document.getElementById('languageSelect').value;
    const category = document.getElementById('categorySelect').value;
    
    if (!language || !category) {
        currentSubCategories = [];
        updateSubCategorySelect();
        return;
    }

    try {
        const subCategoriesSnapshot = await db.collection(language)
            .doc(category)
            .collection('subCategories')
            .get();

        currentSubCategories = subCategoriesSnapshot.docs.map(doc => doc.id);
        updateSubCategorySelect();
    } catch (error) {
        console.error("Error loading sub-categories:", error);
        showToast("Error loading sub-categories", true);
    }
}


function updateSubCategorySelect() {
    const select = document.getElementById('subCategorySelect');
    select.innerHTML = '<option value="">Select Sub-Category (Optional)</option>';
    
    currentSubCategories.forEach(subCat => {
        const option = document.createElement('option');
        option.value = subCat;
        option.textContent = subCat;
        select.appendChild(option);
    });
    
    // Add option to manage sub-categories
    const manageOption = document.createElement('option');
    manageOption.value = "manage";
    manageOption.textContent = "Manage Sub-Categories...";
    select.appendChild(manageOption);
}

function addSubCategory() {
    document.getElementById('subCategoryModal').style.display = 'block';
    renderSubCategoryList();
}

function closeSubCategoryModal() {
    document.getElementById('subCategoryModal').style.display = 'none';
}

function renderSubCategoryList() {
    const container = document.getElementById('subCategoryList');
    container.innerHTML = currentSubCategories.map(subCat => `
        <div class="sub-category-item">
            <span>${subCat}</span>
            <div>
                <button onclick="editSubCategory('${subCat}')">Edit</button>
                <button class="danger" onclick="deleteSubCategory('${subCat}')">Delete</button>
            </div>
        </div>
    `).join('');
}

async function saveSubCategory() {
    const newSubCat = document.getElementById('newSubCategory').value.trim();
    const language = document.getElementById('languageSelect').value;
    const category = document.getElementById('categorySelect').value;

    if (!newSubCat) {
        showToast("Please enter a sub-category name", true);
        return;
    }

    try {
        // Create subcategory document in the subCategories collection
        const subcatRef = db.collection(language)
            .doc(category)
            .collection('subCategories')
            .doc(newSubCat);

        await subcatRef.set({
            name: newSubCat,
            lessonCount: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Update local state
        currentSubCategories.push(newSubCat);
        updateSubCategorySelect();
        renderSubCategoryList();
        
        document.getElementById('newSubCategory').value = '';
        showToast('Subcategory created successfully!');
    } catch (error) {
        console.error('Error creating subcategory:', error);
        showToast('Error creating subcategory', true);
    }
}


async function editSubCategory(oldName) {
    const newName = prompt("Enter new name for sub-category:", oldName);
    
    if (newName && newName.trim() && newName !== oldName) {
        const index = currentSubCategories.indexOf(oldName);
        if (index !== -1) {
            currentSubCategories[index] = newName.trim();
            await updateSubCategoriesInDB();
            renderSubCategoryList();
            updateSubCategorySelect();
        }
    }
}

async function deleteSubCategory(name) {
    if (!confirm(`Are you sure you want to delete "${name}" and all its lessons?`)) return;
    
    try {
        const language = document.getElementById('languageSelect').value;
        const category = document.getElementById('categorySelect').value;
        
        // Delete all lessons in subcategory
        const lessonsRef = db.collection(language)
            .doc(category)
            .collection('subCategories')
            .doc(name)
            .collection('lessons');

        const snapshot = await lessonsRef.get();
        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        // Delete subcategory document
        await db.collection(language)
            .doc(category)
            .collection('subCategories')
            .doc(name)
            .delete();

        // Update local state
        const index = currentSubCategories.indexOf(name);
        if (index !== -1) {
            currentSubCategories.splice(index, 1);
            renderSubCategoryList();
            updateSubCategorySelect();
        }
        
        showToast('Subcategory deleted successfully!');
    } catch (error) {
        console.error('Error deleting subcategory:', error);
        showToast('Error deleting subcategory', true);
    }
}

async function updateSubCategoriesInDB() {
    const language = document.getElementById('languageSelect').value;
    const category = document.getElementById('categorySelect').value;
    
    try {
        const docRef = db.collection(language).doc(category);
        await docRef.set({
            subCategories: currentSubCategories,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        showToast("Sub-categories updated successfully!");
    } catch (error) {
        console.error("Error updating sub-categories:", error);
        showToast("Error updating sub-categories", true);
    }
}



function updateUI() {
    // Update UI elements as needed
    const language = document.getElementById('languageSelect').value;
    const category = document.getElementById('categorySelect').value;
    const subCategory = document.getElementById('subCategorySelect').value;
    
    // Update lesson title if on lesson tab
    if (!document.getElementById('tab1').classList.contains('active')) {
        const title = document.getElementById('lesson-title');
        if (title) {
            title.textContent = `${languageTranslations[language]} - ${categoryTranslations[language][category]}${subCategory ? ` - ${subCategory}` : ''}`;
        }
    }
}

// Add this function to your admin.js or a separate utility file
async function updateNewLessonStatus() {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const languages = ['Sinhala', 'Tamil', 'English'];
    const categories = ['Courses', 'Surah', 'Arabic'];
    
    for (const language of languages) {
        for (const category of categories) {
            // Update main category lessons
            const lessonsSnapshot = await db.collection(language)
                .doc(category)
                .collection('lessons')
                .where('isNew', '==', true)
                .where('createdAt', '<=', oneWeekAgo)
                .get();
                
            const batch = db.batch();
            lessonsSnapshot.docs.forEach(doc => {
                batch.update(doc.ref, { isNew: false });
            });
            await batch.commit();
            
            // Update subcategory lessons
            const subCategoriesSnapshot = await db.collection(language)
                .doc(category)
                .collection('subCategories')
                .get();
                
            for (const subCatDoc of subCategoriesSnapshot.docs) {
                const subLessonsSnapshot = await subCatDoc.ref.collection('lessons')
                    .where('isNew', '==', true)
                    .where('createdAt', '<=', oneWeekAgo)
                    .get();
                    
                const subBatch = db.batch();
                subLessonsSnapshot.docs.forEach(doc => {
                    subBatch.update(doc.ref, { isNew: false });
                });
                await subBatch.commit();
            }
        }
    }
}

// Run this function periodically (e.g., once a day)
// You can set this up in your admin panel or as a Firebase scheduled function

switchTab(1);
