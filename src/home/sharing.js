function updateNavigation() {
    const parts = [];
    if (currentState.language) parts.push(currentState.language);
    if (currentState.category) parts.push(formatUrlPart(currentState.category));
    if (currentState.subcategory) parts.push(formatUrlPart(currentState.subcategory));
    
    const newHash = parts.length ? `#${parts.join('/')}` : '';
    history.pushState({}, document.title, newHash);
    saveState();
}

function parseHash() {
    const hash = window.location.hash.substring(1);
    if (!hash) return;

    // Split and decode components
    const parts = hash.split('/').map(part => {
        try {
            return decodeURIComponent(part).replace(/-/g, ' ');
        } catch (e) {
            return part.replace(/-/g, ' ');
        }
    });

    // Find matching language
    const languageMatch = Object.keys(languageTranslations).find(
        lang => lang.toLowerCase() === parts[0]?.toLowerCase()
    );

    if (languageMatch) {
        currentState.language = languageMatch;
        currentState.category = parts[1] || null;
        currentState.subcategory = parts[2] || null;
        loadContentBasedOnState();
    }
}

function loadContentBasedOnState() {
    if (!currentState.language) return;
    
    // Load categories if we have a language but no category
    if (!currentState.category) {
        populateCategories();
    } 
    // Load subcategories if we have a category but no subcategory
    else if (!currentState.subcategory) {
        const categoryData = appData[currentState.language]?.[currentState.category];
        if (categoryData?.subCategories?.length > 0) {
            populateSubCategories(currentState.category);
        } else {
            loadLessons();
        }
    } 
    // Load lessons if we have all three
    else {
        loadLessons();
    }
    updateUI();
}

function safeEncodeURIComponent(str) {
    // First try to decode it (in case it's already encoded)
    try {
        const decoded = decodeURIComponent(str);
        // If decoding worked and gives same result, no need to encode
        if (decoded === str) return encodeURIComponent(str);
        return str; // It was already encoded
    } catch (e) {
        // Wasn't encoded, so encode it
        return encodeURIComponent(str);
    }
}

async function handleShare(platform) {
    try {
        const currentLang = currentState.language || 'English';
        const langMessages = shareMessages[currentLang] || shareMessages['English'];
        
        // Build URL parts with hyphens
        const urlParts = [];
        if (currentState.language) urlParts.push(currentState.language);
        if (currentState.category) urlParts.push(formatUrlPart(currentState.category));
        if (currentState.subcategory) urlParts.push(formatUrlPart(currentState.subcategory));
        
        const cleanHash = urlParts.length ? `#${urlParts.join('/')}` : '';
        const cleanUrl = `${window.location.origin}${window.location.pathname}${cleanHash}`;

        // Get the title based on current state
        let contentTitle = '';
        if (currentState.subcategory) {
            contentTitle = await getContentTitle(currentState.language, currentState.category, currentState.subcategory);
        } else if (currentState.category) {
            contentTitle = currentState.category;
        }

        // Create enhanced message with title
        let enhancedMessage = langMessages.message;
        if (contentTitle) {
            enhancedMessage = `📖 ${contentTitle}\n\n${enhancedMessage}`;
        }

        switch(platform) {
            case 'whatsapp':
                window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(enhancedMessage + cleanUrl)}`);
                break;
            case 'facebook':
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURI(cleanUrl)}&quote=${encodeURIComponent(enhancedMessage)}`);
                break;
            case 'twitter':
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(enhancedMessage)}&url=${encodeURI(cleanUrl)}`);
                break;
            case 'email':
                const englishMessages = shareMessages['English'];
                let englishEnhancedMessage = englishMessages.message;
                if (contentTitle) {
                    englishEnhancedMessage = `📖 ${contentTitle}\n\n${englishEnhancedMessage}`;
                }
                const mailtoLink = `mailto:?subject=${encodeMailtoText(contentTitle || englishMessages.subject)}&body=${encodeMailtoText(englishEnhancedMessage + '\n\n' + cleanUrl)}`;
                const mailWindow = window.open(mailtoLink, '_blank');
                if (!mailWindow) {
                    showToast("Please allow popups for email sharing", true);
                }
                break;
            case 'copy':
                copyToClipboard(`${enhancedMessage}\n\n${cleanUrl}`);
                showToast(langMessages.copied);
                break;
        }
        
        document.querySelector('.share-menu').classList.remove('active');
    } catch (error) {
        console.error("Sharing error:", error);
        showToast("Error while sharing. Please try again.", true);
    }
}

async function getContentTitle(language, category, subcategory) {
    try {
        if (!subcategory) return category;
        
        // Try to fetch from Firestore
        const docRef = db.collection(language)
            .doc(category)
            .collection('subCategories')
            .doc(subcategory);
        
        const doc = await docRef.get();
        if (doc.exists) {
            return doc.data().name || subcategory;
        }
        
        // Fallback to the subcategory ID with hyphens replaced by spaces
        return subcategory.replace(/-/g, ' ');
    } catch (error) {
        console.error("Error fetching title:", error);
        return subcategory.replace(/-/g, ' ');
    }
}


function cleanUrlComponent(component) {
    if (!component) return null;
    
    // First try to decode (in case it's encoded)
    try {
        component = decodeURIComponent(component);
    } catch (e) {
        // Wasn't encoded, use as-is
    }
    
    // Replace any remaining encoded spaces with normal spaces
    return component.replace(/%20/g, ' ');
}

function cleanUrlPart(part) {
    // Replace only spaces and special characters that might break URLs
    return part.replace(/\s+/g, '-')
               .replace(/[^a-zA-Z0-9-]/g, '')
               .toLowerCase();
}

function encodeMailtoText(text) {
    // First convert to UTF-8 bytes, then percent-encode
    return encodeURIComponent(text)
        .replace(/'/g, '%27')
        .replace(/\(/g, '%28')
        .replace(/\)/g, '%29');
}

function formatUrlPart(part) {
    return part.replace(/\s+/g, '-');
}
