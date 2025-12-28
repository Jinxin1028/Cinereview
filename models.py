from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

# Association tables for many-to-many relationships
movie_genres = db.Table('movie_genres',
                        db.Column('movie_id', db.Integer,
                                  db.ForeignKey('movie.id'), primary_key=True),
                        db.Column('genre_id', db.Integer,
                                  db.ForeignKey('genre.id'), primary_key=True)
                        )

user_likes = db.Table('user_likes',
                      db.Column('user_id', db.Integer,
                                db.ForeignKey('user.id'), primary_key=True),
                      db.Column('movie_id', db.Integer,
                                db.ForeignKey('movie.id'), primary_key=True),
                      db.Column('liked_at', db.DateTime,
                                default=lambda: datetime.now(timezone.utc))
                      )

user_watchlist = db.Table('user_watchlist',
                          db.Column('user_id', db.Integer,
                                    db.ForeignKey('user.id'),
                                    primary_key=True),
                          db.Column('movie_id', db.Integer,
                                    db.ForeignKey('movie.id'),
                                    primary_key=True),
                          db.Column('added_at', db.DateTime,
                                    default=lambda: datetime.now(timezone.utc))
                          )

review_likes = db.Table('review_likes',
                        db.Column('user_id', db.Integer,
                                  db.ForeignKey('user.id'), primary_key=True),
                        db.Column('review_id', db.Integer,
                                  db.ForeignKey('review.id'),
                                  primary_key=True),
                        db.Column('liked_at', db.DateTime,
                                  default=lambda: datetime.now(timezone.utc))
                        )


class User(UserMixin, db.Model):
    __tablename__ = 'user'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(
        db.String(80), unique=True, nullable=False, index=True
    )
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    display_name = db.Column(db.String(100))
    bio = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))
    last_login = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)

    # Relationships
    reviews = db.relationship(
        'Review', back_populates='user', cascade='all, delete-orphan'
    )
    liked_movies = db.relationship('Movie', secondary=user_likes,
                                   back_populates='liked_by', lazy='dynamic')
    watchlist = db.relationship('Movie', secondary=user_watchlist,
                                back_populates='in_watchlists', lazy='dynamic')
    liked_reviews = db.relationship('Review', secondary=review_likes,
                                    back_populates='liked_by', lazy='select')

    def __init__(self, username, email, password):
        self.username = username
        self.email = email
        self.set_password(password)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def get_display_name(self):
        return self.display_name or self.username

    def is_liking_movie(self, movie):
        return self.liked_movies.filter(
            user_likes.c.movie_id == movie.id
        ).count() > 0

    def is_watching_movie(self, movie):
        return self.watchlist.filter(
            user_watchlist.c.movie_id == movie.id
        ).count() > 0

    def is_liking_review(self, review):
        """检查用户是否点赞了某个评论"""
        return review in self.liked_reviews

    def get_stats(self):
        return {
            'review_count': len(self.reviews),
            'like_count': self.liked_movies.count(),
            'watchlist_count': self.watchlist.count(),
            'average_rating': self.calculate_average_rating()
        }

    def calculate_average_rating(self):
        reviews = self.reviews
        if not reviews:
            return 0
        return sum(review.rating for review in reviews) / len(reviews)

    def __repr__(self):
        return f'<User {self.username}>'


class Movie(db.Model):
    __tablename__ = 'movie'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False, index=True)
    year = db.Column(db.Integer, nullable=False, index=True)
    director = db.Column(db.String(200))
    cast = db.Column(db.Text)
    plot = db.Column(db.Text)
    runtime = db.Column(db.Integer)  # in minutes
    language = db.Column(db.String(100))
    country = db.Column(db.String(100))
    poster_url = db.Column(db.String(500))
    imdb_id = db.Column(db.String(20), unique=True)
    release_date = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))

    # Relationships
    reviews = db.relationship(
        'Review', back_populates='movie', cascade='all, delete-orphan'
    )
    genres = db.relationship('Genre', secondary=movie_genres,
                             back_populates='movies')
    liked_by = db.relationship('User', secondary=user_likes,
                               back_populates='liked_movies', lazy='dynamic')
    in_watchlists = db.relationship('User', secondary=user_watchlist,
                                    back_populates='watchlist', lazy='dynamic')

    @property
    def average_rating(self):
        reviews = self.reviews
        if not reviews:
            return None
        return sum(review.rating for review in reviews) / len(reviews)

    @property
    def review_count(self):
        return len(self.reviews)

    def get_similar_movies(self, limit=5):
        """Find movies with similar genres"""
        if not self.genres:  # 修复：直接检查列表，不使用 .all()
            return []

        genre_ids = [genre.id for genre in self.genres]  # 修复：直接遍历列表

        from sqlalchemy import func
        similar = Movie.query.filter(Movie.id != self.id) \
            .join(Movie.genres) \
            .filter(Genre.id.in_(genre_ids)) \
            .group_by(Movie.id) \
            .order_by(func.count(Genre.id).desc()) \
            .limit(limit) \
            .all()

        return similar

    def __repr__(self):
        return f'<Movie {self.title} ({self.year})>'


class Genre(db.Model):
    __tablename__ = 'genre'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False, index=True)
    description = db.Column(db.Text)

    # Relationships
    movies = db.relationship('Movie', secondary=movie_genres,
                             back_populates='genres')

    def __repr__(self):
        return f'<Genre {self.name}>'


class Review(db.Model):
    __tablename__ = 'review'

    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    rating = db.Column(db.Integer, nullable=False)  # 1-5
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc), index=True)
    updated_at = db.Column(db.DateTime,
                           default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc),
                           )

    # Foreign keys
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    movie_id = db.Column(db.Integer, db.ForeignKey('movie.id'), nullable=False)

    # Relationships
    user = db.relationship('User', back_populates='reviews')
    movie = db.relationship('Movie', back_populates='reviews')
    liked_by = db.relationship('User', secondary=review_likes,
                               back_populates='liked_reviews', lazy='select')

    # Composite index for faster queries
    __table_args__ = (
        db.Index('ix_review_user_movie', 'user_id', 'movie_id'),
    )

    def likes_count(self):
        """统一的点赞数计算方法"""
        if hasattr(self, '_likes_count'):
            return self._likes_count
        return len(self.liked_by)

    def set_likes_count(self, count):
        """设置点赞数（用于查询优化）"""
        self._likes_count = count

    def is_liked_by_user(self, user):
        """检查指定用户是否点赞了这个评论"""
        if not user or not user.is_authenticated:
            return False

        # 如果已经预加载了 liked_by，直接检查
        if self.liked_by:
            return user in self.liked_by

        # 否则使用查询
        from sqlalchemy import exists
        from models import review_likes
        return db.session.query(
            exists().where(
                review_likes.c.user_id == user.id,
                review_likes.c.review_id == self.id
            )
        ).scalar()

    def __repr__(self):
        return f'<Review {self.id} by {self.user.username} ' \
               f'for {self.movie.title}>'


class SearchHistory(db.Model):
    __tablename__ = 'search_history'

    id = db.Column(db.Integer, primary_key=True)
    query = db.Column(db.String(200), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))
    results_count = db.Column(db.Integer)

    # Relationship
    user = db.relationship('User')

    __table_args__ = (
        db.Index('ix_search_history_query', 'query'),
        db.Index('ix_search_history_created_at', 'created_at'),
    )

    def __repr__(self):
        return f'<SearchHistory {self.query}>'
