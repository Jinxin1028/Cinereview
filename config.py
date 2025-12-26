import os
from datetime import timedelta


class Config:
    # Flask Configuration
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'

    # Database Configuration
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///movies.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Session Configuration
    PERMANENT_SESSION_LIFETIME = timedelta(days=7)
    SESSION_COOKIE_SECURE = False  # Set to True in production with HTTPS
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'

    # Security Configuration
    WTF_CSRF_ENABLED = True
    WTF_CSRF_SECRET_KEY = os.environ.get('CSRF_SECRET_KEY') or 'csrf-secret-key'

    # Upload Configuration
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'uploads')

    # Pagination Configuration
    MOVIES_PER_PAGE = 12
    REVIEWS_PER_PAGE = 10

    # Application Configuration
    APP_NAME = "CineReview"
    APP_VERSION = "1.0.0"

    # Recommendation Configuration
    SIMILAR_MOVIES_LIMIT = 5
    RECOMMENDATION_LIMIT = 10


class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_ECHO = False

    REMEMBER_COOKIE_DURATION = timedelta(days=30)  # 添加：记住我功能持续时间
    REMEMBER_COOKIE_REFRESH_EACH_REQUEST = True  # 添加：每次请求刷新cookie
    REMEMBER_COOKIE_SECURE = False  # 开发环境设为False，生产环境设为True
    REMEMBER_COOKIE_HTTPONLY = True
    REMEMBER_COOKIE_SAMESITE = 'Lax'

class ProductionConfig(Config):
    DEBUG = False
    SQLALCHEMY_ECHO = False
    SESSION_COOKIE_SECURE = True  # Requires HTTPS
    SQLALCHEMY_DATABASE_URI = 'sqlite:////home/Jinxin/Web_assessment_2/instance/movies.db'

class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False


# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}