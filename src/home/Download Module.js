// Download functionality
let currentVideoId = null;

function showDownloadModal(videoId) {
    currentVideoId = videoId;
    document.getElementById('downloadModal').style.display = 'flex';
}

function closeDownloadModal() {
    document.getElementById('downloadModal').style.display = 'none';
}

function downloadVideo(service) {
    if (!currentVideoId) return;
    
    let url;
    switch(service) {
        case 'youpak':
            url = `https://youpak.com/watch?v=${currentVideoId}`;
            break;
        case 'y2mate':
            url = `https://www.y2mate.com/youtube/${currentVideoId}`;
            break;
        case 'ssyoutube':
            url = `https://ssyoutube.com/watch?v=${currentVideoId}`;
            break;
        default:
            return;
    }
    
    window.open(url, '_blank');
    closeDownloadModal();
}

// Add event listeners for download modal
document.querySelector('.close-download-modal').addEventListener('click', closeDownloadModal);
document.querySelectorAll('.download-option').forEach(button => {
    button.addEventListener('click', () => {
        downloadVideo(button.dataset.service);
    });
});

// Close modal when clicking outside
document.getElementById('downloadModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('downloadModal')) {
        closeDownloadModal();
    }
});


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

document.addEventListener('click', (e) => {
    if (e.target.closest('.download-video')) {
        const button = e.target.closest('.download-video');
        const videoId = button.dataset.video;
        showDownloadModal(videoId);
    }
});