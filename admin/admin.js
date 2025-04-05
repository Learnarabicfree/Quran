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
let notificationFormShown = false;

const forgetMeBtn = document.getElementById('forgetMeBtn');

document.addEventListener('DOMContentLoaded', () => {
    // ✅ Show main content if logged in
    if (sessionStorage.getItem('loggedIn') === 'true') {
        document.getElementById('login-page').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
        document.getElementById('username-display').textContent = 'Hello, ' + sessionStorage.getItem('username');

        // ✅ Initialize category dropdowns
        document.getElementById('languageSelect').addEventListener('change', loadCategories);
        document.getElementById('categorySelect').addEventListener('change', loadSubCategories);
    }

    // ✅ Restore notification form values from sessionStorage if available
    if (sessionStorage.getItem('notificationTitle')) {
        document.getElementById('notificationTitle').value = sessionStorage.getItem('notificationTitle');
    }
    if (sessionStorage.getItem('notificationBody')) {
        document.getElementById('notificationBody').value = sessionStorage.getItem('notificationBody');
    }
    if (sessionStorage.getItem('notificationLink')) {
        document.getElementById('notificationLink').value = sessionStorage.getItem('notificationLink');
    }

    // ✅ Save form values on input
    document.getElementById('notificationTitle').addEventListener('input', (e) => {
        sessionStorage.setItem('notificationTitle', e.target.value);
    });
    document.getElementById('notificationBody').addEventListener('input', (e) => {
        sessionStorage.setItem('notificationBody', e.target.value);
    });
    document.getElementById('notificationLink').addEventListener('input', (e) => {
        sessionStorage.setItem('notificationLink', e.target.value);
    });
});


// Toast function - Fix and enhance this
function showToast(message, isError = false) {
    // Remove existing toasts
    document.querySelectorAll('.toast').forEach(toast => toast.remove());

    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'error' : ''}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

  
// Tab switching function
function switchTab(tabNumber) {
    // Remove 'active' class from all tab contents and buttons
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Handle notifications tab (tab 6) specifically
    if (tabNumber === 6) {
        document.getElementById('tab6').classList.add('active');
        document.querySelectorAll('.tab-btn')[5].classList.add('active');
        loadNotificationsTab();

        // Always show form when switching to notifications tab
        document.querySelector('.notification-form').style.display = 'block';
        sessionStorage.setItem('notificationFormVisible', 'true');
    } else {
        // Hide form when switching away from notifications tab
        document.querySelector('.notification-form').style.display = 'none';
        sessionStorage.setItem('notificationFormVisible', 'false');
    }

    // Clear existing dynamic content when switching to form tab
    if(tabNumber === 1) {
        const partsContainer = document.getElementById('partsContainer');
        const attachmentsContainer = document.getElementById('attachmentsContainer');
        
        // Reset parts to initial state (keep first part only)
        while(partsContainer.children.length > 1) {
            partsContainer.lastChild.remove();
        }
        
        // Reset attachments to template only
        Array.from(attachmentsContainer.children).forEach(el => {
            if(!el.style.display || el.style.display !== 'none') {
                el.remove();
            }
        });
    }

    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`tab${tabNumber}`).classList.add('active');
    document.querySelectorAll('.tab-btn')[tabNumber-1].classList.add('active');
    
    if(tabNumber === 5) {
        loadSubcategoriesTab();
    } else if(tabNumber > 1 && tabNumber < 5) {
        const language = ['Sinhala', 'Tamil', 'English'][tabNumber-2];
        loadAllLessons(language);
    } else {
        // Only reset form if needed
        if(!document.getElementById('editTitle')) {
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
                    <div id="attachmentsContainer">
                        <div class="attachment-inputs" style="display: none;">
                            <div class="form-group">
                                <label>Attachment Name:</label>
                                <input>
                            </div>
                            <div class="form-group">
                                <label>Download Link:</label>
                                <input>
                            </div>
                            <button onclick="removeAttachment(this)" class="remove-attachment danger">Remove Attachment</button>
                        </div>
                    </div>
                    <div class="actions">
                        <button onclick="addPart()">Add Part</button>
                        <button onclick="addAttachment()">Add Attachment</button>
                        <button onclick="clearForm()">Clear Form</button>
                        <button onclick="saveLesson()">Submit Lesson</button>
                    </div>
                </div>`;
        }
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

function populateSubCategories(category) {
    const subContainer = document.getElementById("subcategories-container");
    const currentLang = currentState.language;
    const categoryData = appData[currentLang][category];

    // Remove any existing content
    subContainer.innerHTML = '';

    // Only create subcategory cards
    categoryData.subCategories.forEach(subCat => {
        const subcategoryCard = document.createElement('div');
        subcategoryCard.className = 'card subcategory-card';
        subcategoryCard.dataset.category = category;
        subcategoryCard.dataset.subcategory = subCat.id;
        
        subcategoryCard.innerHTML = `
            <i class="fas fa-folder"></i>
            <h3>${subCat.name}</h3>
            <span class="lesson-count">${subCat.lessonCount} lessons</span>
        `;
        
        subContainer.appendChild(subcategoryCard);
    });
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

        for (const category of categories) {
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

            for (const subCatDoc of subCategoriesSnapshot.docs) {
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

        // Sort lessons by lesson number (same as home page)
        allLessons.sort((a, b) => extractLessonNumber(a.title) - extractLessonNumber(b.title));

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
        const attachmentsContainer = document.getElementById(`attachments-container-${lessonId}`);

        // Ensure title has the correct emoji
        if (!title.startsWith('📜 ')) {
            title = '📜 ' + title;
        }

        // Process parts with emojis for name and YouTube URL
        const parts = Array.from(partsContainer.querySelectorAll('.part-inputs')).map(partDiv => {
            const inputs = partDiv.querySelectorAll('input');
            let partName = inputs[0].value.trim();
            let youtubeUrl = inputs[1].value.trim();

            if (!partName.startsWith('📖 ')) {
                partName = '📖 ' + partName;
            }
            if (!youtubeUrl.startsWith('🔗 ')) {
                youtubeUrl = '🔗 ' + youtubeUrl;
            }

            return { name: partName, youtube: youtubeUrl };
        });

        // Process attachments with emojis
        const attachments = Array.from(attachmentsContainer.querySelectorAll('.attachment-inputs')).map(attDiv => {
            const inputs = attDiv.querySelectorAll('input');
            let attachmentName = inputs[0].value.trim();
            let downloadLink = inputs[1].value.trim();
        
            if (attachmentName && !attachmentName.startsWith('📥 ')) {
                attachmentName = '📥 ' + attachmentName;
            }
        
            return { name: attachmentName, link: downloadLink };
        }).filter(att => att.name && att.link);

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
            attachments,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Get the correct Firestore reference
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

        // Update Firestore document
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

        // Generate form HTML with updated function names
        const formHtml = `
            <div class="edit-form-container">
                <h3>Edit Lesson</h3>
                <div class="form-group">
                    <label>Title:</label>
                    <input value="${lesson.title.replace(/^📜\s*/g, '')}" 
                           id="edit-title-${lessonId}" 
                           class="full-width">
                </div>

                <div id="parts-container-${lessonId}">
                    ${lesson.parts.map((part, index) => `
                        <div class="part-inputs">
                            <div class="form-group">
                                <label>Part ${index + 1} Name:</label>
                                <input value="${part.name.replace(/^📖\s*/g, '')}">
                            </div>
                            <div class="form-group">
                                <label>YouTube URL:</label>
                                <input value="${part.youtube.replace(/^🔗\s*/g, '')}">
                            </div>
                            <button onclick="removePart(this)" 
                                    class="remove-part danger">
                                Remove Part
                            </button>
                        </div>
                    `).join('')}
                </div>

                <div id="attachments-container-${lessonId}">
                    ${(lesson.attachments || []).map((att, index) => `
                        <div class="attachment-inputs">
                            <div class="form-group">
                                <label>Attachment ${index + 1} Name:</label>
                                <input value="${att.name.replace(/^📎\s*/g, '')}">
                            </div>
                            <div class="form-group">
                                <label>Download Link:</label>
                                <input value="${att.link}">
                            </div>
                            <button onclick="removeAttachment(this)" 
                                    class="remove-attachment danger">
                                Remove Attachment
                            </button>
                        </div>
                    `).join('')}
                </div>

                <div class="actions">
                    <button onclick="addPartToLesson('${lessonId}')">Add New Part</button>
                    <button onclick="addAttachmentToLesson('${lessonId}')">Add New Attachment</button>
                    <button onclick="saveLessonEdit('${language}', '${category}', '${lessonId}', ${isSubcategory}, '${subCategory}')" 
                            class="save-btn">
                        Save Changes
                    </button>
                    <button onclick="loadAllLessons('${language}')" 
                            class="cancel-btn">
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

function addPartToLesson(lessonId) {
    const container = document.getElementById(`parts-container-${lessonId}`);
    if (!container) return;

    const newPart = document.createElement('div');
    newPart.className = 'part-inputs';
    newPart.innerHTML = `
        <div class="form-group">
            <label>Part Name:</label>
            <input>
        </div>
        <div class="form-group">
            <label>YouTube URL:</label>
            <input>
        </div>
        <button onclick="removePart(this)" 
                class="remove-part danger">
            Remove Part
        </button>
    `;
    
    container.appendChild(newPart);
}

function addAttachmentToLesson(lessonId) {
    const container = document.getElementById(`attachments-container-${lessonId}`);
    if (!container) return;

    const newAttachment = document.createElement('div');
    newAttachment.className = 'attachment-inputs';
    newAttachment.innerHTML = `
        <div class="form-group">
            <label>Attachment Name:</label>
            <input>
        </div>
        <div class="form-group">
            <label>Download Link:</label>
            <input>
        </div>
        <button onclick="removeAttachment(this)" 
                class="remove-attachment danger">
            Remove Attachment
        </button>
    `;
    
    container.appendChild(newAttachment);
}

// Updated addPart function to work with edit forms
function addPart(lessonId = '') {
    const containerId = lessonId ? `parts-container-${lessonId}` : 'partsContainer';
    const container = document.getElementById(containerId);
    
    if (!container) {
        console.error('Parts container not found');
        return;
    }

    const newPart = document.createElement('div');
    newPart.className = 'part-inputs';
    newPart.innerHTML = `
        <div class="form-group">
            <label>Part Name:</label>
            <input>
        </div>
        <div class="form-group">
            <label>YouTube URL:</label>
            <input>
        </div>
        <button onclick="removePart(this)" class="remove-part danger">
            Remove Part
        </button>
    `;
    
    container.appendChild(newPart);
}

// Updated addAttachment function to work with edit forms
function addAttachment(lessonId = '') {
    const containerId = lessonId ? `attachments-container-${lessonId}` : 'attachmentsContainer';
    const container = document.getElementById(containerId);
    
    if (!container) {
        console.error('Attachments container not found');
        return;
    }

    const newAttachment = document.createElement('div');
    newAttachment.className = 'attachment-inputs';
    newAttachment.innerHTML = `
        <div class="form-group">
            <label>Attachment Name:</label>
            <input>
        </div>
        <div class="form-group">
            <label>Download Link:</label>
            <input>
        </div>
        <button onclick="removeAttachment(this)" class="remove-attachment danger">
            Remove Attachment
        </button>
    `;
    
    container.appendChild(newAttachment);
}

// Add this function to handle the "Forget Me" action
function handleForgetMe() {
    // Clear all saved credentials
    localStorage.removeItem('savedCredentials');
    localStorage.removeItem('rememberMe');
    localStorage.removeItem('savedUsername');
    
    // Clear the form fields
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    
    // Uncheck the remember me checkbox
    rememberMeCheckbox.checked = false;
    document.querySelector('.checkmark').style.backgroundColor = '';
    document.querySelector('.checkmark').style.borderColor = '';
    
    // Show confirmation
    showToast('All saved credentials have been removed', false);
    
    // Optional: Set focus back to username field
    document.getElementById('username').focus();
  }
  
  // Add event listener for the button
  forgetMeBtn.addEventListener('click', function(e) {
    e.preventDefault();
    handleForgetMe();
  });
  
  // Modify your existing logout function to also use handleForgetMe
  function logout() {
    sessionStorage.removeItem('loggedIn');
    sessionStorage.removeItem('userRole');
    sessionStorage.removeItem('username');
    handleForgetMe(); // This will clear local storage too
    window.location.href = window.location.href;
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

function addAttachment() {
    const container = document.getElementById('attachmentsContainer');
    const template = container.querySelector('.attachment-inputs');
    
    // Clone the hidden template
    const newAttachment = template.cloneNode(true);
    newAttachment.style.display = 'block';
    
    // Make remove button visible
    const removeBtn = newAttachment.querySelector('.remove-attachment');
    removeBtn.style.display = 'block';
    
    container.appendChild(newAttachment);
}

function addPart() {
    const container = document.getElementById('partsContainer');
    const newPart = document.createElement('div');
    newPart.className = 'part-inputs';
    
    newPart.innerHTML = `
        <div class="form-group">
            <label>Part Name:</label>
            <input>
        </div>
        <div class="form-group">
            <label>YouTube URL:</label>
            <input>
        </div>
        <button onclick="removePart(this)" class="remove-part danger">Remove Part</button>
    `;
    
    container.appendChild(newPart);
}

function removeAttachment(button) {
    const attachmentInputs = button.closest('.attachment-inputs');
    if (attachmentInputs) {
        attachmentInputs.remove();
    }
}

// Update showAddForm to include attachments
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
            
            <div id="attachmentsContainer">
                ${(isEdit && lesson.attachments ? lesson.attachments : [{ name: '', link: '' }]).map((att, i) => `
                    <div class="attachment-inputs">
                        <div class="form-group">
                            <label>Attachment Name:</label>
                            <input value="${att.name}">
                        </div>
                        <div class="form-group">
                            <label>Download Link:</label>
                            <input value="${att.link}">
                        </div>
                        ${(isEdit && lesson.attachments ? lesson.attachments.length > 1 : i > 0) ? `
                            <button onclick="removeAttachment(this)" class="remove-part danger">Remove Attachment</button>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
            
            <div class="actions">
                <button onclick="addPart()">Add Part</button>
                <button onclick="addAttachment()">Add Attachment</button>
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
    const partInputs = button.closest('.part-inputs');
    if (partInputs) {
        partInputs.remove();
    }
}

async function saveLesson(lessonId = null) {
    const language = document.getElementById('languageSelect').value.trim();
    const category = document.getElementById('categorySelect').value.trim();
    const subCategory = document.getElementById('subCategorySelect')?.value.trim() || null;

    if (!language || !category) {
        showToast("Please select a language and category.", true);
        return;
    }

    // Get lesson title
    const titleInput = document.getElementById('editTitle');
    if (!titleInput) {
        showToast("Title input field not found.", true);
        return;
    }

    let title = titleInput.value.trim();
    if (!title) {
        showToast("Please enter a lesson title.", true);
        return;
    }

    // Ensure title formatting
    if (!title.startsWith('📜 ')) title = '📜 ' + title;

    // Collect Parts
    const parts = Array.from(document.querySelectorAll('#partsContainer .part-inputs')).map(div => {
        const inputs = div.querySelectorAll('input');
        let partName = inputs[0].value.trim().replace(/^📖\s*/g, '');
        let youtubeUrl = inputs[1].value.trim().replace(/^🔗\s*/g, '');

        return (partName && youtubeUrl) ? { name: '📖 ' + partName, youtube: '🔗 ' + youtubeUrl } : null;
    }).filter(Boolean); // Remove empty entries

    if (parts.length === 0) {
        showToast("Please add at least one part with a valid name and YouTube URL.", true);
        return;
    }

    // Collect Attachments
    const attachments = Array.from(document.querySelectorAll('#attachmentsContainer .attachment-inputs')).map(div => {
        const inputs = div.querySelectorAll('input');
        let attachmentName = inputs[0].value.trim().replace(/^📎\s*/g, '');
        let downloadLink = inputs[1].value.trim().replace(/^🔗\s*/g, '');

        return (attachmentName && downloadLink) ? { name: '📎 ' + attachmentName, link: downloadLink } : null;
    }).filter(Boolean); // Remove empty entries

    try {
        const lessonData = {
            title,
            parts,
            attachments,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        let lessonRef;

        if (subCategory) {
            // Save in Subcategory
            lessonRef = db.collection(language)
                .doc(category)
                .collection('subCategories')
                .doc(subCategory)
                .collection('lessons');
        } else {
            // Save in Main Category
            lessonRef = db.collection(language)
                .doc(category)
                .collection('lessons');
        }

        if (lessonId) {
            await lessonRef.doc(lessonId).update(lessonData);
            showToast("Lesson updated successfully!");
        } else {
            await lessonRef.add(lessonData);
            showToast("Lesson saved successfully!");
        }

        clearForm(); // Reset form fields
        loadLessons(); // Refresh lesson list
    } catch (error) {
        console.error("Error saving lesson:", error);
        showToast("Error saving lesson. Check the console for details.", true);
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
    const newSubCatInput = document.getElementById('newSubCategory');
    const newSubCat = newSubCatInput.value.trim();
    const language = document.getElementById('languageSelect').value;
    const category = document.getElementById('categorySelect').value;

    // Validation checks
    if (!language) {
        showToast("⚠️ Please select a language first", true);
        newSubCatInput.focus();
        return;
    }

    if (!category) {
        showToast("⚠️ Please select a category first", true);
        newSubCatInput.focus();
        return;
    }

    if (!newSubCat) {
        showToast("📛 Sub-category name cannot be empty!", true);
        newSubCatInput.focus();
        return;
    }

    // Check if sub-category already exists
    if (currentSubCategories.includes(newSubCat)) {
        showToast(`⚠️ "${newSubCat}" already exists as a sub-category`, true);
        newSubCatInput.focus();
        return;
    }

    try {
        // Create subcategory document in Firebase
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
        
        // Clear input and show success message
        newSubCatInput.value = '';
        setTimeout(() => showToast(`✅ "${newSubCat}" created successfully!`), 100);

    } catch (error) {
        console.error('Error creating subcategory:', error);
        showToast("🔥 Error creating sub-category: " + error.message, true);
        newSubCatInput.focus();
    }
}



async function editSubCategory(oldName) {
    const newName = prompt("Enter new name for sub-category:", oldName);
    if (!newName || newName.trim() === '' || newName === oldName) return;

    const language = document.getElementById('languageSelect').value;
    const category = document.getElementById('categorySelect').value;
    if (!language || !category) {
        showToast("Please select language and category first.", true);
        return;
    }

    try {
        // Get reference to the sub-category
        const subCatRef = db.collection(language)
            .doc(category)
            .collection('subCategories')
            .doc(oldName);

        // Update the document name and the name field
        const batch = db.batch();
        
        // 1. Create new document with updated name and data
        const newSubCatRef = db.collection(language)
            .doc(category)
            .collection('subCategories')
            .doc(newName);
        
        const subCatData = (await subCatRef.get()).data();
        batch.set(newSubCatRef, {
            ...subCatData,
            name: newName  // Update the name field
        });

        // 2. Move all lessons to new sub-category
        const lessonsSnapshot = await subCatRef.collection('lessons').get();
        lessonsSnapshot.docs.forEach(doc => {
            const newLessonRef = newSubCatRef.collection('lessons').doc(doc.id);
            batch.set(newLessonRef, doc.data());
        });

        // 3. Delete old sub-category
        batch.delete(subCatRef);

        await batch.commit();

        // Update local state
        const index = currentSubCategories.indexOf(oldName);
        if (index !== -1) {
            currentSubCategories[index] = newName;
            updateSubCategorySelect();
            renderSubCategoryList();
            showToast('Sub-category updated successfully!');
        }
    } catch (error) {
        console.error("Error updating sub-category:", error);
        showToast("Error updating sub-category. Please check console.", true);
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

document.getElementById('subCategorySelect').addEventListener('change', function() {
    if (this.value === 'manage') {
        addSubCategory();
        this.value = ''; // Reset the selection
    }
});

// In admin.js
async function sendNotification() {
    const title = document.getElementById('notificationTitle').value.trim();
    const body = document.getElementById('notificationBody').value.trim();
    const link = document.getElementById('notificationLink').value.trim();
    
    if (!title || !body) {
      showToast('Please fill both fields', true);
      return;
    }
  
    try {
      // Clear existing notifications
      const snapshot = await db.collection('notifications').get();
      const batch = db.batch();
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
  
      // Add new notification
      await db.collection('notifications').add({
        title,
        body,
        link,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        shown: false
    });
      
    showToast('Notification sent!');
    // Clear form but keep it visible
    document.getElementById('notificationTitle').value = '';
    document.getElementById('notificationBody').value = '';
    document.getElementById('notificationLink').value = '';
    
    // Don't hide the form after sending
    // sessionStorage.setItem('notificationFormVisible', 'true');
} catch (error) {
    console.error('Error sending notification:', error);
    showToast('Error sending notification', true);
}
  }
  
  async function clearNotifications() {
    if (!confirm('Clear all notifications?')) return;
    
    const snapshot = await db.collection('notifications').get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    showToast('All notifications cleared');
  }
  
  // Load current notification
  db.collection('notifications')
    .orderBy('timestamp', 'desc')
    .limit(1)
    .onSnapshot(snapshot => {
      const container = document.getElementById('activeNotification');
      if (snapshot.empty) {
        container.innerHTML = '<p>No active notifications</p>';
        return;
      }
      
      const notification = snapshot.docs[0].data();
      container.innerHTML = `
    <h4>${notification.title}</h4>
    <p>${notification.body}</p>
    ${notification.link ? `<a href="${notification.link}" target="_blank" class="notification-link">${notification.link}</a>` : ''}
    <small>Posted: ${new Date(notification.timestamp?.toDate()).toLocaleString()}</small>
`;
    });

    function loadNotificationsTab() {
        // Listen to changes in notifications from Firestore
        db.collection('notifications')
            .orderBy('timestamp', 'desc')
            .onSnapshot(snapshot => {
                const container = document.getElementById('activeNotification');
                
                // Check if there are no notifications
                if (snapshot.empty) {
                    container.innerHTML = `
                        <div class="notification-placeholder">
                            <p>No active notifications</p>
                        </div>
                    `;
                    return;
                }
                
                // Display the first notification
                const notification = snapshot.docs[0].data();
                container.innerHTML = `
                    <div class="notification-content">
                        <h4>${notification.title}</h4>
                        <p>${notification.body}</p>
                        ${notification.link ? `
                            <a href="${notification.link}" class="notification-link">
                                ${notification.link}
                            </a>
                        ` : ''}
                        <small>Posted: ${new Date(notification.timestamp?.toDate()).toLocaleString()}</small>
                    </div>
                `;
            });
    }
    

async function deleteNotification(id) {
    if(confirm('Are you sure you want to delete this notification?')) {
        await db.collection('notifications').doc(id).delete();
    }
}

switchTab(1);
