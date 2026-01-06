document.addEventListener('DOMContentLoaded', function() {
    const galleryItems = document.querySelectorAll('.gallery-item');
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    const loadMoreText = document.getElementById('loadMoreText');
    const loadMoreIcon = loadMoreBtn ? loadMoreBtn.querySelector('i') : null;
    
    let currentItems = 8;
    const itemsPerLoad = 8;
    const totalItems = galleryItems.length;

    // Initial check
    if (totalItems <= 8) {
        if(loadMoreBtn) loadMoreBtn.style.display = 'none';
    }

    if(loadMoreBtn) {
        loadMoreBtn.addEventListener('click', function(e) {
            e.preventDefault();

            // Check if we are in "Close" mode
            const isCloseMode = loadMoreText.textContent.trim() === 'Փակել';

            if (isCloseMode) {
                // Collapse logic
                currentItems = 8;
                galleryItems.forEach((item, index) => {
                    if (index >= currentItems) {
                        item.classList.add('hidden-item');
                        item.classList.remove('fade-in');
                    }
                });
                
                loadMoreText.textContent = 'Բեռնել ավելին';
                if(loadMoreIcon) {
                    loadMoreIcon.className = 'fas fa-chevron-down';
                }
                
                // Scroll back to gallery top smoothly
                const gallerySection = document.getElementById('gallery');
                if(gallerySection) gallerySection.scrollIntoView({ behavior: 'smooth' });
            } else {
                // Load More Logic with Animation
                
                // 1. Show loading state
                const originalText = loadMoreText.textContent;
                loadMoreText.textContent = 'Բեռնվում է...';
                loadMoreBtn.classList.add('loading');
                if(loadMoreIcon) {
                    loadMoreIcon.className = 'fas fa-spinner fa-spin';
                }
                loadMoreBtn.disabled = true;

                // 2. Simulate delay (animation)
                setTimeout(() => {
                    const nextItems = currentItems + itemsPerLoad;
                    const limit = Math.min(nextItems, totalItems);
                    
                    for (let i = currentItems; i < limit; i++) {
                        if (galleryItems[i]) {
                            galleryItems[i].classList.remove('hidden-item');
                            // Adding class triggers animation if defined in CSS
                            galleryItems[i].classList.add('fade-in');
                        }
                    }
                    
                    currentItems = limit;

                    // 3. Update Button State
                    loadMoreBtn.disabled = false;
                    loadMoreBtn.classList.remove('loading');
                    
                    if (currentItems >= totalItems) {
                        loadMoreText.textContent = 'Փակել';
                        if(loadMoreIcon) {
                            loadMoreIcon.className = 'fas fa-chevron-up';
                        }
                    } else {
                        loadMoreText.textContent = 'Բեռնել ավելին';
                        if(loadMoreIcon) {
                            loadMoreIcon.className = 'fas fa-chevron-down';
                        }
                    }

                }, 800); // 800ms delay for loading animation
            }
        });
    }
});
