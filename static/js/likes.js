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

    // 更准确的检测方法
    const isLiked = icon.classList.contains('bi-hand-thumbs-up-fill') ||
                    icon.classList.contains('fas') ||
                    button.classList.contains('active');

    // 如果没有获取到CSRF令牌，显示更明确的错误
    if (!csrfToken || csrfToken.trim() === '') {
        showNotification('无法验证请求，请刷新页面后重试', 'error');
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
        credentials: 'same-origin',  // 确保发送cookies
        body: JSON.stringify({
            action: isLiked ? 'unlike' : 'like'
        })
    })
    .then(response => {
        // 检查响应状态
        if (response.status === 401) {
            // 未登录，可能是session过期
            showNotification('登录已过期，请重新登录', 'warning');
            // 可选：重定向到登录页面
            setTimeout(() => {
                window.location.href = '/login?next=' + encodeURIComponent(window.location.pathname);
            }, 1500);
            return null;
        } else if (response.status === 403) {
            // CSRF验证失败
            showNotification('安全验证失败，请刷新页面后重试', 'error');
            return null;
        } else if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (!data) return; // 之前已经处理过错误

        if (data.success) {
            const countSpan = button.querySelector('.like-count');

            if (data.action === 'liked') {
                // 切换到实心图标
                icon.classList.remove('bi-hand-thumbs-up');
                icon.classList.add('bi-hand-thumbs-up-fill');
                button.setAttribute('aria-label', 'Unlike this review');

                // 更新计数
                if (countSpan && data.new_likes_count !== undefined) {
                    countSpan.textContent = data.new_likes_count;
                } else if (countSpan) {
                    countSpan.textContent = parseInt(countSpan.textContent) + 1;
                }

                showNotification('已点赞评论', 'success');
            } else {
                // 切换到空心图标
                icon.classList.remove('bi-hand-thumbs-up-fill');
                icon.classList.add('bi-hand-thumbs-up');
                button.setAttribute('aria-label', 'Like this review');

                // 更新计数
                if (countSpan && data.new_likes_count !== undefined) {
                    countSpan.textContent = data.new_likes_count;
                } else if (countSpan) {
                    const currentCount = parseInt(countSpan.textContent);
                    countSpan.textContent = Math.max(0, currentCount - 1);
                }

                showNotification('已取消点赞', 'info');
            }

            // 视觉反馈
            button.classList.add('active');
            setTimeout(() => button.classList.remove('active'), 300);

            // 屏幕阅读器提示
            if (typeof Accessibility !== 'undefined') {
                Accessibility.announceToScreenReader(
                    `评论${data.action === 'liked' ? '已点赞' : '已取消点赞'}`,
                    'polite'
                );
            }
        } else {
            // 处理服务器返回的错误
            if (data.message) {
                showNotification(data.message, 'error');
            } else if (data.requires_login) {
                showNotification('请先登录后才能点赞', 'warning');
            } else {
                showNotification('操作失败，请稍后重试', 'error');
            }
        }
    })
    .catch(error => {
        console.error('点赞请求失败:', error);
        showNotification('网络错误，请检查连接后重试', 'error');
    });
}

// Get CSRF Token
function getCSRFToken() {
    // 1. 首先从meta标签获取
    const metaToken = document.querySelector('meta[name="csrf-token"]');
    if (metaToken) {
        const token = metaToken.getAttribute('content');
        if (token && token.length > 0) {
            return token;
        }
    }

    // 2. 从隐藏的表单字段获取
    const formToken = document.querySelector('input[name="csrf_token"]');
    if (formToken && formToken.value) {
        return formToken.value;
    }

    // 3. 从Flask-WTF的表单中获取
    const csrfInput = document.querySelector('input[name="csrf_token"]');
    if (csrfInput) {
        return csrfInput.value;
    }

    // 4. 尝试从cookie获取（备用方案）
    const cookieToken = getCookie('csrf_token');
    if (cookieToken) {
        return cookieToken;
    }

    // 5. 如果还是找不到，发起API请求获取
    console.warn('CSRF token not found in page, fetching from API...');
    fetch('/api/csrf-token')
        .then(response => response.json())
        .then(data => {
            if (data.csrf_token) {
                // 更新页面的meta标签供后续使用
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