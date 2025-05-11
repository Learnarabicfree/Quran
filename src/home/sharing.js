function updateNavigation() {
    const parts = [];
    if (currentState.language) parts.push(currentState.language);
    if (currentState.category) parts.push(currentState.category);
    if (currentState.subcategory) parts.push(currentState.subcategory);
    
    const newHash = parts.length ? `#${parts.join('/')}` : '';
    history.pushState({}, document.title, newHash);
    saveState();
}

function parseHash() {
    try {
        const hash = window.location.hash.substring(1);
        if (!hash) return;

        // Split and decode components
        const parts = hash.split('/').map(part => {
            try {
                return decodeURIComponent(part);
            } catch (e) {
                return part;
            }
        });

        // Find matching language (case insensitive)
        const languageMatch = Object.keys(languageTranslations).find(
            lang => lang.toLowerCase() === parts[0]?.toLowerCase()
        );

        if (languageMatch) {
            currentState.language = languageMatch;
            currentState.category = parts[1] || null;
            currentState.subcategory = parts[2] || null;
            loadContentBasedOnState();
        }
    } catch (error) {
        console.error("Error parsing hash:", error);
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

function handleShare(platform) {
    try {
        const currentLang = currentState.language || 'English';
        const langMessages = shareMessages[currentLang] || shareMessages['English'];
        
        // Build clean URL components
        const cleanParts = [];
        if (currentState.language) cleanParts.push(currentState.language);
        if (currentState.category) cleanParts.push(currentState.category);
        if (currentState.subcategory) cleanParts.push(currentState.subcategory);
        
        const cleanHash = cleanParts.length ? `#${cleanParts.join('/')}` : '';
        const cleanUrl = `${window.location.origin}${window.location.pathname}${cleanHash}`;

        // Create encoded version for proper URL handling
        const encodedUrl = encodeURI(cleanUrl);

        switch(platform) {
            case 'whatsapp':
                window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(langMessages.message + cleanUrl)}`);
                break;
            case 'facebook':
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`);
                break;
            case 'twitter':
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(langMessages.message)}&url=${encodedUrl}`);
                break;
            case 'email':
                const englishMessages = shareMessages['English'];
                const mailtoLink = `mailto:?subject=${encodeMailtoText(englishMessages.subject)}&body=${encodeMailtoText(englishMessages.message + '\n\n' + cleanUrl)}`;
                const mailWindow = window.open(mailtoLink, '_blank');
                if (!mailWindow) {
                    showToast("Please allow popups for email sharing", true);
                }
                break;
            case 'copy':
                copyToClipboard(cleanUrl);
                showToast(langMessages.copied);
                break;
        }
        
        document.querySelector('.share-menu').classList.remove('active');
    } catch (error) {
        console.error("Sharing error:", error);
        showToast("Error while sharing. Please try again.", true);
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