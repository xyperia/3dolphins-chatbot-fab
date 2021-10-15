var gulp = require('gulp');
var uglify = require('gulp-uglify');
var css = require('gulp-css');
var concat = require('gulp-concat');

gulp.task('blue', function() {
    gulp.src([
        './css/blue.css',
        './css/intlTelInput.css',
        './css/lightslider.css',
        './css/widget.css'
    ])
    .pipe(concat('blue-dolphin.css'))
    .pipe(css())
    .pipe(gulp.dest('./dist/css/'));
});
gulp.task('dark', function() {
    gulp.src([
        './css/dark.css',
        './css/intlTelInput.css',
        './css/lightslider.css',
        './css/widget.css'
    ])
    .pipe(concat('dark-dolphin.css'))
    .pipe(css())
    .pipe(gulp.dest('./dist/css/'));
});
gulp.task('green', function() {
    gulp.src([
        './css/green.css',
        './css/intlTelInput.css',
        './css/lightslider.css',
        './css/widget.css'
    ])
    .pipe(concat('green-dolphin.css'))
    .pipe(css())
    .pipe(gulp.dest('./dist/css/'));
});
gulp.task('indigo', function() {
    gulp.src([
        './css/indigo.css',
        './css/intlTelInput.css',
        './css/lightslider.css',
        './css/widget.css'
    ])
    .pipe(concat('indigo-dolphin.css'))
    .pipe(css())
    .pipe(gulp.dest('./dist/css/'));
});
gulp.task('orange', function() {
    gulp.src([
        './css/orange.css',
        './css/intlTelInput.css',
        './css/lightslider.css',
        './css/widget.css'
    ])
    .pipe(concat('orange-dolphin.css'))
    .pipe(css())
    .pipe(gulp.dest('./dist/css/'));
});
gulp.task('pink', function() {
    gulp.src([
        './css/pink.css',
        './css/intlTelInput.css',
        './css/lightslider.css',
        './css/widget.css'
    ])
    .pipe(concat('pink-dolphin.css'))
    .pipe(css())
    .pipe(gulp.dest('./dist/css/'));
});
gulp.task('purple', function() {
    gulp.src([
        './css/purple.css',
        './css/intlTelInput.css',
        './css/lightslider.css',
        './css/widget.css'
    ])
    .pipe(concat('purple-dolphin.css'))
    .pipe(css())
    .pipe(gulp.dest('./dist/css/'));
});
gulp.task('red', function() {
    gulp.src([
        './css/red.css',
        './css/intlTelInput.css',
        './css/lightslider.css',
        './css/widget.css'
    ])
    .pipe(concat('red-dolphin.css'))
    .pipe(css())
    .pipe(gulp.dest('./dist/css/'));
});
gulp.task('white', function() {
    gulp.src([
        './css/white.css',
        './css/intlTelInput.css',
        './css/lightslider.css',
        './css/widget.css'
    ])
    .pipe(concat('white-dolphin.css'))
    .pipe(css())
    .pipe(gulp.dest('./dist/css/'));
});
gulp.task('yellow', function() {
    gulp.src([
        './css/yellow.css',
        './css/intlTelInput.css',
        './css/lightslider.css',
        './css/widget.css'
    ])
    .pipe(concat('yellow-dolphin.css'))
    .pipe(css())
    .pipe(gulp.dest('./dist/css/'));
});

gulp.task('scripts', function() {
    gulp.src([
        './js/lib/**/*.js'
    ])
    .pipe(concat('lib.js'))
    .pipe(uglify())
    .pipe(gulp.dest('./dist/js'));
});

gulp.task('default',gulp.parallel("blue", "dark", "green", "indigo", "orange", "pink", "purple", "red", "white", "yellow", "scripts"));