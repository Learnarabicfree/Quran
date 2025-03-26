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

const forgetMeBtn = document.getElementById('forgetMeBtn');

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
    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'error' : ''}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 500);
    }, 3000);
  }

// Tab switching function
function switchTab(tabNumber) {
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

function extractLessonNumber(title) {
    const match = title.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
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

  function extractLessonNumber(title) {
    const match = title.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
}

switchTab(1);
