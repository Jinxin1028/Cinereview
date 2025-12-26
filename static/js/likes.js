// ===== Likes System Initialization =====
document.addEventListener('DOMContentLoaded', function() {
    initLikeButtons();
    initWatchlistButtons();
    initReviewLikeButtons();
});

// ===== Like Buttons Setup =====
function initLikeButtons() {
    const likeButtons = document.querySelectorAll('#like-btn, .like-btn[data-movie-id]');
    likeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const movieId = this.getAttribute('data-movie-id');
            toggleLike(movieId, this);
        });
        button.addEventListener('keydown', function(event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                this.click();
            }
        });
    });
}

function initWatchlistButtons() {
    const watchlistButtons = document.querySelectorAll('#watchlist-btn, .watchlist-btn[data-movie-id]');
    watchlistButtons.forEach(button => {
        button.addEventListener('click', function() {
            const movieId = this.getAttribute('data-movie-id');
            toggleWatchlist(movieId, this);
        });
        button.addEventListener('keydown', function(event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                this.click();
            }
        });
    });
}

function initReviewLikeButtons() {
    const reviewLikeButtons = document.querySelectorAll('.like-review-btn');
    reviewLikeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const reviewId = this.getAttribute('data-review-id');
            toggleReviewLike(reviewId, this);
        });
        button.addEventListener('keydown', function(event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                this.click();
            }
        });
    });
}

// ===== Toggle Functions =====
function toggleLike(movieId, button) {
    const csrfToken = getCSRFToken();
    const isLiked = button.querySelector('i').classList.contains('bi-hand-thumbs-up-fill');

    fetch(`/movie/${movieId}/like`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ action: isLiked ? 'unlike' : 'like' })
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) {
                showNotification('Please login to use favorites', 'warning');
                return;
            }
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            const icon = button.querySelector('i');
            const countSpan = button.querySelector('.like-count') || button.querySelector('#like-count');

            if (data.action === 'liked') {
                icon.classList.remove('bi-hand-thumbs-up');
                icon.classList.add('bi-hand-thumbs-up-fill');
                button.setAttribute('aria-label', 'Unlike this movie');

                if (countSpan && data.new_likes_count !== undefined) {
                    countSpan.textContent = data.new_likes_count;
                } else if (countSpan) {
                    countSpan.textContent = parseInt(countSpan.textContent) + 1;
                }

                const sidebarCount = document.getElementById('sidebar-like-count');
                if (sidebarCount) {
                    sidebarCount.textContent = data.new_likes_count !== undefined ? data.new_likes_count : parseInt(sidebarCount.textContent) + 1;
                }
                showNotification('Movie added to favorites', 'success');
            } else {
                icon.classList.remove('bi-hand-thumbs-up-fill');
                icon.classList.add('bi-hand-thumbs-up');
                button.setAttribute('aria-label', 'Like this movie');

                if (countSpan && data.new_likes_count !== undefined) {
                    countSpan.textContent = data.new_likes_count;
                } else if (countSpan) {
                    countSpan.textContent = parseInt(countSpan.textContent) - 1;
                }

                const sidebarCount = document.getElementById('sidebar-like-count');
                if (sidebarCount) {
                    sidebarCount.textContent = data.new_likes_count !== undefined ? data.new_likes_count : parseInt(sidebarCount.textContent) - 1;
                }
                showNotification('Movie removed from favorites', 'info');
            }

            if (typeof Accessibility !== 'undefined') {
                Accessibility.announceToScreenReader(
                    `Movie ${data.action === 'liked' ? 'added to' : 'removed from'} your likes`,
                    'assertive'
                );
            }
        } else {
            if (data.requires_login) {
                showNotification('Please login to use favorites', 'warning');
            } else {
                showNotification(data.message || 'Operation failed, please try again', 'error');
            }
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Please login to use favorites', 'warning');
    });
}

function toggleWatchlist(movieId, button) {
    const csrfToken = getCSRFToken();
    const isInWatchlist = button.querySelector('i').classList.contains('bi-bookmark-fill');

    fetch(`/movie/${movieId}/watchlist`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ action: isInWatchlist ? 'remove' : 'add' })
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) {
                showNotification('Please login to use watchlist', 'warning');
                return;
            }
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            const icon = button.querySelector('i');
            if (data.action === 'added') {
                icon.classList.remove('bi-bookmark');
                icon.classList.add('bi-bookmark-fill');
                button.setAttribute('aria-label', 'Remove from watchlist');
                showNotification('Movie added to watchlist', 'success');
            } else {
                icon.classList.remove('bi-bookmark-fill');
                icon.classList.add('bi-bookmark');
                button.setAttribute('aria-label', 'Add to watchlist');
                showNotification('Movie removed from watchlist', 'info');
            }

            if (typeof Accessibility !== 'undefined') {
                Accessibility.announceToScreenReader(
                    `Movie ${data.action === 'added' ? 'added to' : 'removed from'} watchlist`,
                    'assertive'
                );
            }
        } else {
            if (data.requires_login) {
                showNotification('Please login to use watchlist', 'warning');
            } else {
                showNotification(data.message || 'Operation failed, please try again', 'error');
            }
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Please login to use watchlist', 'warning');
    });
}

function toggleReviewLike(reviewId, button) {
    const csrfToken = getCSRFToken();
    const icon = button.querySelector('i');
    const isLiked = icon.classList.contains('bi-hand-thumbs-up-fill') ||
                    icon.classList.contains('fas') ||
                    button.classList.contains('active');

    if (!csrfToken || csrfToken.trim() === '') {
        showNotification('Request verification failed, please refresh page', 'error');
        console.error('CSRF token missing for review like request');
        return;
    }

    fetch(`/review/${reviewId}/like`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify({
            action: isLiked ? 'unlike' : 'like'
        })
    })
    .then(response => {
        if (response.status === 401) {
            showNotification('Login expired, please login again', 'warning');
            setTimeout(() => {
                window.location.href = '/login?next=' + encodeURIComponent(window.location.pathname);
            }, 1500);
            return null;
        } else if (response.status === 403) {
            showNotification('Security verification failed, please refresh page', 'error');
            return null;
        } else if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (!data) return;

        if (data.success) {
            const countSpan = button.querySelector('.like-count');
            if (data.action === 'liked') {
                icon.classList.remove('bi-hand-thumbs-up');
                icon.classList.add('bi-hand-thumbs-up-fill');
                button.setAttribute('aria-label', 'Unlike this review');

                if (countSpan && data.new_likes_count !== undefined) {
                    countSpan.textContent = data.new_likes_count;
                } else if (countSpan) {
                    countSpan.textContent = parseInt(countSpan.textContent) + 1;
                }
                showNotification('Review liked', 'success');
            } else {
                icon.classList.remove('bi-hand-thumbs-up-fill');
                icon.classList.add('bi-hand-thumbs-up');
                button.setAttribute('aria-label', 'Like this review');

                if (countSpan && data.new_likes_count !== undefined) {
                    countSpan.textContent = data.new_likes_count;
                } else if (countSpan) {
                    const currentCount = parseInt(countSpan.textContent);
                    countSpan.textContent = Math.max(0, currentCount - 1);
                }
                showNotification('Like removed', 'info');
            }

            button.classList.add('active');
            setTimeout(() => button.classList.remove('active'), 300);

            if (typeof Accessibility !== 'undefined') {
                Accessibility.announceToScreenReader(
                    `Review ${data.action === 'liked' ? 'liked' : 'unliked'}`,
                    'polite'
                );
            }
        } else {
            if (data.message) {
                showNotification(data.message, 'error');
            } else if (data.requires_login) {
                showNotification('Please login to like reviews', 'warning');
            } else {
                showNotification('Operation failed, please try again later', 'error');
            }
        }
    })
    .catch(error => {
        console.error('Like request failed:', error);
        showNotification('Network error, please check connection', 'error');
    });
}

// ===== CSRF Token Management =====
function getCSRFToken() {
    const metaToken = document.querySelector('meta[name="csrf-token"]');
    if (metaToken) {
        const token = metaToken.getAttribute('content');
        if (token && token.length > 0) {
            return token;
        }
    }

    const formToken = document.querySelector('input[name="csrf_token"]');
    if (formToken && formToken.value) {
        return formToken.value;
    }

    const csrfInput = document.querySelector('input[name="csrf_token"]');
    if (csrfInput) {
        return csrfInput.value;
    }

    const cookieToken = getCookie('csrf_token');
    if (cookieToken) {
        return cookieToken;
    }

    console.warn('CSRF token not found in page, fetching from API...');
    fetch('/api/csrf-token')
        .then(response => response.json())
        .then(data => {
            if (data.csrf_token) {
                if (metaToken) {
                    metaToken.setAttribute('content', data.csrf_token);
                }
                return data.csrf_token;
            }
        })
        .catch(error => {
            console.error('Failed to fetch CSRF token:', error);
        });

    console.error('CSRF token not found');
    return '';
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

// ===== Performance Optimizations =====
const debouncedLike = debounce(function(movieId, button) {
    toggleLike(movieId, button);
}, 300);

const throttledLike = throttle(function(reviewId, button) {
    toggleReviewLike(reviewId, button);
}, 1000);

// ===== Global Likes API =====
window.Likes = {
    toggleLike,
    toggleWatchlist,
    toggleReviewLike,
    debouncedLike,
    throttledLike
};