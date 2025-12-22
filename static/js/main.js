// ===== CineReview Main JavaScript =====

// Document Ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all components
    initRatingInputs();
    initTooltips();
    initFormValidation();
    initKeyboardNavigation();
    initDynamicContent();
    initNavbarScroll();

});
function initNavbarScroll() {
    const navbar = document.querySelector('.navbar');

    if (navbar) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 50) {
                navbar.classList.add('navbar-scrolled');
            } else {
                navbar.classList.remove('navbar-scrolled');
            }
        });

        // 初始检查
        if (window.scrollY > 50) {
            navbar.classList.add('navbar-scrolled');
        }
    }
}
// Rating Input Handler
function initRatingInputs() {
    const ratingInputs = document.querySelectorAll('.rating-input input[type="radio"]');

    ratingInputs.forEach(input => {
        input.addEventListener('change', function() {
            const rating = this.value;
            const starLabels = this.closest('.rating-input').querySelectorAll('.star-label');

            // Update star display
            starLabels.forEach((label, index) => {
                const starIndex = 5 - index;
                if (starIndex <= rating) {
                    label.style.color = '#f8961e'; // Warning color
                } else {
                    label.style.color = '#ddd';
                }
            });

            // Announce rating for screen readers
            const liveRegion = document.getElementById('rating-live-region') || createLiveRegion();
            liveRegion.textContent = `Rating set to ${rating} out of 5 stars`;
        });
    });
}

// Create live region for screen reader announcements
function createLiveRegion() {
    const liveRegion = document.createElement('div');
    liveRegion.id = 'rating-live-region';
    liveRegion.className = 'sr-only';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    document.body.appendChild(liveRegion);
    return liveRegion;
}

// Bootstrap Tooltips
function initTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl, {
            trigger: 'hover focus'
        });
    });
}

// Form Validation
function initFormValidation() {
    const forms = document.querySelectorAll('.needs-validation');

    forms.forEach(form => {
        form.addEventListener('submit', function(event) {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();

                // Focus on first invalid element
                const invalidElements = form.querySelectorAll(':invalid');
                if (invalidElements.length > 0) {
                    invalidElements[0].focus();
                }
            }

            form.classList.add('was-validated');
        }, false);
    });
}

// Enhanced Keyboard Navigation
function initKeyboardNavigation() {
    // Add keyboard shortcuts
    document.addEventListener('keydown', function(event) {
        // Skip if user is typing in an input field
        if (event.target.tagName === 'INPUT' ||
            event.target.tagName === 'TEXTAREA' ||
            event.target.isContentEditable) {
            return;
        }

        // S - Skip to search
        if (event.key === 's' || event.key === 'S') {
            const searchInput = document.querySelector('input[type="search"]');
            if (searchInput) {
                event.preventDefault();
                searchInput.focus();
            }
        }

        // M - Skip to main content
        if (event.key === 'm' || event.key === 'M') {
            event.preventDefault();
            document.getElementById('main-content').focus();
        }

        // H - Go to home
        if (event.key === 'h' || event.key === 'H') {
            event.preventDefault();
            window.location.href = '/';
        }
    });

    // Trap focus in modal dialogs
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('shown.bs.modal', function() {
            const focusableElements = modal.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (firstElement) {
                firstElement.focus();
            }

            // Trap focus
            modal.addEventListener('keydown', function trapTab(event) {
                if (event.key === 'Tab') {
                    if (event.shiftKey) {
                        // Shift + Tab
                        if (document.activeElement === firstElement) {
                            event.preventDefault();
                            lastElement.focus();
                        }
                    } else {
                        // Tab
                        if (document.activeElement === lastElement) {
                            event.preventDefault();
                            firstElement.focus();
                        }
                    }
                }

                // Escape key closes modal
                if (event.key === 'Escape') {
                    const modalInstance = bootstrap.Modal.getInstance(modal);
                    modalInstance.hide();
                }
            });
        });
    });
}

// Dynamic Content Loading
function initDynamicContent() {
    // Lazy load images
    if ('IntersectionObserver' in window) {
        const lazyImages = document.querySelectorAll('img[data-src]');

        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    observer.unobserve(img);
                }
            });
        });

        lazyImages.forEach(img => imageObserver.observe(img));
    }

    // Handle AJAX form submissions
    const ajaxForms = document.querySelectorAll('form[data-ajax]');
    ajaxForms.forEach(form => {
        form.addEventListener('submit', function(event) {
            event.preventDefault();

            const formData = new FormData(form);
            const action = form.getAttribute('action');
            const method = form.getAttribute('method') || 'POST';

            fetch(action, {
                method: method,
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Show success message
                    showNotification(data.message || '操作成功', 'success');

                    // Reset form if needed
                    if (form.hasAttribute('data-reset')) {
                        form.reset();
                    }

                    // Reload content if needed
                    if (data.reload) {
                        setTimeout(() => location.reload(), 1000);
                    }
                } else {
                    showNotification(data.message || '操作失败，请重试', 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('操作失败，请重试', 'error');
            });
        });
    });
}

// Notification System
function showNotification(message, type = 'info') {
    // 移除现有通知
    const existingNotifications = document.querySelectorAll('.custom-notification');
    existingNotifications.forEach(notification => notification.remove());

    // 创建通知
    const notification = document.createElement('div');
    notification.className = `custom-notification alert alert-${type} alert-dismissible fade show`;
    notification.setAttribute('role', 'alert');
    notification.setAttribute('aria-live', 'polite');

    notification.innerHTML = `
        <i class="bi ${getNotificationIcon(type)} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="关闭"></button>
    `;

    // 样式调整 - 居中上方
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.zIndex = '1080';
    notification.style.maxWidth = '400px';
    notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    notification.style.textAlign = 'center';
    notification.style.borderRadius = '8px';

    document.body.appendChild(notification);

    // 5秒后自动消失
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

function getNotificationIcon(type) {
    switch(type) {
        case 'success': return 'bi-check-circle-fill';
        case 'error': return 'bi-exclamation-circle-fill';
        case 'warning': return 'bi-exclamation-triangle-fill';
        default: return 'bi-info-circle-fill';
    }
}

// Debounce function for performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function for performance
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Export functions for use in other modules (if using modules)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showNotification,
        debounce,
        throttle
    };
}