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