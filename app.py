from flask import (Flask, render_template, request, jsonify,
                   redirect, url_for, flash, send_from_directory)
from flask_login import (LoginManager, login_user, logout_user,
                         login_required, current_user)
from flask_wtf.csrf import CSRFProtect, generate_csrf
from sqlalchemy import func, desc
from sqlalchemy.orm import joinedload
import os
from datetime import datetime, timezone
import json

from config import config
from models import (db, User, Movie, Genre, Review, SearchHistory,
                    user_likes, user_watchlist, review_likes)
from forms import LoginForm, RegistrationForm, ReviewForm, EditProfileForm

login_manager = LoginManager()
csrf = CSRFProtect()


def create_app(config_name='default'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    db.init_app(app)
    login_manager.init_app(app)
    csrf.init_app(app)

    login_manager.login_view = 'login'
    login_manager.login_message = 'Please log in to access this page.'
    login_manager.login_message_category = 'info'
    login_manager.refresh_view = 'login'

    with app.app_context():
        db.create_all()
        if not Genre.query.first():
            load_initial_data(app)

    return app


def load_initial_data(app):
    genres = [
        'Action', 'Adventure', 'Animation', 'Comedy', 'Crime',
        'Documentary', 'Drama', 'Family', 'Fantasy', 'History',
        'Horror', 'Music', 'Mystery', 'Romance', 'Science Fiction',
        'Thriller', 'War', 'Western'
    ]

    genre_objects = {}
    for genre_name in genres:
        genre = Genre(name=genre_name)
        db.session.add(genre)
        genre_objects[genre_name] = genre

    db.session.commit()

    sample_movies_path = os.path.join(
        app.root_path,
        'data',
        'sample_movies.json')
    if os.path.exists(sample_movies_path):
        with open(sample_movies_path, 'r') as f:
            movies_data = json.load(f)
            for movie_data in movies_data:
                movie = Movie(
                    title=movie_data['title'],
                    year=movie_data['year'],
                    director=movie_data.get('director'),
                    plot=movie_data.get('plot'),
                    runtime=movie_data.get('runtime'),
                    poster_url=movie_data.get('poster_url')
                )

                for genre_name in movie_data.get('genres', []):
                    genre = genre_objects.get(genre_name)
                    if genre:
                        movie.genres.append(genre)

                db.session.add(movie)
        db.session.commit()


app = create_app()


@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))


@app.context_processor
def inject_user():
    return dict(current_user=current_user)


@app.context_processor
def inject_csrf_token():
    return dict(csrf_token=generate_csrf)


@app.context_processor
def inject_stats():
    avg_rating_subquery = db.session.query(
        func.avg(Review.rating).label('avg_rating')
    ).subquery()

    avg_rating = db.session.query(
        avg_rating_subquery.c.avg_rating
    ).scalar() or 0

    stats = {
        'total_movies': Movie.query.count(),
        'total_reviews': Review.query.count(),
        'total_users': User.query.count(),
        'average_rating': avg_rating
    }
    return dict(stats=stats)


@app.errorhandler(404)
def page_not_found(error):
    return render_template('errors/404.html'), 404


@app.errorhandler(403)
def forbidden(error):
    return render_template('errors/403.html'), 403


@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return render_template('errors/500.html'), 500


@app.route('/')
def index():
    featured_movies_subquery = db.session.query(
        Review.movie_id,
        func.avg(Review.rating).label('avg_rating'),
        func.count(Review.id).label('review_count')
    ).group_by(Review.movie_id).having(func.count(Review.id) >= 1).subquery()

    featured_movies = Movie.query \
        .options(joinedload(Movie.genres)) \
        .join(featured_movies_subquery, Movie.id
              == featured_movies_subquery.c.movie_id) \
        .order_by(desc(featured_movies_subquery.c.avg_rating)) \
        .limit(4) \
        .all()

    recent_reviews = Review.query \
        .options(
            joinedload(Review.user),
            joinedload(Review.movie),
            joinedload(Review.liked_by)
        ) \
        .order_by(desc(Review.created_at)) \
        .limit(5) \
        .all()

    for review in recent_reviews:
        review.likes_count = len(review.liked_by)
        review.is_liked_by_current = False
        if current_user.is_authenticated:
            review.is_liked_by_current = any(
                user.id == current_user.id for user in review.liked_by
            )

    return render_template('index.html',
                           featured_movies=featured_movies,
                           recent_reviews=recent_reviews)


@app.route('/movies')
def movies():
    page = request.args.get('page', 1, type=int)
    per_page = app.config['MOVIES_PER_PAGE']

    query = Movie.query.options(joinedload(Movie.genres))

    genre_id = request.args.get('genre', type=int)
    year = request.args.get('year', type=int)
    min_rating = request.args.get('min_rating', 0, type=float)
    sort = request.args.get('sort', '-year')

    if genre_id:
        query = query.join(Movie.genres).filter(Genre.id == genre_id)

    if year:
        query = query.filter(Movie.year == year)

    avg_rating_subquery = db.session.query(
        Review.movie_id,
        func.avg(Review.rating).label('avg_rating'),
        func.count(Review.id).label('review_count')
    ).group_by(Review.movie_id).subquery()

    query = query.outerjoin(avg_rating_subquery, Movie.id
                            == avg_rating_subquery.c.movie_id)

    if sort == 'title':
        query = query.order_by(Movie.title)
    elif sort == '-title':
        query = query.order_by(desc(Movie.title))
    elif sort == 'year':
        query = query.order_by(Movie.year)
    elif sort == '-year':
        query = query.order_by(desc(Movie.year))
    elif sort == '-rating':
        query = query.order_by(desc(avg_rating_subquery.c.avg_rating))
    elif sort == 'rating':
        query = query.order_by(avg_rating_subquery.c.avg_rating)

    if min_rating > 0:
        query = query.filter(avg_rating_subquery.c.avg_rating >= min_rating)

    genres = Genre.query.order_by(Genre.name).all()
    years = (db.session.query(Movie.year)
             .distinct()
             .order_by(desc(Movie.year))
             .all())
    years = [year[0] for year in years]

    movies_paginated = query.paginate(
        page=page,
        per_page=per_page,
        error_out=False
    )

    avg_rating = db.session.query(func.avg(Review.rating)).scalar() or 0

    return render_template('movies.html',
                           movies=movies_paginated,
                           genres=genres,
                           years=years,
                           total_movies=Movie.query.count(),
                           total_reviews=Review.query.count(),
                           total_genres=len(genres),
                           avg_rating=avg_rating)


@app.route('/movie/<int:movie_id>')
def movie_detail(movie_id):
    movie = Movie.query \
        .options(joinedload(Movie.genres)) \
        .get_or_404(movie_id)

    is_liked = False
    in_watchlist = False

    if current_user.is_authenticated:
        is_liked = current_user.is_liking_movie(movie)
        in_watchlist = current_user.is_watching_movie(movie)

    similar_movies = movie.get_similar_movies(limit=5)

    reviews = Review.query \
        .options(joinedload(Review.user), joinedload(Review.liked_by)) \
        .filter_by(movie_id=movie_id) \
        .order_by(desc(Review.created_at)) \
        .all()

    for review in reviews:
        review.likes_count = len(review.liked_by)
        review.is_liked_by_current = False
        if current_user.is_authenticated:
            review.is_liked_by_current = any(
                user.id == current_user.id for user in review.liked_by
            )

    form = ReviewForm()

    return render_template('movie_detail.html',
                           movie=movie,
                           reviews=reviews,
                           similar_movies=similar_movies,
                           is_liked=is_liked,
                           in_watchlist=in_watchlist,
                           form=form)


@app.route('/movie/<int:movie_id>/review', methods=['POST'])
@login_required
def add_review(movie_id):
    Movie.query.get_or_404(movie_id)
    form = ReviewForm()

    if form.validate_on_submit():
        existing_review = Review.query.filter_by(
            user_id=current_user.id,
            movie_id=movie_id
        ).first()

        if existing_review:
            flash(
                'You have already reviewed this movie.'
                ' You can edit your existing review.',
                'warning'
            )
            return redirect(url_for('movie_detail', movie_id=movie_id))

        review = Review(
            content=form.content.data,
            rating=form.rating.data,
            user_id=current_user.id,
            movie_id=movie_id
        )

        db.session.add(review)
        db.session.commit()

        flash('Your review has been added!', 'success')
    else:
        for field, errors in form.errors.items():
            for error in errors:
                flash(f'{getattr(form, field).label.text}: {error}', 'error')

    return redirect(url_for('movie_detail', movie_id=movie_id))


@app.route('/movie/<int:movie_id>/like', methods=['POST'])
@login_required
@csrf.exempt
def like_movie(movie_id):
    if not current_user.is_authenticated:
        return (
            jsonify({'success': False, 'message': 'Please login first'}),
            401
        )
    movie = Movie.query.get_or_404(movie_id)

    if not request.is_json:
        return jsonify({'success': False, 'message': 'Invalid request'}), 400

    data = request.get_json()
    action = data.get('action', 'like')

    if action == 'like':
        if not current_user.is_liking_movie(movie):
            stmt = user_likes.insert().values(
                user_id=current_user.id,
                movie_id=movie.id
            )
            db.session.execute(stmt)
            db.session.commit()

            likes_count = db.session.query(func.count(user_likes.c.user_id))\
                .filter(user_likes.c.movie_id == movie_id)\
                .scalar()

            return jsonify({
                'success': True,
                'action': 'liked',
                'new_likes_count': likes_count
            })
    else:
        if current_user.is_liking_movie(movie):
            stmt = user_likes.delete().where(
                user_likes.c.user_id == current_user.id,
                user_likes.c.movie_id == movie.id
            )
            db.session.execute(stmt)
            db.session.commit()

            likes_count = db.session.query(func.count(user_likes.c.user_id))\
                .filter(user_likes.c.movie_id == movie_id)\
                .scalar()

            return jsonify({
                'success': True,
                'action': 'unliked',
                'new_likes_count': likes_count
            })

    current_likes_count = db.session.query(func.count(user_likes.c.user_id))\
        .filter(user_likes.c.movie_id == movie_id)\
        .scalar()

    return jsonify({
        'success': False,
        'message': 'No change needed',
        'current_likes_count': current_likes_count
    })


@app.route('/movie/<int:movie_id>/watchlist', methods=['POST'])
@login_required
@csrf.exempt
def watchlist_movie(movie_id):
    if not current_user.is_authenticated:
        return (
            jsonify({'success': False, 'message': 'Please login first'}),
            401
        )
    movie = Movie.query.get_or_404(movie_id)

    if not request.is_json:
        return jsonify({'success': False, 'message': 'Invalid request'}), 400

    data = request.get_json()
    action = data.get('action', 'add')

    if action == 'add':
        if not current_user.is_watching_movie(movie):
            stmt = user_watchlist.insert().values(
                user_id=current_user.id,
                movie_id=movie.id
            )
            db.session.execute(stmt)
            db.session.commit()
            return jsonify({'success': True, 'action': 'added'})
    else:
        if current_user.is_watching_movie(movie):
            stmt = user_watchlist.delete().where(
                user_watchlist.c.user_id == current_user.id,
                user_watchlist.c.movie_id == movie.id
            )
            db.session.execute(stmt)
            db.session.commit()
            return jsonify({'success': True, 'action': 'removed'})

    return jsonify({'success': False, 'message': 'No change needed'})


@app.route('/review/<int:review_id>/like', methods=['POST'])
@login_required
@csrf.exempt
def like_review(review_id):
    if not current_user.is_authenticated:
        return (
            jsonify({'success': False, 'message': 'Please login first'}),
            401
        )
    review = Review.query.get_or_404(review_id)

    if not request.is_json:
        return jsonify({'success': False, 'message': 'Invalid request'}), 400

    data = request.get_json()
    action = data.get('action', 'like')

    is_liking = db.session.query(
        review_likes.select().where(
            review_likes.c.user_id == current_user.id,
            review_likes.c.review_id == review.id
        ).exists()
    ).scalar()

    if action == 'like' and not is_liking:
        stmt = review_likes.insert().values(
            user_id=current_user.id,
            review_id=review.id
        )
        db.session.execute(stmt)
        db.session.commit()

        review = Review.query.options(
            joinedload(Review.liked_by)
        ).get(review_id)

        return jsonify({
            'success': True,
            'action': 'liked',
            'new_likes_count': len(review.liked_by)
        })

    elif action == 'unlike' and is_liking:
        stmt = review_likes.delete().where(
            review_likes.c.user_id == current_user.id,
            review_likes.c.review_id == review.id
        )
        db.session.execute(stmt)
        db.session.commit()

        review = (Review.query
                  .options(joinedload(Review.liked_by))
                  .get(review_id))

        return jsonify({
            'success': True,
            'action': 'unliked',
            'new_likes_count': len(review.liked_by)
        })

    return jsonify({
        'success': False,
        'message': 'No change needed',
        'current_likes_count': len(review.liked_by)
    })


@app.route('/review/<int:review_id>/delete', methods=['POST'])
@login_required
@csrf.exempt
def delete_review(review_id):
    review = Review.query.get_or_404(review_id)

    if review.user_id != current_user.id and not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Permission denied'}), 403

    db.session.delete(review)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Review deleted'})


@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))

    form = LoginForm()

    if form.validate_on_submit():
        user = User.query.filter(
            (User.username == form.username.data) |
            (User.email == form.username.data)
        ).first()

        if user and user.check_password(form.password.data):
            login_user(user, remember=form.remember_me.data)
            user.last_login = datetime.now(timezone.utc)
            db.session.commit()

            flash('Logged in successfully!', 'success')

            next_page = request.args.get('next')
            return redirect(next_page or url_for('index'))
        else:
            flash('Invalid username/email or password', 'error')

    return render_template('login.html', form=form)


@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('index'))

    form = RegistrationForm()

    if form.validate_on_submit():
        user = User(
            username=form.username.data,
            email=form.email.data,
            password=form.password.data
        )

        if form.display_name.data:
            user.display_name = form.display_name.data

        db.session.add(user)
        db.session.commit()

        flash('Account created successfully! You can now log in.', 'success')
        return redirect(url_for('login'))

    return render_template('register.html', form=form)


@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('You have been logged out.', 'info')
    return redirect(url_for('index'))


@app.route('/profile')
@login_required
def profile():
    user_stats = current_user.get_stats()

    user_reviews = Review.query \
        .options(
            joinedload(Review.movie),
            joinedload(Review.liked_by)
        ) \
        .filter_by(user_id=current_user.id) \
        .order_by(desc(Review.created_at)) \
        .limit(5) \
        .all()

    for review in user_reviews:
        review.likes_count = len(review.liked_by)
        review.is_liked_by_current = False
        if current_user.is_authenticated:
            review.is_liked_by_current = any(
                user.id == current_user.id for user in review.liked_by
            )

    liked_movies = current_user.liked_movies \
        .options(joinedload(Movie.genres)) \
        .limit(10) \
        .all()

    watchlist_query = db.session.query(Movie, user_watchlist.c.added_at) \
        .join(user_watchlist, Movie.id == user_watchlist.c.movie_id) \
        .filter(user_watchlist.c.user_id == current_user.id) \
        .options(joinedload(Movie.genres)) \
        .order_by(desc(user_watchlist.c.added_at)) \
        .limit(10) \
        .all()

    watchlist_movies = []
    for movie, added_at in watchlist_query:
        movie.added_at = added_at
        watchlist_movies.append(movie)

    recommended_movies = get_recommendations(current_user)

    edit_form = EditProfileForm(original_email=current_user.email)

    return render_template('profile.html',
                           user_stats=user_stats,
                           user_reviews=user_reviews,
                           liked_movies=liked_movies,
                           watchlist_movies=watchlist_movies,
                           recommended_movies=recommended_movies,
                           edit_form=edit_form)


@app.route('/profile/edit', methods=['POST'])
@login_required
def edit_profile():
    form = EditProfileForm(original_email=current_user.email)

    if form.validate_on_submit():
        current_user.display_name = form.display_name.data or None
        current_user.email = form.email.data
        current_user.bio = form.bio.data or None

        db.session.commit()
        flash('Profile updated successfully!', 'success')
    else:
        for field, errors in form.errors.items():
            for error in errors:
                flash(f'{getattr(form, field).label.text}: {error}', 'error')

    return redirect(url_for('profile'))


def get_recommendations(user, limit=6):
    if not user.liked_movies.count():
        avg_rating_subquery = db.session.query(
            Review.movie_id,
            func.avg(Review.rating).label('avg_rating')
        ).group_by(Review.movie_id).subquery()

        return Movie.query \
            .options(joinedload(Movie.genres)) \
            .outerjoin(
                avg_rating_subquery,
                Movie.id == avg_rating_subquery.c.movie_id
            ) \
            .order_by(desc(avg_rating_subquery.c.avg_rating)) \
            .limit(limit) \
            .all()

    liked_genre_ids = db.session.query(Genre.id) \
        .join(Genre.movies) \
        .join(user_likes, Movie.id == user_likes.c.movie_id) \
        .filter(user_likes.c.user_id == user.id) \
        .distinct() \
        .all()

    liked_genre_ids = [id[0] for id in liked_genre_ids]

    recommendations = Movie.query \
        .options(joinedload(Movie.genres)) \
        .join(Movie.genres) \
        .filter(Genre.id.in_(liked_genre_ids)) \
        .filter(~Movie.liked_by.any(User.id == user.id)) \
        .group_by(Movie.id) \
        .order_by(desc(func.count(Genre.id)), desc(Movie.year)) \
        .limit(limit) \
        .all()

    return recommendations


@app.route('/search')
def search():
    query = request.args.get('q', '').strip()
    category = request.args.get('category', '')
    year_filter = request.args.get('year', '')
    min_rating = request.args.get('min_rating', 0, type=float)
    page = request.args.get('page', 1, type=int)

    results = {
        'movies': None,
        'people': None
    }
    total_results = 0
    search_time = 0

    if query:
        start_time = datetime.now()

        movie_query = Movie.query.options(joinedload(Movie.genres))

        if not category or category == 'title':
            movie_query = movie_query.filter(Movie.title.ilike(f'%{query}%'))
        elif category == 'actor':
            movie_query = movie_query.filter(Movie.cast.ilike(f'%{query}%'))
        elif category == 'director':
            movie_query = movie_query.filter(
                Movie.director.ilike(f'%{query}%')
            )
        elif category == 'genre':
            movie_query = movie_query.join(
                Movie.genres
            ).filter(
                Genre.name.ilike(f'%{query}%')
            )
        elif category == 'plot':
            movie_query = movie_query.filter(Movie.plot.ilike(f'%{query}%'))

        if year_filter:
            movie_query = movie_query.filter(Movie.year == int(year_filter))

        if min_rating > 0:
            avg_rating_subquery = db.session.query(
                Review.movie_id,
                func.avg(Review.rating).label('avg_rating')
            ).group_by(Review.movie_id).subquery()

            movie_query = movie_query.join(
                avg_rating_subquery,
                Movie.id == avg_rating_subquery.c.movie_id
            ).filter(avg_rating_subquery.c.avg_rating >= min_rating)

        movies_paginated = movie_query.paginate(
            page=page,
            per_page=10,
            error_out=False
        )
        results['movies'] = movies_paginated

        total_results = movies_paginated.total
        search_time = (datetime.now() - start_time).total_seconds()

        if current_user.is_authenticated:
            search_log = SearchHistory(
                query=query,
                user_id=current_user.id,
                results_count=total_results
            )
            db.session.add(search_log)
            db.session.commit()

    popular_searches = db.session.query(
        SearchHistory.query,
        func.count(SearchHistory.id).label('count')
    ).group_by(SearchHistory.query) \
        .order_by(desc('count')) \
        .limit(10) \
        .all()

    popular_searches = [search[0] for search in popular_searches]

    years = (db.session.query(Movie.year)
             .distinct()
             .order_by(desc(Movie.year))
             .all())
    years = [year[0] for year in years]

    suggestions = generate_search_suggestions(query)

    return render_template('search.html',
                           query=query,
                           category=category,
                           year_filter=year_filter,
                           min_rating=min_rating,
                           results=results,
                           total_results=total_results,
                           search_time=round(search_time, 2),
                           popular_searches=popular_searches,
                           years=years,
                           suggestions=suggestions,
                           total_movies=Movie.query.count())


def generate_search_suggestions(query):
    if not query or len(query) < 2:
        return []

    similar_movies = Movie.query \
        .filter(Movie.title.ilike(f'{query}%')) \
        .order_by(Movie.title) \
        .limit(5) \
        .all()

    suggestions = [movie.title for movie in similar_movies]

    similar_genres = Genre.query \
        .filter(Genre.name.ilike(f'{query}%')) \
        .limit(3) \
        .all()

    suggestions.extend([genre.name for genre in similar_genres])

    return suggestions[:8]


@app.route('/api/csrf-token')
def get_csrf_token():
    return jsonify({'csrf_token': generate_csrf()})


@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)


@app.route('/health')
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now(timezone.utc).isoformat()
    })


if __name__ == '__main__':
    app.run(debug=app.config['DEBUG'])
