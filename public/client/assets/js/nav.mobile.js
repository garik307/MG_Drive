 document.addEventListener('DOMContentLoaded', () => {
     const navItems = document.querySelectorAll('.mobile_navigation .nav-item');
     const indicator = document.querySelector('.mobile_navigation .nav-indicator');

     function updateIndicator(item) {
         const itemLeft = item.offsetLeft;
         const itemWidth = item.offsetWidth;
         const indicatorWidth = 50;

         const targetLeft = itemLeft + (itemWidth / 2) - (indicatorWidth / 2);
         indicator.style.left = `${targetLeft}px`;
     }

     // Set active item based on current URL
    const currentPath = window.location.pathname;
    navItems.forEach(item => {
        const href = item.getAttribute('href');

        if (href === currentPath || (href !== '/' && currentPath.startsWith(href))) {
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
        }
    });

    // Initialize position for the active item
    const activeItem = document.querySelector('.mobile_navigation .nav-item.active');
    if (activeItem) {
        // Disable transition initially to prevent sliding animation on page load
        indicator.style.transition = 'none';
        
        // Update position immediately
        updateIndicator(activeItem);

        // Make visible and restore transition
        // We need a double RequestAnimationFrame or a small timeout to ensure the style change (position) has applied
        // before we change opacity and transition
        requestAnimationFrame(() => {
            indicator.style.opacity = '1';
            
            // Restore transition after a short delay
            setTimeout(() => {
                indicator.style.transition = '';
            }, 100);
        });
    }

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            // If it's a modal trigger, don't do the delay navigation
            if (item.hasAttribute('data-bs-toggle')) {
                // Prevent default anchor jump if it's a link
                if (item.tagName === 'A') e.preventDefault();
                return;
            }

            e.preventDefault(); 
            const href = item.getAttribute('href');

            // Remove active class from all
            navItems.forEach(nav => nav.classList.remove('active'));

            // Add active class to clicked
            item.classList.add('active');

            // Update indicator position
            updateIndicator(item);

            // Wait 1 second (1000ms) before navigating
            setTimeout(() => {
                window.location.href = href;
            }, 1000);
        });
    });

     // Update on resize to keep correct position
     window.addEventListener('resize', () => {
         const currentActive = document.querySelector('.mobile_navigation .nav-item.active');
         if (currentActive) {
             updateIndicator(currentActive);
         }
     });
 });