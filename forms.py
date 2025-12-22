from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, TextAreaField, IntegerField, SelectField, BooleanField
from wtforms.validators import DataRequired, Email, Length, EqualTo, ValidationError, Optional, NumberRange, Regexp
from flask_wtf.file import FileField, FileAllowed
from models import User
import re


class LoginForm(FlaskForm):
    username = StringField('Username or Email', validators=[
        DataRequired(message='Please enter your username or email'),
        Length(min=3, max=100)
    ])
    password = PasswordField('Password', validators=[
        DataRequired(message='Please enter your password'),
        Length(min=6)
    ])
    remember_me = BooleanField('Remember me')


class RegistrationForm(FlaskForm):
    username = StringField('Username', validators=[
        DataRequired(message='Please choose a username'),
        Length(min=3, max=20, message='Username must be between 3 and 20 characters'),
        Regexp('^[A-Za-z0-9_]+$', message='Username can only contain letters, numbers, and underscores')
    ])
    email = StringField('Email', validators=[
        DataRequired(message='Please enter your email address'),
        Email(message='Please enter a valid email address'),
        Length(max=120)
    ])
    password = PasswordField('Password', validators=[
        DataRequired(message='Please enter a password'),
        Length(min=8, message='Password must be at least 8 characters long')
    ])
    confirm_password = PasswordField('Confirm Password', validators=[
        DataRequired(message='Please confirm your password'),
        EqualTo('password', message='Passwords must match')
    ])
    display_name = StringField('Display Name', validators=[
        Optional(),
        Length(max=100, message='Display name cannot exceed 100 characters')
    ])
    agree_terms = BooleanField('I agree to the Terms of Service and Privacy Policy', validators=[
        DataRequired(message='You must agree to the terms and conditions')
    ])

    def validate_username(self, username):
        user = User.query.filter_by(username=username.data).first()
        if user:
            raise ValidationError('This username is already taken. Please choose a different one.')

    def validate_email(self, email):
        user = User.query.filter_by(email=email.data).first()
        if user:
            raise ValidationError('This email is already registered. Please use a different email or login.')

    def validate_password(self, password):
        # Custom password validation
        pwd = password.data
        if not re.search(r'[A-Za-z]', pwd) or not re.search(r'[0-9]', pwd):
            raise ValidationError('Password should contain both letters and numbers')


class ReviewForm(FlaskForm):
    rating = IntegerField('Rating', validators=[
        DataRequired(message='Please select a rating'),
        NumberRange(min=1, max=5, message='Rating must be between 1 and 5')
    ])
    content = TextAreaField('Review', validators=[
        DataRequired(message='Please write your review'),
        Length(min=10, max=2000, message='Review must be between 10 and 2000 characters')
    ])


class EditProfileForm(FlaskForm):
    display_name = StringField('Display Name', validators=[
        Optional(),
        Length(max=100, message='Display name cannot exceed 100 characters')
    ])
    email = StringField('Email', validators=[
        DataRequired(message='Please enter your email address'),
        Email(message='Please enter a valid email address'),
        Length(max=120)
    ])
    bio = TextAreaField('Bio', validators=[
        Optional(),
        Length(max=500, message='Bio cannot exceed 500 characters')
    ])
    avatar = FileField('Profile Picture', validators=[
        Optional(),
        FileAllowed(['jpg', 'jpeg', 'png', 'gif'], 'Images only!')
    ])

    def __init__(self, original_email, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.original_email = original_email

    def validate_email(self, email):
        if email.data != self.original_email:
            user = User.query.filter_by(email=email.data).first()
            if user:
                raise ValidationError('This email is already registered.')


class SearchForm(FlaskForm):
    q = StringField('Search', validators=[
        DataRequired(message='Please enter a search term'),
        Length(min=2, max=200, message='Search term must be between 2 and 200 characters')
    ])
    category = SelectField('Category', choices=[
        ('', 'All Categories'),
        ('title', 'Titles'),
        ('actor', 'Actors'),
        ('director', 'Directors'),
        ('genre', 'Genres'),
        ('plot', 'Descriptions')
    ], validators=[Optional()])
    year = SelectField('Year', validators=[Optional()])
    min_rating = SelectField('Minimum Rating', choices=[
        ('0', 'Any Rating'),
        ('1', '1+ Stars'),
        ('2', '2+ Stars'),
        ('3', '3+ Stars'),
        ('4', '4+ Stars'),
        ('5', '5 Stars')
    ], validators=[Optional()])


class ChangePasswordForm(FlaskForm):
    current_password = PasswordField('Current Password', validators=[
        DataRequired(message='Please enter your current password')
    ])
    new_password = PasswordField('New Password', validators=[
        DataRequired(message='Please enter a new password'),
        Length(min=8, message='Password must be at least 8 characters long')
    ])
    confirm_password = PasswordField('Confirm New Password', validators=[
        DataRequired(message='Please confirm your new password'),
        EqualTo('new_password', message='Passwords must match')
    ])


class ResetPasswordRequestForm(FlaskForm):
    email = StringField('Email', validators=[
        DataRequired(message='Please enter your email address'),
        Email(message='Please enter a valid email address')
    ])


class ResetPasswordForm(FlaskForm):
    password = PasswordField('New Password', validators=[
        DataRequired(message='Please enter a new password'),
        Length(min=8, message='Password must be at least 8 characters long')
    ])
    confirm_password = PasswordField('Confirm New Password', validators=[
        DataRequired(message='Please confirm your new password'),
        EqualTo('password', message='Passwords must match')
    ])


# Form for filtering movies
class MovieFilterForm(FlaskForm):
    genre = SelectField('Genre', validators=[Optional()])
    year = SelectField('Year', validators=[Optional()])
    min_rating = SelectField('Minimum Rating', choices=[
        ('0', 'Any Rating'),
        ('1', '1+ Stars'),
        ('2', '2+ Stars'),
        ('3', '3+ Stars'),
        ('4', '4+ Stars')
    ], validators=[Optional()])
    sort = SelectField('Sort By', choices=[
        ('title', 'Title A-Z'),
        ('-title', 'Title Z-A'),
        ('-year', 'Newest First'),
        ('year', 'Oldest First'),
        ('-rating', 'Highest Rated'),
        ('rating', 'Lowest Rated')
    ], default='-year', validators=[Optional()])