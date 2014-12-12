/* Not production mode*/
process.env.production = false;


/* Setting variables */
var pbPath = './public/',
    stPath = './static/',

    gulp   = require('gulp'),

    rimraf = require('gulp-rimraf'),
    concat = require('gulp-concat'),
    cssmin = require('gulp-cssmin'),
    rename = require('gulp-rename'),
    uglify = require('gulp-uglifyjs'),
    prefxr = require('gulp-autoprefixer'),
    jade   = require('gulp-jade');


/* Process Jade files */
gulp.task('jade', function () {
    gulp.src(stPath + '/**/*.jade')
        .pipe(jade())
        .pipe(rename({dirname: ''}))
        .pipe(gulp.dest(pbPath + 'html'))
});

/* Concat & process css files */
gulp.task('style', function () {
    gulp.src(stPath + '/**/*.css')
        .pipe(concat('app.css'))
        .pipe(prefxr())
        .pipe(cssmin())
        .pipe(gulp.dest(pbPath + 'css'))
});

/* Concat & uglify scripts for public */
gulp.task('script', function () {
    return gulp.src([
            stPath + '/**/!(app)*.js',
            stPath + '/app/app.js' ])
        .pipe(concat('app.js'))
        .pipe(uglify())
        .pipe(gulp.dest(pbPath + 'js'))
});

/* Moving images to /public */
gulp.task('move', function () {
    gulp.src(stPath + '/**/*.{jpg,png,jpeg,gif}')
        .pipe(rename({dirname: ''}))
        .pipe(gulp.dest(pbPath + 'img'));
});

/* Clear public directory */
gulp.task('clear', function () {
    return gulp.src(pbPath) // much faster
        .pipe(rimraf());
});

// Default Task
gulp.task('default', ['move', 'style', 'script', 'jade']);
