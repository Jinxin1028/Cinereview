// ===== Accessibility Features =====

document.addEventListener('DOMContentLoaded', function() {
    initAccessibilityControls();
    initScreenReaderAnnouncements();
    initFocusTraps();
    initReducedMotion();
    checkContrast();
});

// Accessibility Controls
function initAccessibilityControls() {
    // 不再需要手动绑定按钮点击事件，因为现在通过下拉菜单的 onclick 直接调用函数

    // 检查如果高对比度已启用，更新下拉菜单项的文本
    if (localStorage.getItem('highContrast') === 'true') {
        // 高对比度模式已启用，可以在这里更新界面提示
        document.body.classList.add('high-contrast');
    }

    // 恢复用户偏好设置
    restoreAccessibilityPreferences();
}


// Font Size Adjustment
function adjustFontSize(action) {
    const currentSize = localStorage.getItem('fontSize') || 'normal';
    const sizes = ['small', 'normal', 'large', 'xlarge'];
    let currentIndex = sizes.indexOf(currentSize);

    if (action === 'increase' && currentIndex < sizes.length - 1) {
        currentIndex++;
    } else if (action === 'decrease' && currentIndex > 0) {
        currentIndex--;
    }

    const newSize = sizes[currentIndex];

    // Remove all font size classes
    document.body.classList.remove('small-font', 'normal-font', 'large-font', 'xlarge-font');

    if (newSize !== 'normal') {
        document.body.classList.add(`${newSize}-font`);
    }

    localStorage.setItem('fontSize', newSize);
}

// High Contrast Mode
function toggleHighContrast() {
    const body = document.body;
    const isHighContrast = body.classList.toggle('high-contrast');

    if (isHighContrast) {
        localStorage.setItem('highContrast', 'true');
        showNotification('High contrast mode enabled', 'success');
    } else {
        localStorage.setItem('highContrast', 'false');
        showNotification('High contrast mode disabled', 'info');
    }
}

// Restore User Preferences
function restoreAccessibilityPreferences() {
    // Font size
    const savedFontSize = localStorage.getItem('fontSize');
    if (savedFontSize && savedFontSize !== 'normal') {
        document.body.classList.add(`${savedFontSize}-font`);
    }

    // High contrast
    if (localStorage.getItem('highContrast') === 'true') {
        document.body.classList.add('high-contrast');
    }
}

// Screen Reader Announcements
function initScreenReaderAnnouncements() {
    // Create live region for announcements
    let liveRegion = document.getElementById('sr-announcements');
    if (!liveRegion) {
        liveRegion = document.createElement('div');
        liveRegion.id = 'sr-announcements';
        liveRegion.className = 'sr-only';
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        document.body.appendChild(liveRegion);
    }

    // Announce page title on load
    setTimeout(() => {
        announceToScreenReader(`Loaded page: ${document.title}`);
    }, 100);

    // Announce AJAX content changes
    observeDOMChanges();
}

function announceToScreenReader(message, priority = 'polite') {
    const liveRegion = document.getElementById('sr-announcements');
    if (liveRegion) {
        liveRegion.setAttribute('aria-live', priority);
        liveRegion.textContent = message;

        // Clear message after a delay so it can be announced again
        setTimeout(() => {
            liveRegion.textContent = '';
        }, 1000);
    }
}

// Observe DOM changes for dynamic content
function observeDOMChanges() {
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Check for alerts or important content
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) { // Element node
                        if (node.classList && node.classList.contains('alert')) {
                            const message = node.textContent.replace(/×/g, '').trim();
                            announceToScreenReader(message, 'assertive');
                        }
                    }
                });
            }
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Focus Management
function initFocusTraps() {
    // Focus trap for modals (handled in main.js)
    // Additional focus management for custom dialogs

    // When opening a dialog, save the previously focused element
    document.addEventListener('click', function(event) {
        const dialogTrigger = event.target.closest('[data-dialog]');
        if (dialogTrigger) {
            const dialogId = dialogTrigger.getAttribute('data-dialog');
            const dialog = document.getElementById(dialogId);
            if (dialog) {
                // Save current focus
                dialog.setAttribute('data-previous-focus', document.activeElement.id || '');

                // Focus first focusable element in dialog
                const focusableElements = dialog.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                if (focusableElements.length > 0) {
                    focusableElements[0].focus();
                }
            }
        }
    });
}

// Reduced Motion Support
function initReducedMotion() {
    // Check user preference for reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    if (prefersReducedMotion.matches) {
        // Disable animations
        document.documentElement.style.setProperty('--transition', 'none');

        // Disable specific animations
        const animatedElements = document.querySelectorAll('[data-animation]');
        animatedElements.forEach(el => {
            el.style.animation = 'none';
            el.style.transition = 'none';
        });
    }

    // Listen for changes in preference
    prefersReducedMotion.addEventListener('change', function() {
        if (this.matches) {
            document.documentElement.style.setProperty('--transition', 'none');
        }
    });
}

// Contrast Checker
function checkContrast() {
    // This is a simplified contrast check
    // In a real application, you might want to use a more comprehensive library

    const lowContrastElements = [];

    // Check text color against background
    const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6');

    textElements.forEach(el => {
        const textColor = getComputedStyle(el).color;
        const bgColor = getComputedStyle(el).backgroundColor;

        // Simplified contrast check (for demonstration)
        // In reality, you'd want to calculate luminance ratio
        if (textColor === bgColor ||
            (textColor === 'rgb(255, 255, 255)' && bgColor === 'rgb(255, 255, 255)') ||
            (textColor === 'rgb(0, 0, 0)' && bgColor === 'rgb(0, 0, 0)')) {
            lowContrastElements.push(el);
        }
    });

    if (lowContrastElements.length > 0 && !document.body.classList.contains('high-contrast')) {
        console.warn('Potential low contrast elements found:', lowContrastElements);
    }
}

// Keyboard Shortcuts Help
function showKeyboardShortcuts() {
    const shortcuts = [
        { key: 'S', action: 'Focus search field' },
        { key: 'M', action: 'Skip to main content' },
        { key: 'H', action: 'Go to homepage' },
        { key: 'Esc', action: 'Close modal or dialog' },
        { key: 'Tab', action: 'Navigate through interactive elements' },
        { key: 'Shift + Tab', action: 'Navigate backwards' }
    ];

    let helpText = 'Keyboard Shortcuts:\n\n';
    shortcuts.forEach(shortcut => {
        helpText += `${shortcut.key}: ${shortcut.action}\n`;
    });

    alert(helpText);
}

// Enhanced Link Focus
document.addEventListener('focusin', function(event) {
    if (event.target.tagName === 'A' || event.target.tagName === 'BUTTON') {
        // Add visual indicator for focused interactive elements
        event.target.style.outline = '3px solid #4361ee';
        event.target.style.outlineOffset = '2px';
    }
});

document.addEventListener('focusout', function(event) {
    if (event.target.tagName === 'A' || event.target.tagName === 'BUTTON') {
        event.target.style.outline = '';
    }
});

// ARIA Label Generator for Dynamic Content
function generateAriaLabel(element) {
    // Generate accessible labels for dynamic content
    if (element.tagName === 'IMG' && !element.getAttribute('alt')) {
        const context = element.closest('[aria-label]') ||
                       element.closest('[role]') ||
                       element.closest('article');

        if (context) {
            const label = context.getAttribute('aria-label') ||
                         context.getAttribute('role') ||
                         'content';
            element.setAttribute('alt', `Image related to ${label}`);
        } else {
            element.setAttribute('alt', 'Decorative image');
            element.setAttribute('aria-hidden', 'true');
        }
    }
}

// Initialize dynamic ARIA labels
setTimeout(() => {
    const images = document.querySelectorAll('img:not([alt])');
    images.forEach(generateAriaLabel);
}, 1000);

// Make the functions available globally
window.Accessibility = {
    adjustFontSize,
    toggleHighContrast,
    announceToScreenReader,
    showKeyboardShortcuts
};