// mouse Hover Effect services carts
function mouseHover() {
    let animatedElements = document.querySelectorAll('.mouseOverLight'); // Ensure correct spelling for variable name
    if (animatedElements) {
        animatedElements.forEach(el => {
            // Create shadow for each element and append it
            let shadow = document.createElement('div');
            shadow.classList.add('shadow');

            // Ensure the parent element has a relative position
            let parent = el.parentNode;
            parent.style.position = 'relative';

            // Add the shadow to the parent element
            parent.appendChild(shadow);

            // Mouse move event to update shadow position
            parent.addEventListener('mousemove', (e) => {
                let rect = parent.getBoundingClientRect();
                let x = e.clientX - rect.left;
                let y = e.clientY - rect.top;

                // Set the shadow's position
                shadow.style.opacity = '1';
                shadow.style.top = `${y}px`;
                shadow.style.left = `${x}px`;

                // Optionally, you can animate the shadow's movement with CSS transitions
                shadow.animate({
                    left: `${x}px`,
                    top: `${y}px`
                }, {
                    duration: 500,
                    fill: 'forwards'
                })

            });

            // Mouse leave event to hide the shadow
            parent.addEventListener('mouseleave', () => {
                shadow.style.opacity = '0';
            });
        });
    }
}

function scrollAnimation() {
    // Callback function for the IntersectionObserver
    function callback(entries, observer) {
        entries.forEach(entry => {
            const target = entry.target;

            // As the element enters the viewport, we scale and move it up
            if (entry.intersectionRatio > 0) {
                // Set a translateY value based on intersectionRatio to animate the element from bottom
                target.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-in-out';
                target.style.transform = `translateY(${(1 - entry.intersectionRatio) * 100}px)`; // Move from below
                target.style.opacity = entry.intersectionRatio; // Fade in based on visibility
            } else {
                // Reset properties when out of view
                target.style.transform = 'translateY(100px)';
                target.style.opacity = '0';
            }
        });
    }

    // Define observer options
    const options = {
        threshold: Array.from({
            length: 101
        }, (_, i) => i / 100),
    };

    // Create a new IntersectionObserver instance
    let observer = new IntersectionObserver(callback, options);

    // Observe each '.project' element
    document.querySelectorAll('.scroll_animate').forEach(target => {
        observer.observe(target);
    });
}

function scrolling() {
    window.addEventListener('scroll', () => {
        let icon = document.querySelector('.goToTopIcon');
        if (icon) {
            let goTopBtn = document.querySelector('.go_to_top');
            let header = document.querySelector('header');
            let parent = icon.parentElement;
            if (window.scrollY > 800) {
                goTopBtn.classList.add('active');
                parent.href = '#home';
                header.style.paddingTop = '0';
                icon.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
            } else {
                goTopBtn.classList.remove('active');
                header.style.paddingTop = '15px';
                parent.href = '#about_me';
                icon.innerHTML = '<i class="fa-solid fa-arrow-down"></i>';
            }
        }
    });
}

mouseHover();
scrolling();
scrollAnimation();