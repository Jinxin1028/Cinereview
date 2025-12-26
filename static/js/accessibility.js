// ===== Accessibility Core =====
document.addEventListener('DOMContentLoaded', function() {
    initAccessibilityControls();
    initScreenReaderAnnouncements();
    initFocusTraps();
    initReducedMotion();
    checkContrast();
});

// ===== Controls & Preferences =====
function initAccessibilityControls() {
    if (localStorage.getItem('highContrast') === 'true') {
        document.body.classList.add('high-contrast');
    }
    restoreAccessibilityPreferences();
}

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
    document.body.classList.remove('small-font', 'normal-font', 'large-font', 'xlarge-font');
    if (newSize !== 'normal') {
        document.body.classList.add(`${newSize}-font`);
    }
    localStorage.setItem('fontSize', newSize);
}

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

function restoreAccessibilityPreferences() {
    const savedFontSize = localStorage.getItem('fontSize');
    if (savedFontSize && savedFontSize !== 'normal') {
        document.body.classList.add(`${savedFontSize}-font`);
    }
    if (localStorage.getItem('highContrast') === 'true') {
        document.body.classList.add('high-contrast');
    }
}

// ===== Screen Reader & Announcements =====
function initScreenReaderAnnouncements() {
    let liveRegion = document.getElementById('sr-announcements');
    if (!liveRegion) {
        liveRegion = document.createElement('div');
        liveRegion.id = 'sr-announcements';
        liveRegion.className = 'sr-only';
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        document.body.appendChild(liveRegion);
    }

    setTimeout(() => {
        announceToScreenReader(`Loaded page: ${document.title}`);
    }, 100);
    observeDOMChanges();
}

function announceToScreenReader(message, priority = 'polite') {
    const liveRegion = document.getElementById('sr-announcements');
    if (liveRegion) {
        liveRegion.setAttribute('aria-live', priority);
        liveRegion.textContent = message;
        setTimeout(() => {
            liveRegion.textContent = '';
        }, 1000);
    }
}

function observeDOMChanges() {
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1 && node.classList && node.classList.contains('alert')) {
                        const message = node.textContent.replace(/×/g, '').trim();
                        announceToScreenReader(message, 'assertive');
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

// ===== Focus Management =====
function initFocusTraps() {
    document.addEventListener('click', function(event) {
        const dialogTrigger = event.target.closest('[data-dialog]');
        if (dialogTrigger) {
            const dialogId = dialogTrigger.getAttribute('data-dialog');
            const dialog = document.getElementById(dialogId);
            if (dialog) {
                dialog.setAttribute('data-previous-focus', document.activeElement.id || '');
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

// ===== Motion & Contrast =====
function initReducedMotion() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    if (prefersReducedMotion.matches) {
        document.documentElement.style.setProperty('--transition', 'none');
        const animatedElements = document.querySelectorAll('[data-animation]');
        animatedElements.forEach(el => {
            el.style.animation = 'none';
            el.style.transition = 'none';
        });
    }

    prefersReducedMotion.addEventListener('change', function() {
        if (this.matches) {
            document.documentElement.style.setProperty('--transition', 'none');
        }
    });
}

function checkContrast() {
    const lowContrastElements = [];
    const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6');

    textElements.forEach(el => {
        const textColor = getComputedStyle(el).color;
        const bgColor = getComputedStyle(el).backgroundColor;

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

// ===== Keyboard Shortcuts =====
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

// ===== Focus Enhancement =====
document.addEventListener('focusin', function(event) {
    if (event.target.tagName === 'A' || event.target.tagName === 'BUTTON') {
        event.target.style.outline = '3px solid #4361ee';
        event.target.style.outlineOffset = '2px';
    }
});

document.addEventListener('focusout', function(event) {
    if (event.target.tagName === 'A' || event.target.tagName === 'BUTTON') {
        event.target.style.outline = '';
    }
});

// ===== ARIA Labels Generation =====
function generateAriaLabel(element) {
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

setTimeout(() => {
    const images = document.querySelectorAll('img:not([alt])');
    images.forEach(generateAriaLabel);
}, 1000);

// ===== Global Accessibility API =====
window.Accessibility = {
    adjustFontSize,
    toggleHighContrast,
    announceToScreenReader,
    showKeyboardShortcuts
};