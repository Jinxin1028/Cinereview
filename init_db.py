import os

from app import app, db
from models import User, Movie, Genre, Review
import json


# Main database initialization function
def init_database():
    print("Initializing database...")

    with app.app_context():
        db.drop_all()
        db.create_all()
        print("✓ Tables created")

        load_genres()
        load_sample_movies()
        create_admin_user()
        create_sample_reviews()

        print("\n✓ Database initialized successfully!")
        print(f"Database file: {app.config['SQLALCHEMY_DATABASE_URI']}")


# Load movie genres into database
def load_genres():
    genres = [
        'Action', 'Adventure', 'Animation', 'Comedy', 'Crime',
        'Documentary', 'Drama', 'Family', 'Fantasy', 'History',
        'Horror', 'Music', 'Mystery', 'Romance', 'Science Fiction',
        'Thriller', 'War', 'Western'
    ]

    for genre_name in genres:
        genre = Genre(name=genre_name)
        db.session.add(genre)

    db.session.commit()
    print(f"✓ Loaded {len(genres)} genres")


# Load sample movies from JSON file
def load_sample_movies():
    sample_movies_path = os.path.join(
        app.root_path,
        'data',
        'sample_movies.json'
    )

    if not os.path.exists(sample_movies_path):
        print("✗ Sample movies file not found. Creating basic sample...")
        create_basic_sample_movies()
        return

    try:
        with open(sample_movies_path, 'r') as f:
            movies_data = json.load(f)

        genres = {genre.name: genre for genre in Genre.query.all()}

        for movie_data in movies_data:
            movie = Movie(
                title=movie_data['title'],
                year=movie_data['year'],
                director=movie_data.get('director', 'Unknown'),
                plot=movie_data.get('plot', 'No description available.'),
                runtime=movie_data.get('runtime', 120),
                language=movie_data.get('language', 'English'),
                country=movie_data.get('country', 'USA'),
                poster_url=movie_data.get('poster_url'),
                imdb_id=movie_data.get('imdb_id')
            )

            movie_genres = movie_data.get('genres', [])
            for genre_name in movie_genres:
                if genre_name in genres:
                    movie.genres.append(genres[genre_name])

            db.session.add(movie)

        db.session.commit()
        print(f"✓ Loaded {len(movies_data)} sample movies")

    except Exception as e:
        print(f"✗ Error loading sample movies: {e}")
        create_basic_sample_movies()


# Create basic sample movies if JSON file is unavailable
def create_basic_sample_movies():
    genres = {genre.name: genre for genre in Genre.query.all()}

    sample_movies = [
        {
            'title': 'The Shawshank Redemption',
            'year': 1994,
            'director': 'Frank Darabont',
            'plot': (
                'Two imprisoned men bond over a number of years, '
                'finding solace and eventual redemption '
                'through acts of common decency.'
            ),
            'runtime': 142,
            'genres': ['Drama']
        },
        {
            'title': 'The Godfather',
            'year': 1972,
            'director': 'Francis Ford Coppola',
            'plot': (
                'The aging patriarch of an organized crime dynasty '
                'transfers control of his clandestine empire '
                'to his reluctant son.'
            ),
            'runtime': 175,
            'genres': ['Crime', 'Drama']
        },
        {
            'title': 'The Dark Knight',
            'year': 2008,
            'director': 'Christopher Nolan',
            'plot': (
                'When the menace known as the Joker wreaks havoc '
                'and chaos on the people of Gotham, Batman must accept '
                'one of the greatest psychological and physical tests '
                'of his ability to fight injustice.'
            ),
            'runtime': 152,
            'genres': ['Action', 'Crime', 'Drama']
        },
        {
            'title': 'Pulp Fiction',
            'year': 1994,
            'director': 'Quentin Tarantino',
            'plot': (
                'The lives of two mob hitmen, a boxer, '
                'a gangster and his wife intertwine in '
                'four tales of violence and redemption.'
            ),
            'runtime': 154,
            'genres': ['Crime', 'Drama']
        }
    ]

    for movie_data in sample_movies:
        movie = Movie(
            title=movie_data['title'],
            year=movie_data['year'],
            director=movie_data['director'],
            plot=movie_data['plot'],
            runtime=movie_data['runtime']
        )

        for genre_name in movie_data['genres']:
            if genre_name in genres:
                movie.genres.append(genres[genre_name])

        db.session.add(movie)

    db.session.commit()
    print(f"✓ Created {len(sample_movies)} basic sample movies")


# Create admin user for testing
def create_admin_user():
    admin = User(
        username='admin',
        email='admin@cinereview.com',
        password='admin123'
    )
    admin.display_name = 'Administrator'

    db.session.add(admin)
    db.session.commit()
    print("✓ Created admin user (username: admin, password: admin123)")


# Create sample reviews
def create_sample_reviews():

    test_user = User(
        username='testuser',
        email='test@example.com',
        password='password123'
    )
    db.session.add(test_user)
    db.session.commit()

    movies = Movie.query.limit(3).all()

    sample_reviews = [
        {

            'content': (
                'An absolute masterpiece! The storytelling '
                'and character development are exceptional.'
            ),
            'rating': 5
        },
        {
            'content': (
                'Good movie with great performances, but '
                'the pacing was a bit slow in the middle.'
            ),
            'rating': 4
        },
        {
            'content': (
                'Entertaining but predictable. The visual '
                'effects were impressive though.'
            ),
            'rating': 3
        }
    ]

    for i, movie in enumerate(movies):
        if i < len(sample_reviews):
            review = Review(
                content=sample_reviews[i]['content'],
                rating=sample_reviews[i]['rating'],
                user_id=test_user.id,
                movie_id=movie.id
            )
            db.session.add(review)

    db.session.commit()
    print("✓ Created sample reviews")


# Check database status
def check_database():
    with app.app_context():
        print("\nDatabase Status:")
        print(f"Users: {User.query.count()}")
        print(f"Movies: {Movie.query.count()}")
        print(f"Genres: {Genre.query.count()}")
        print(f"Reviews: {Review.query.count()}")

        print("\nAvailable Genres:")
        genres = Genre.query.order_by(Genre.name).all()
        for genre in genres:
            print(f"  - {genre.name}")


# Script entry point
if __name__ == '__main__':
    init_database()
    check_database()
