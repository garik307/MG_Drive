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
        else if (href !== '/' && href !== '#' && currentPath.startsWith(href)) {
             link.classList.add('active');
        }
    });

    const navIcon = document.getElementById("hamburgetButton");

    navIcon.addEventListener("click", function () {
        this.classList.toggle("open");
    });
});
