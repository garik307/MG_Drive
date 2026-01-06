class NotificationManager {
    constructor(containerSelector = null) {
        this.container = containerSelector
            ? document.querySelector(containerSelector)
            : null;
        this.max = 5;
        this.confirmOpen = false;
        this.init();
    }

    init() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'notification-container';
            document.body.appendChild(this.container);
        }
    }

    show(message, type = 'info', duration = 5000) {
        if (typeof duration !== 'number' || isNaN(duration)) {
            duration = 5000;
        }

        // Determine icon based on type
        let icon = 'fa-circle-info';
        if (type === 'success') icon = 'fa-circle-check';
        else if (type === 'danger' || type === 'error') icon = 'fa-circle-exclamation';
        else if (type === 'warning') icon = 'fa-triangle-exclamation';

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.zIndex = '9999'; 
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fa-solid ${icon} notification-icon"></i>
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
            <div class="notification-progress"></div>
        `;

        // Close button
        notification.querySelector('.notification-close').addEventListener('click', () => {
            this.hide(notification);
        });

        // Auto-hide (staggered): 3s base + 400ms per existing item
        const idx = this.container.children.length; // before append
        const effectiveDuration = Math.max(0, duration + idx * 400);
        
        const progressBar = notification.querySelector('.notification-progress');
        if (progressBar) {
            progressBar.style.animationName = 'notificationProgress';
            progressBar.style.animationDuration = `${effectiveDuration}ms`;
            progressBar.style.animationTimingFunction = 'linear';
            progressBar.style.animationFillMode = 'forwards';
        }

        const timeoutId = setTimeout(() => this.hide(notification), effectiveDuration);

        // Remove from DOM
        notification.addEventListener('transitionend', () => {
            if (!notification.classList.contains('show') && notification.parentElement) {
                notification.parentElement.removeChild(notification);
                clearTimeout(timeoutId);
            }
        });

        while (this.container.children.length >= this.max) {
            if (this.container.firstElementChild) this.container.removeChild(this.container.firstElementChild);
        }
        this.container.appendChild(notification);

        // Animate in
        requestAnimationFrame(() => notification.classList.add('show'));
    }

    hide(notification) {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification && notification.parentElement && !notification.classList.contains('show')) {
                notification.parentElement.removeChild(notification);
            }
        }, 350);
    }

    confirm({ title = 'Հաստատում', message = '', confirmText = 'Այո', cancelText = 'Չեղարկել', timeout = 0 } = {}) {
        if (this.confirmOpen) return Promise.resolve(false);
        this.confirmOpen = true;
        return new Promise((resolve) => {
            const notification = document.createElement('div');
            notification.className = 'notification notification-confirm';
            notification.style.zIndex = '9999';
            notification.innerHTML = `
                <div class="notification-content">
                    <div class="notification-title">${title}</div>
                    <div class="notification-message">${message}</div>
                    <div class="notification-actions">
                        <button class="btn btn-sm btn-secondary notification-cancel">${cancelText}</button>
                        <button class="btn btn-sm btn-primary notification-confirm-btn">${confirmText}</button>
                    </div>
                </div>
            `;

            const onCleanup = () => {
                this.confirmOpen = false;
                this.hide(notification);
            };
            let autoTimer;
            if (timeout && timeout > 0) {
                autoTimer = setTimeout(() => {
                    resolve(false);
                    onCleanup();
                }, timeout);
            }

            notification.querySelector('.notification-cancel').addEventListener('click', () => {
                if (autoTimer) clearTimeout(autoTimer);
                resolve(false);
                onCleanup();
            });
            notification.querySelector('.notification-confirm-btn').addEventListener('click', () => {
                if (autoTimer) clearTimeout(autoTimer);
                resolve(true);
                onCleanup();
            });

            while (this.container.children.length >= this.max) {
                if (this.container.firstElementChild) this.container.removeChild(this.container.firstElementChild);
            }
            this.container.appendChild(notification);
            requestAnimationFrame(() => notification.classList.add('show'));
        });
    }
}

// Singleton pattern for app-wide use
const notifications = new NotificationManager();

function showNotification(message, type = 'info', duration = 5000) {
    notifications.show(message, type, duration);
}

function showConfirm(options) {
    return notifications.confirm(options);
}

function showModalConfirm({ title = 'Հաստատում', message = '', confirmText = 'Այո', cancelText = 'Չեղարկել' } = {}) {
    return new Promise((resolve) => {
        if (notifications.confirmOpen) return resolve(false);
        notifications.confirmOpen = true;

        const overlay = document.createElement('div');
        overlay.className = 'confirm-modal-overlay';

        const modal = document.createElement('div');
        modal.className = 'confirm-modal';
        modal.innerHTML = `
            <div class="confirm-header">${title}</div>
            <div class="confirm-body">${message}</div>
            <div class="confirm-actions">
                <button class="btn btn-sm text-white btn-danger confirm-cancel">${cancelText}</button>
                <button class="btn btn-sm text-white btn-success confirm-ok">${confirmText}</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const cleanup = () => {
            notifications.confirmOpen = false;
            if (overlay && overlay.parentElement) overlay.parentElement.removeChild(overlay);
        };

        modal.querySelector('.confirm-cancel').addEventListener('click', () => {
            resolve(false);
            cleanup();
        });
        modal.querySelector('.confirm-ok').addEventListener('click', () => {
            resolve(true);
            cleanup();
        });
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                resolve(false);
                cleanup();
            }
        });
        document.addEventListener('keydown', function esc(e) {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', esc);
                resolve(false);
                cleanup();
            }
        });
    });
}

