class NotificationManager {
    constructor(containerSelector = null) {
        this.container = containerSelector
            ? document.querySelector(containerSelector)
            : null;
        this.init();
    }

    init() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'notification-container';
            document.body.appendChild(this.container);
        }
    }

    show(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.zIndex = '9999';
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
            <div class="notification-progress"></div>
        `;

        // Close button
        notification.querySelector('.notification-close').addEventListener('click', () => {
            this.hide(notification);
        });

        const progressBar = notification.querySelector('.notification-progress');
        if (progressBar) {
            progressBar.style.animationName = 'notificationProgress';
            progressBar.style.animationDuration = `${duration}ms`;
            progressBar.style.animationTimingFunction = 'linear';
            progressBar.style.animationFillMode = 'forwards';
        }

        // Auto-hide
        const timeoutId = setTimeout(() => this.hide(notification), duration);

        // Remove from DOM
        notification.addEventListener('transitionend', () => {
            if (!notification.classList.contains('show') && notification.parentElement) {
                notification.parentElement.removeChild(notification);
                clearTimeout(timeoutId);
            }
        });

        this.container.appendChild(notification);

        // Animate in
        requestAnimationFrame(() => notification.classList.add('show'));
    }

    hide(notification) {
        notification.classList.remove('show');
    }
}

// Singleton pattern for app-wide use
const notifications = new NotificationManager();

function showNotification(message, type = 'info', duration = 5000) {
    notifications.show(message, type, duration);
}
