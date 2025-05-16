function renderLessons(lessons) {
    const container = document.getElementById("lessons-container");
    container.innerHTML = lessons.map(lesson => {
        const isNew = isLessonNew(lesson.createdAt?.toDate());
        const isWatched = getWatchedLessons()[lesson.title];

        return `
        <div class="lesson-card ${isWatched ? 'watched' : ''}" data-title="${lesson.title}">
            ${isWatched ? `
                <div class="watched-marker">
                    <i class="fas fa-check"></i> Watched
                </div>
            ` : ''}
            <h3>${lesson.title}</h3>
            ${isNew ? '<span class="new-lesson-badge">✨New Lesson</span>' : ''}
            <small class="search-meta">
                ${languageTranslations[currentState.language]} /
                ${categoryTranslations[currentState.language][currentState.category]}
                ${currentState.subcategory ? ` / ${currentState.subcategory}` : ''}
            </small>

            <div class="lesson-parts-container">
                <div class="hidden-parts" style="display: none;">
                    ${lesson.parts.map((part) => renderLessonPart(part, lesson.title)).join("")}
                </div>
                <button class="toggle-parts-button" data-lesson-id="${lesson.id}">
                    <i class="fas fa-chevron-down"></i> Show Parts (${lesson.parts.length})
                </button>
            </div>

            ${lesson.attachments && lesson.attachments.length > 0 ? `
                <div class="lesson-attachments">
                    <h4>Downloads</h4>
                    ${lesson.attachments.map(att => `
                        <div class="attachment">
                            <a href="#" class="download-button" data-url="${att.link}">
                                ${att.name} <i class="fas fa-download"></i>
                            </a>
                        </div>
                    `).join("")}
                </div>
            ` : ''}
        </div>
        `;
    }).join("");

    // Toggle all parts
    document.querySelectorAll('.toggle-parts-button').forEach(button => {
        button.addEventListener('click', function () {
            const hiddenParts = this.previousElementSibling;
            const isHidden = hiddenParts.style.display === 'none';
            hiddenParts.style.display = isHidden ? 'block' : 'none';
            this.innerHTML = isHidden
                ? `<i class="fas fa-chevron-up"></i> Hide Parts`
                : `<i class="fas fa-chevron-down"></i> Show Parts (${hiddenParts.children.length})`;
        });
    });

    // Watch video logic
    document.querySelectorAll(".watch-video").forEach(button => {
        button.addEventListener("click", () => {
            const lessonTitle = button.dataset.title;
            let recentLessons = JSON.parse(localStorage.getItem("recentlyViewed")) || {};
            recentLessons[lessonTitle] = Date.now();
            localStorage.setItem("recentlyViewed", JSON.stringify(recentLessons));

            const videoId = button.dataset.video;
            if (videoId) {
                openVideoPlayer(videoId);
            }
        });
    });

    // Download button logic
    document.querySelectorAll('.download-button').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const url = button.dataset.url;
            showAttachmentModal(url);
        });
    });
}

function renderLessonPart(part, lessonTitle) {
    const youtubeUrl = part.youtube.replace(/^🔗\s*/g, '');
    const videoId = getYouTubeId(youtubeUrl);
    
    return `
        <div class="lesson-part">
            <p>${part.name}</p>
            <div class="video-actions">
                ${videoId ? `
                    <button class="button watch-video"
                            data-video="${videoId}"
                            data-title="${lessonTitle}">
                        <i class="fas fa-play"></i> Watch
                    </button>
                    <button class="button download-video"
                            data-video="${videoId}">
                        <i class="fas fa-download"></i> Download
                    </button>
                ` : `
                    <a href="${youtubeUrl}" class="button" target="_blank"
                       data-title="${lessonTitle}">
                        <i class="fas fa-external-link-alt"></i> Watch
                    </a>
                `}
            </div>
        </div>
    `;
}