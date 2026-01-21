document.addEventListener("DOMContentLoaded", function() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        // Remove active class first
        link.classList.remove('active');
        
        // Exact match for root or other pages
        if (href === currentPath) {
            link.classList.add('active');
        } 
        // Handle sub-paths (e.g. /groups/123 should activate /groups)
        else if (href !== '/' && href !== '#' && currentPath.startsWith(href)) {
             link.classList.add('active');
        }
    });
});
