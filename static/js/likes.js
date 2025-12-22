// ===== AJAX Like/Bookmark System =====

document.addEventListener('DOMContentLoaded', function() {
    initLikeButtons();
    initWatchlistButtons();
    initReviewLikeButtons();
});

// Movie Like Buttons
function initLikeButtons() {
    const likeButtons = document.querySelectorAll('#like-btn, .like-btn[data-movie-id]');

    likeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const movieId = this.getAttribute('data-movie-id');
            toggleLike(movieId, this);
        });

        // Add keyboard support
        button.addEventListener('keydown', function(event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                this.click();
            }
        });
    });
}

// Watchlist Buttons
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

// Review Like Buttons
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

// Toggle Movie Like
// Toggle Movie Like
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
                // 用户未登录
                showNotification('请先登录后才能使用收藏功能', 'warning');
                return;
            }
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Update button state
            const icon = button.querySelector('i');
            const countSpan = button.querySelector('.like-count') || button.querySelector('#like-count');

            if (data.action === 'liked') {
                icon.classList.remove('bi-hand-thumbs-up');
                icon.classList.add('bi-hand-thumbs-up-fill');
                button.setAttribute('aria-label', 'Unlike this movie');

                // 使用后端返回的计数，如果没有则手动计算
                if (countSpan && data.new_likes_count !== undefined) {
                    countSpan.textContent = data.new_likes_count;
                } else if (countSpan) {
                    countSpan.textContent = parseInt(countSpan.textContent) + 1;
                }

                // Update sidebar count if exists
                const sidebarCount = document.getElementById('sidebar-like-count');
                if (sidebarCount) {
                    if (data.new_likes_count !== undefined) {
                        sidebarCount.textContent = data.new_likes_count;
                    } else {
                        sidebarCount.textContent = parseInt(sidebarCount.textContent) + 1;
                    }
                }

                showNotification('电影已添加到收藏', 'success');
            } else {
                icon.classList.remove('bi-hand-thumbs-up-fill');
                icon.classList.add('bi-hand-thumbs-up');
                button.setAttribute('aria-label', 'Like this movie');

                // 使用后端返回的计数，如果没有则手动计算
                if (countSpan && data.new_likes_count !== undefined) {
                    countSpan.textContent = data.new_likes_count;
                } else if (countSpan) {
                    countSpan.textContent = parseInt(countSpan.textContent) - 1;
                }

                // Update sidebar count if exists
                const sidebarCount = document.getElementById('sidebar-like-count');
                if (sidebarCount) {
                    if (data.new_likes_count !== undefined) {
                        sidebarCount.textContent = data.new_likes_count;
                    } else {
                        sidebarCount.textContent = parseInt(sidebarCount.textContent) - 1;
                    }
                }

                showNotification('电影已从收藏中移除', 'info');
            }

            // Announce to screen reader
            if (typeof Accessibility !== 'undefined') {
                Accessibility.announceToScreenReader(
                    `Movie ${data.action === 'liked' ? 'added to' : 'removed from'} your likes`,
                    'assertive'
                );
            }
        } else {
            if (data.requires_login) {
                showNotification('请先登录后才能使用收藏功能', 'warning');
            } else {
                showNotification(data.message || '操作失败，请重试', 'error');
            }
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('请先登录后才能使用收藏功能', 'warning');
    });
}

// Toggle Watchlist
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
                // 用户未登录
                showNotification('请先登录后才能使用收藏功能', 'warning');
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
                showNotification('电影已添加到待看列表', 'success');
            } else {
                icon.classList.remove('bi-bookmark-fill');
                icon.classList.add('bi-bookmark');
                button.setAttribute('aria-label', 'Add to watchlist');
                showNotification('电影已从待看列表中移除', 'info');
            }

            // Announce to screen reader
            if (typeof Accessibility !== 'undefined') {
                Accessibility.announceToScreenReader(
                    `Movie ${data.action === 'added' ? 'added to' : 'removed from'} watchlist`,
                    'assertive'
                );
            }
        } else {
            if (data.requires_login) {
                showNotification('请先登录后才能使用收藏功能', 'warning');
            } else {
                showNotification(data.message || '操作失败，请重试', 'error');
            }
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('请先登录后才能使用收藏功能', 'warning');
    });
}

// Toggle Review Like
// Toggle Review Like
function toggleReviewLike(reviewId, button) {
    const csrfToken = getCSRFToken();
    const icon = button.querySelector('i');

    // 更健壮的检测方法：检查是否包含 'fill' 在类名中
    const isLiked = icon.classList.contains('bi-hand-thumbs-up-fill') ||
                    icon.className.includes('hand-thumbs-up-fill');

    fetch(`/review/${reviewId}/like`, {
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
                // 用户未登录
                showNotification('请先登录后才能使用点赞功能', 'warning');
                return;
            }
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            const countSpan = button.querySelector('.like-count');

            if (data.action === 'liked') {
                // 切换到实心图标
                if (icon.classList.contains('bi-hand-thumbs-up')) {
                    icon.classList.remove('bi-hand-thumbs-up');
                }
                icon.classList.add('bi-hand-thumbs-up-fill');
                button.setAttribute('aria-label', 'Unlike this review');

                // 使用后端返回的点赞数，而不是自己计算
                if (countSpan && data.new_likes_count !== undefined) {
                    countSpan.textContent = data.new_likes_count;
                } else if (countSpan) {
                    // 如果没有返回 new_likes_count，则直接 +1
                    countSpan.textContent = parseInt(countSpan.textContent) + 1;
                }
            } else {
                // 切换到空心图标
                if (icon.classList.contains('bi-hand-thumbs-up-fill')) {
                    icon.classList.remove('bi-hand-thumbs-up-fill');
                }
                icon.classList.add('bi-hand-thumbs-up');
                button.setAttribute('aria-label', 'Like this review');

                // 使用后端返回的点赞数，而不是自己计算
                if (countSpan && data.new_likes_count !== undefined) {
                    countSpan.textContent = data.new_likes_count;
                } else if (countSpan) {
                    // 如果没有返回 new_likes_count，则直接 -1
                    const currentCount = parseInt(countSpan.textContent);
                    countSpan.textContent = Math.max(0, currentCount - 1);
                }
            }

            // 添加视觉反馈
            button.classList.add('active');
            setTimeout(() => button.classList.remove('active'), 300);

            // 宣布给屏幕阅读器
            if (typeof Accessibility !== 'undefined') {
                Accessibility.announceToScreenReader(
                    `Review ${data.action === 'liked' ? 'liked' : 'unliked'}`,
                    'polite'
                );
            }
        } else {
            if (data.requires_login) {
                showNotification('请先登录后才能使用点赞功能', 'warning');
            } else {
                showNotification(data.message || '操作失败，请重试', 'error');
            }
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('请先登录后才能使用点赞功能', 'warning');
    });
}

// Get CSRF Token
function getCSRFToken() {
    const tokenElement = document.querySelector('meta[name="csrf-token"]');
    if (tokenElement) {
        return tokenElement.getAttribute('content');
    }

    // Fallback: look for CSRF token in cookies or form
    const cookieToken = getCookie('csrf_token');
    if (cookieToken) return cookieToken;

    const formToken = document.querySelector('input[name="csrf_token"]');
    if (formToken) return formToken.value;

    console.warn('CSRF token not found');
    return '';
}

// Helper: Get Cookie Value
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

// Debounced Like Function
const debouncedLike = debounce(function(movieId, button) {
    toggleLike(movieId, button);
}, 300);

// Throttled Like Function (for high-frequency events)
const throttledLike = throttle(function(reviewId, button) {
    toggleReviewLike(reviewId, button);
}, 1000);

// Make functions available globally
window.Likes = {
    toggleLike,
    toggleWatchlist,
    toggleReviewLike,
    debouncedLike,
    throttledLike
};