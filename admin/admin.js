// admin/admin.js

document.addEventListener('DOMContentLoaded', () => {
    
    // --- GLOBAL STATE & CONFIG ---
    const appState = {
        currentView: 'lessons',
        currentLanguage: 'Sinhala',
        lessons: [],
        subcategories: []
    };

    const firebaseConfig = { projectId: "quranic-wisdom" };
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    const languageTranslations = {
        'Sinhala': 'සිංහල',
        'Tamil': 'தமிழ்',
        'English': 'English'
    };
    const categoryTranslations = {
        'Courses': 'Courses', 'Surah': 'Surah', 'Tafsir': 'Tafsir', 'Arabic': 'Arabic'
    };

    // --- DOM ELEMENT SELECTORS ---
    const DOMElements = {
        mainContent: document.getElementById('main-content'),
        loginPage: document.getElementById('login-page'),
        usernameDisplay: document.getElementById('username-display'),
        navLinks: document.querySelectorAll('.nav-link'),
        views: document.querySelectorAll('.view'),
        lessons: {
            view: document.getElementById('view-lessons'),
            title: document.getElementById('lessons-view-title'),
            list: document.getElementById('lessons-list'),
            addNewBtn: document.getElementById('add-new-lesson-btn'),
            filterCategory: document.getElementById('filter-category'),
            search: document.getElementById('search-lessons'),
            filterNewOnly: document.getElementById('filter-new-only'),
        },
        subcategories: {
            view: document.getElementById('view-subcategories'),
            langSelect: document.getElementById('subcat-lang-select'),
            catSelect: document.getElementById('subcat-cat-select'),
            list: document.getElementById('subcategories-list'),
            addBtn: document.getElementById('add-subcategory-btn'),
            newNameInput: document.getElementById('new-subcategory-name')
        },
        notifications: {
            view: document.getElementById('view-notifications'),
            titleInput: document.getElementById('notification-title'),
            bodyInput: document.getElementById('notification-body'),
            linkInput: document.getElementById('notification-link'),
            sendBtn: document.getElementById('send-notification-btn'),
            clearBtn: document.getElementById('clear-notifications-btn'),
            activeContainer: document.getElementById('active-notification'),
        },
        lessonModal: {
            modal: document.getElementById('lesson-modal'),
            form: document.getElementById('lesson-form'),
            title: document.getElementById('lesson-modal-title'),
            closeBtn: document.getElementById('close-lesson-modal'),
            cancelBtn: document.getElementById('cancel-lesson-save'),
            lessonId: document.getElementById('lesson-id'),
            isSubcategory: document.getElementById('is-subcategory-lesson'),
            languageSelect: document.getElementById('lesson-language'),
            categorySelect: document.getElementById('lesson-category'),
            subcategorySelect: document.getElementById('lesson-subcategory'),
            titleInput: document.getElementById('lesson-title'),
            partsContainer: document.getElementById('lesson-parts-container'),
            attachmentsContainer: document.getElementById('lesson-attachments-container'),
            addPartBtn: document.getElementById('add-part-btn'),
            addAttachmentBtn: document.getElementById('add-attachment-btn'),
        },
        logoutBtn: document.getElementById('logout-btn'),
    };

    // --- UTILITY FUNCTIONS ---
    const showToast = (message, type = 'success') => {
    // Find the container we created in the HTML
    const container = document.getElementById('toast-container');
    if (!container) return; // Exit if the container doesn't exist

    // Create the new toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`; // e.g., "toast success"
    toast.textContent = message;

    // Add the new toast to our container
    container.appendChild(toast);

    // Remove the toast after 3 seconds
    setTimeout(() => {
        toast.remove();
    }, 3000);
};

    const isLessonNew = (createdAt) => {
        if (!createdAt) return false;
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return createdAt > oneWeekAgo;
    };
    
    const extractLessonNumber = (title) => {
        const match = title.match(/\d+/);
        return match ? parseInt(match[0], 10) : Infinity;
    };


    // --- UI RENDERING FUNCTIONS ---
    const navigateTo = (viewId, language = null) => {
        appState.currentView = viewId;
        if (language) {
            appState.currentLanguage = language;
        }

        DOMElements.views.forEach(view => view.classList.remove('active'));
        document.getElementById(`view-${viewId}`).classList.add('active');

        DOMElements.navLinks.forEach(link => {
            const linkView = link.getAttribute('href').substring(1);
            const linkLang = link.dataset.lang;
            const isActive = (linkView === viewId) && (!linkLang || linkLang === appState.currentLanguage);
            link.classList.toggle('active', isActive);
        });

        // Load data for the new view
        switch (viewId) {
            case 'lessons':
                DOMElements.lessons.title.textContent = `${appState.currentLanguage} Lessons`;
                fetchAndRenderLessons();
                break;
            case 'subcategories':
                fetchAndRenderSubcategories();
                break;
            case 'notifications':
                // Handled by Firestore listener
                break;
        }
    };
    
    const createLessonCard = (lesson) => {
        const card = document.createElement('div');
        card.className = 'lesson-card';
        card.dataset.id = lesson.id;
        card.dataset.title = lesson.title.toLowerCase();
        card.dataset.category = lesson.category;
        
        const isNew = isLessonNew(lesson.createdAt?.toDate());
        if(isNew) card.dataset.new = 'true';

        const subCatText = lesson.isSubcategory ? ` / ${lesson.subCategory}` : '';

        card.innerHTML = `
            ${isNew ? '<span class="new-badge">NEW</span>' : ''}
            <div class="lesson-card-header">
                <h3>${lesson.title}</h3>
                <p class="lesson-card-meta">${categoryTranslations[lesson.category]}${subCatText}</p>
            </div>
            <div class="lesson-card-body">
                ${lesson.parts.map(p => `<p class="lesson-part"><i class="fa-brands fa-youtube"></i> ${p.name.replace(/^📖\s*/, '')}</p>`).join('')}
                ${(lesson.attachments && lesson.attachments.length > 0) ? `<hr><p><i class="fa-solid fa-paperclip"></i> ${lesson.attachments.length} attachment(s)</p>` : ''}
            </div>
            <div class="lesson-card-footer">
                <button class="btn btn-secondary btn-small btn-edit"><i class="fa-solid fa-pencil"></i> Edit</button>
                <button class="btn btn-danger btn-small btn-delete"><i class="fa-solid fa-trash"></i> Delete</button>
            </div>
        `;

        card.querySelector('.btn-edit').addEventListener('click', () => openLessonModal(lesson));
        card.querySelector('.btn-delete').addEventListener('click', () => deleteLesson(lesson));

        return card;
    };

    const renderLessons = () => {
        DOMElements.lessons.list.innerHTML = '';
        const searchTerm = DOMElements.lessons.search.value.toLowerCase();
        const categoryFilter = DOMElements.lessons.filterCategory.value;
        const newOnlyFilter = DOMElements.lessons.filterNewOnly.checked;

        const filteredLessons = appState.lessons.filter(lesson => {
            const matchesSearch = lesson.title.toLowerCase().includes(searchTerm);
            const matchesCategory = !categoryFilter || lesson.category === categoryFilter;
            const isNew = isLessonNew(lesson.createdAt?.toDate());
            const matchesNew = !newOnlyFilter || isNew;
            return matchesSearch && matchesCategory && matchesNew;
        });
        
        if (filteredLessons.length === 0) {
            DOMElements.lessons.list.innerHTML = '<p>No lessons found matching your criteria.</p>';
        } else {
             filteredLessons.forEach(lesson => {
                DOMElements.lessons.list.appendChild(createLessonCard(lesson));
            });
        }
    };
    
    const renderSubcategories = () => {
        DOMElements.subcategories.list.innerHTML = '';
        if (appState.subcategories.length === 0) {
            DOMElements.subcategories.list.innerHTML = '<p>No subcategories found for this selection.</p>';
        } else {
            appState.subcategories.forEach(sub => {
                const item = document.createElement('div');
                item.className = 'item';
                item.innerHTML = `
                    <span><strong>${sub.name}</strong> (${sub.lessonCount || 0} lessons)</span>
                    <div class="actions">
                         <button class="btn btn-danger btn-small btn-delete-subcat" data-name="${sub.name}"><i class="fa-solid fa-trash"></i> Delete</button>
                    </div>
                `;
                item.querySelector('.btn-delete-subcat').addEventListener('click', () => deleteSubcategory(sub.name));
                DOMElements.subcategories.list.appendChild(item);
            });
        }
    };

    // --- FIREBASE FUNCTIONS ---
    const fetchAndRenderLessons = async () => {
        try {
            const categories = ['Courses', 'Surah', 'Arabic', 'Tafsir'];
            let allLessons = [];
            
            for (const category of categories) {
                // Main category lessons
                const mainLessonsSnapshot = await db.collection(appState.currentLanguage).doc(category).collection('lessons').get();
                mainLessonsSnapshot.forEach(doc => {
                    allLessons.push({ id: doc.id, ...doc.data(), language: appState.currentLanguage, category, isSubcategory: false });
                });

                // Subcategory lessons
                const subCategoriesSnapshot = await db.collection(appState.currentLanguage).doc(category).collection('subCategories').get();
                for (const subCatDoc of subCategoriesSnapshot.docs) {
                    const subLessonsSnapshot = await subCatDoc.ref.collection('lessons').get();
                    subLessonsSnapshot.forEach(doc => {
                        allLessons.push({ id: doc.id, ...doc.data(), language: appState.currentLanguage, category, subCategory: subCatDoc.id, isSubcategory: true });
                    });
                }
            }
            
            allLessons.sort((a, b) => extractLessonNumber(a.title) - extractLessonNumber(b.title));
            appState.lessons = allLessons;
            renderLessons();
        } catch (error) {
            console.error("Error fetching lessons:", error);
            showToast('Failed to load lessons.', 'error');
        }
    };
    
    const deleteLesson = async (lesson) => {
        if (!confirm(`Are you sure you want to delete "${lesson.title}"?`)) return;

        try {
            let lessonRef;
            if (lesson.isSubcategory) {
                lessonRef = db.collection(lesson.language).doc(lesson.category).collection('subCategories').doc(lesson.subCategory).collection('lessons').doc(lesson.id);
            } else {
                lessonRef = db.collection(lesson.language).doc(lesson.category).collection('lessons').doc(lesson.id);
            }
            await lessonRef.delete();
            showToast('Lesson deleted successfully.');
            fetchAndRenderLessons(); // Refresh list
        } catch (error) {
            console.error('Error deleting lesson:', error);
            showToast('Failed to delete lesson.', 'error');
        }
    };
    
    const fetchAndRenderSubcategories = async () => {
        const lang = DOMElements.subcategories.langSelect.value;
        const cat = DOMElements.subcategories.catSelect.value;
        try {
            const snapshot = await db.collection(lang).doc(cat).collection('subCategories').orderBy('createdAt').get();
            appState.subcategories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderSubcategories();
        } catch (error) {
            console.error('Error fetching subcategories:', error);
            showToast('Failed to load subcategories.', 'error');
        }
    };
    
    const addSubcategory = async () => {
        const lang = DOMElements.subcategories.langSelect.value;
        const cat = DOMElements.subcategories.catSelect.value;
        const name = DOMElements.subcategories.newNameInput.value.trim();

        if (!name) {
            showToast('Subcategory name cannot be empty.', 'error');
            return;
        }

        try {
            const subcatRef = db.collection(lang).doc(cat).collection('subCategories').doc(name);
            await subcatRef.set({
                name: name,
                lessonCount: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            DOMElements.subcategories.newNameInput.value = '';
            showToast(`Subcategory "${name}" added.`);
            fetchAndRenderSubcategories();
        } catch (error) {
            console.error('Error adding subcategory:', error);
            showToast('Failed to add subcategory.', 'error');
        }
    };

    const deleteSubcategory = async (name) => {
        if (!confirm(`This will delete the subcategory "${name}" and ALL lessons inside it. This action cannot be undone. Are you sure?`)) return;
        
        const lang = DOMElements.subcategories.langSelect.value;
        const cat = DOMElements.subcategories.catSelect.value;

        try {
            const subcatRef = db.collection(lang).doc(cat).collection('subCategories').doc(name);
            // In a real-world scenario with many lessons, you'd use a Cloud Function to delete subcollections.
            // For now, we assume the lesson count is small.
            await subcatRef.delete();
            showToast(`Subcategory "${name}" deleted.`);
            fetchAndRenderSubcategories();
        } catch (error) {
            console.error('Error deleting subcategory:', error);
            showToast('Failed to delete subcategory. You may need to delete its lessons first.', 'error');
        }
    };

    // --- LESSON MODAL ---
    const openLessonModal = async (lesson = null) => {
        const modal = DOMElements.lessonModal;
        modal.form.reset();
        modal.partsContainer.innerHTML = '';
        modal.attachmentsContainer.innerHTML = '';
        
        // Populate static dropdowns
        populateDropdown(modal.languageSelect, languageTranslations);
        populateDropdown(modal.categorySelect, categoryTranslations);
        
        if (lesson) { // EDIT MODE
            modal.title.textContent = 'Edit Lesson';
            modal.lessonId.value = lesson.id;
            modal.isSubcategory.value = lesson.isSubcategory;
            modal.titleInput.value = lesson.title.replace(/^📜\s*/, '');
            modal.languageSelect.value = lesson.language;
            modal.categorySelect.value = lesson.category;
            
            await updateSubcategoryDropdown(lesson.language, lesson.category);
            modal.subcategorySelect.value = lesson.subCategory || '';
            
            lesson.parts.forEach(part => addDynamicField('part', part));
            (lesson.attachments || []).forEach(att => addDynamicField('attachment', att));

        } else { // ADD MODE
            modal.title.textContent = 'Add New Lesson';
            modal.lessonId.value = '';
            modal.isSubcategory.value = 'false';
            modal.languageSelect.value = appState.currentLanguage;
            await updateSubcategoryDropdown(appState.currentLanguage, modal.categorySelect.value);
            addDynamicField('part'); // Add one empty part field
        }
        
        modal.modal.classList.add('show');
    };

    const closeLessonModal = () => DOMElements.lessonModal.modal.classList.remove('show');
    
    const populateDropdown = (selectElement, options) => {
        selectElement.innerHTML = '';
        for (const [value, text] of Object.entries(options)) {
            selectElement.add(new Option(text, value));
        }
    };

    const updateSubcategoryDropdown = async (lang, cat) => {
        const select = DOMElements.lessonModal.subcategorySelect;
        select.innerHTML = '<option value="">None (Main Category)</option>';
        if (lang && cat) {
            try {
                const snapshot = await db.collection(lang).doc(cat).collection('subCategories').get();
                snapshot.docs.forEach(doc => {
                    select.add(new Option(doc.id, doc.id));
                });
            } catch (e) { console.error("Could not fetch subcategories for dropdown", e); }
        }
    };

    const addDynamicField = (type, data = {}) => {
        const container = type === 'part' ? DOMElements.lessonModal.partsContainer : DOMElements.lessonModal.attachmentsContainer;
        const group = document.createElement('div');
        group.className = 'dynamic-item-group';
        
        if (type === 'part') {
            group.innerHTML = `
                <button type="button" class="remove-item-btn">&times;</button>
                <div class="form-group-row">
                    <div class="form-group"><input type="text" class="part-name" placeholder="Part Name" value="${data.name ? data.name.replace(/^📖\s*/, '') : ''}"></div>
                    <div class="form-group"><input type="url" class="part-youtube" placeholder="YouTube URL" value="${data.youtube ? data.youtube.replace(/^🔗\s*/, '') : ''}"></div>
                </div>
            `;
        } else {
            group.innerHTML = `
                <button type="button" class="remove-item-btn">&times;</button>
                <div class="form-group-row">
                    <div class="form-group"><input type="text" class="attachment-name" placeholder="Attachment Name" value="${data.name ? data.name.replace(/^📎\s*/, '') : ''}"></div>
                    <div class="form-group"><input type="url" class="attachment-link" placeholder="Download Link" value="${data.link || ''}"></div>
                </div>
            `;
        }
        
        group.querySelector('.remove-item-btn').addEventListener('click', () => group.remove());
        container.appendChild(group);
    };

    const saveLesson = async (e) => {
        e.preventDefault();
        const modal = DOMElements.lessonModal;
        const lessonId = modal.lessonId.value;
        const lang = modal.languageSelect.value;
        const cat = modal.categorySelect.value;
        const subCat = modal.subcategorySelect.value;
        let title = modal.titleInput.value.trim();

        if (!title || !lang || !cat) {
            showToast('Title, Language, and Category are required.', 'error');
            return;
        }
        if (!title.startsWith('📜 ')) title = '📜 ' + title;

        const parts = [...modal.partsContainer.querySelectorAll('.dynamic-item-group')].map(group => {
            const name = group.querySelector('.part-name').value.trim();
            const youtube = group.querySelector('.part-youtube').value.trim();
            if (name && youtube) {
                return { name: `📖 ${name}`, youtube: `🔗 ${youtube}` };
            }
            return null;
        }).filter(Boolean);

        if (parts.length === 0) {
            showToast('At least one valid lesson part is required.', 'error');
            return;
        }

        const attachments = [...modal.attachmentsContainer.querySelectorAll('.dynamic-item-group')].map(group => {
            const name = group.querySelector('.attachment-name').value.trim();
            const link = group.querySelector('.attachment-link').value.trim();
            if (name && link) {
                return { name: `📎 ${name}`, link: link };
            }
            return null;
        }).filter(Boolean);

        const lessonData = {
            title,
            parts,
            attachments,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            let lessonRef;
            if (subCat) { // Saving to a subcategory
                lessonRef = db.collection(lang).doc(cat).collection('subCategories').doc(subCat).collection('lessons');
            } else { // Saving to a main category
                lessonRef = db.collection(lang).doc(cat).collection('lessons');
            }

            if (lessonId) { // Update existing
                await lessonRef.doc(lessonId).update(lessonData);
                showToast('Lesson updated successfully.');
            } else { // Add new
                lessonData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await lessonRef.add(lessonData);
                showToast('Lesson added successfully.');
            }
            closeLessonModal();
            fetchAndRenderLessons();
        } catch (error) {
            console.error('Error saving lesson:', error);
            showToast('Failed to save lesson.', 'error');
        }
    };

    // --- NOTIFICATIONS ---
    const sendNotification = async () => {
        const title = DOMElements.notifications.titleInput.value.trim();
        const body = DOMElements.notifications.bodyInput.value.trim();
        const link = DOMElements.notifications.linkInput.value.trim();

        if (!title || !body) {
            showToast('Title and Message are required.', 'error');
            return;
        }
        
        try {
            // Clear existing notifications first
            const snapshot = await db.collection('notifications').get();
            const batch = db.batch();
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();

            // Add new one
            await db.collection('notifications').add({
                title, body, link,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            showToast('Notification sent.');
            DOMElements.notifications.titleInput.value = '';
            DOMElements.notifications.bodyInput.value = '';
            DOMElements.notifications.linkInput.value = '';
        } catch (error) {
            console.error('Error sending notification:', error);
            showToast('Failed to send notification.', 'error');
        }
    };
    
    const clearNotifications = async () => {
        if (!confirm('Are you sure you want to clear the active notification?')) return;
        try {
            const snapshot = await db.collection('notifications').get();
            const batch = db.batch();
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            showToast('Notification cleared.');
        } catch (error) {
            console.error('Error clearing notifications:', error);
            showToast('Failed to clear notification.', 'error');
        }
    };

    const listenForNotifications = () => {
        db.collection('notifications').orderBy('timestamp', 'desc').limit(1)
            .onSnapshot(snapshot => {
                const container = DOMElements.notifications.activeContainer;
                if (snapshot.empty) {
                    container.innerHTML = '<p class="placeholder">No active notifications.</p>';
                    return;
                }
                const notification = snapshot.docs[0].data();
                container.innerHTML = `
                    <h4>${notification.title}</h4>
                    <p>${notification.body}</p>
                    ${notification.link ? `<p><a href="${notification.link}" target="_blank">${notification.link}</a></p>` : ''}
                    <small>Posted: ${new Date(notification.timestamp?.toDate()).toLocaleString()}</small>
                `;
            });
    };

    // --- EVENT LISTENERS ---
    const setupEventListeners = () => {
        // Navigation
        DOMElements.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const viewId = link.getAttribute('href').substring(1);
                const lang = link.dataset.lang || null;
                navigateTo(viewId, lang);
            });
        });

        // Lesson View
        [DOMElements.lessons.search, DOMElements.lessons.filterCategory, DOMElements.lessons.filterNewOnly].forEach(el => {
            el.addEventListener('input', renderLessons);
        });
        DOMElements.lessons.addNewBtn.addEventListener('click', () => openLessonModal());

        // Subcategories View
        DOMElements.subcategories.addBtn.addEventListener('click', addSubcategory);
        [DOMElements.subcategories.langSelect, DOMElements.subcategories.catSelect].forEach(el => {
            el.addEventListener('change', fetchAndRenderSubcategories);
        });

        // Notifications View
        DOMElements.notifications.sendBtn.addEventListener('click', sendNotification);
        DOMElements.notifications.clearBtn.addEventListener('click', clearNotifications);

        // Lesson Modal
        DOMElements.lessonModal.form.addEventListener('submit', saveLesson);
        DOMElements.lessonModal.closeBtn.addEventListener('click', closeLessonModal);
        DOMElements.lessonModal.cancelBtn.addEventListener('click', closeLessonModal);
        DOMElements.lessonModal.addPartBtn.addEventListener('click', () => addDynamicField('part'));
        DOMElements.lessonModal.addAttachmentBtn.addEventListener('click', () => addDynamicField('attachment'));
        DOMElements.lessonModal.languageSelect.addEventListener('change', (e) => {
             updateSubcategoryDropdown(e.target.value, DOMElements.lessonModal.categorySelect.value);
        });
        DOMElements.lessonModal.categorySelect.addEventListener('change', (e) => {
             updateSubcategoryDropdown(DOMElements.lessonModal.languageSelect.value, e.target.value);
        });
        
        // Logout
        DOMElements.logoutBtn.addEventListener('click', () => {
             sessionStorage.clear();
             window.location.reload();
        });
    };

    // --- INITIALIZATION ---
    const init = () => {
        if (sessionStorage.getItem('loggedIn') === 'true') {
            DOMElements.loginPage.style.display = 'none';
            DOMElements.mainContent.style.display = 'flex';
            DOMElements.usernameDisplay.textContent = 'Hello, ' + sessionStorage.getItem('username');
            
            setupEventListeners();
            listenForNotifications();
            navigateTo('lessons', 'Sinhala'); // Start on the Sinhala lessons page
        } else {
            DOMElements.loginPage.style.display = 'flex';
            DOMElements.mainContent.style.display = 'none';
        }
    };
    
    init();
});