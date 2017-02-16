// Include gulp
var gulp = require('gulp'),
// Include the installed plugins
    browserify = require('browserify'),
    source = require('vinyl-source-stream'),
    buffer = require('vinyl-buffer'),
    runSequence = require('run-sequence'),
    sass = require('gulp-sass'),
    gutil = require('gulp-util'),
    uglify = require('gulp-uglify'),
    autoprefixer = require('gulp-autoprefixer'),
    inject = require('gulp-inject'),
    bless = require('gulp-bless'),
    flatten = require('gulp-flatten'),
    argv = require('yargs').argv,
    gulpif = require('gulp-if'),
    ngAnnotate = require('gulp-ng-annotate'),
    colors = require('colors'),
    jshint = require('gulp-jshint'),
    stylish = require('jshint-stylish');
    connect = require('gulp-connect');

// Dir paths
var dir = {
        src: {
            src: './src/',
            sassMain: './src/scss/main.scss',
            require: './src/js/app.js',
            sass: './src/scss/',
            templates: './src/html/',
            components: './src/components/',
            componentTemplates: './src/components/*/html/'
        },
        dist: {
            dist: './dist/',
            css: './dist/css/',
            js: './dist/js/',
            blessed: './dist/css/blessed/',
            template: './dist/index.html'
        }
    },
    sassPaths = [
        './node_modules/bootstrap-sass/assets/stylesheets/',
        './node_modules/slick-carousel/slick/',
    ];

//-------------------------------------------------------
// Browserifies and minifies the JS sources
//-------------------------------------------------------
gulp.task('browserify', function () {
    return browserify(dir.src.require)
        .bundle()
        .on('error', swallowError)
        .pipe(source('app.js'))
        .pipe(gulpif(argv.production, buffer()))
        .pipe(gulpif(argv.production, ngAnnotate()))
        .pipe(gulpif(argv.production, uglify()))
        .pipe(gulp.dest(dir.dist.js));
});

//-------------------------------------------------------
// showing js errors
//-------------------------------------------------------
gulp.task('jslint', function () {
    return gulp.src([dir.src.src + '**/*.js', '!src/**/node_modules/**/*.js'])
        .pipe(jshint())
        .pipe(jshint.reporter(stylish));
});

//-------------------------------------------------------
// Compile Sass sources
//-------------------------------------------------------
gulp.task('compile', function () {
    // Components sources
    var sources = gulp.src([dir.src.components + '**/[A-Za-z0-9]*.scss'], {read: false});
    return gulp.src([dir.src.sassMain])
    // Injects all component styles into the main scss file
        .pipe(inject(sources, {
            relative: true,
            starttag: '/* inject:components */',
            endtag: '/* endinject */',
            transform: function (filepath) {
                return '@import "' + filepath + '";';
            }
        }))
        // Compiles sass
        .pipe(gulpif(argv.production,
            // If production
            sass({
                includePaths: sassPaths,
                outputStyle: 'compact'
            }),
            // else
            sass({
                includePaths: sassPaths,
                sourceComments: 'map',
                outputStyle: 'expanded'
            })
        )).on('error', swallowError)
        // Autoprefixes our stylesheet
        .pipe(autoprefixer({
            browsers: ['last 2 versions', 'ie >= 9'],
            cascade: false
        }).on('error', sass.logError))
        .pipe(gulp.dest(dir.dist.css))
});

//-------------------------------------------------------
// Blesses the main scss file in order to work with old IE browsers
//-------------------------------------------------------
gulp.task('bless', function () {
    return gulp.src([dir.dist.css + '*.css'])
        .pipe(bless({
            imports: false
        }))
        .pipe(gulp.dest(dir.dist.blessed))
});

//-------------------------------------------------------
// Injects the css into the main template
//-------------------------------------------------------
gulp.task('injectCSS', function () {
    var sources = gulp.src([dir.dist.blessed + '**/*.css'], {read: false});
    return gulp.src(dir.dist.template)
        .pipe(inject(sources, {ignorePath: 'dist/', addRootSlash: false}))
        .pipe(gulp.dest(dir.dist.dist));
});

//-------------------------------------------------------
// Injects the js into the main template
//-------------------------------------------------------
gulp.task('injectJS', function () {
    var sources = gulp.src([dir.dist.js + '*.js'], {read: false});
    return gulp.src(dir.dist.template)
        .pipe(inject(sources, {ignorePath: 'dist/', addRootSlash: false}))
        .pipe(gulp.dest(dir.dist.dist));
});

//-------------------------------------------------------
// Watch Files for changes
//-------------------------------------------------------
gulp.task('watch', function () {
    gutil.log(colors.green('\n' +
        '\t\t#######################################\n' +
        '\t\t##                                   ##\n' +
        '\t\t##  Start watching your source files ##\n' +
        '\t\t##                                   ##\n' +
        '\t\t##            Happy coding           ##\n' +
        '\t\t##                                   ##\n' +
        '\t\t#######################################\n'));
    gulp.watch([dir.src.src + '**/*.js'], ['build-js']);
    gulp.watch([dir.src.src + '**/*.scss'], ['build-sass']);
});

//-------------------------------------------------------
// Build all the files
//-------------------------------------------------------
gulp.task('build', function (callback) {
    gutil.log(colors.green('\n' +
        '\t\t#######################################\n' +
        '\t\t##                                   ##\n' +
        '\t\t##    Start building your project    ##\n' +
        '\t\t##                                   ##\n' +
        '\t\t#######################################\n'));
    runSequence(['build-sass', 'build-js'], callback)
});

//-------------------------------------------------------
// Build the scss files
//-------------------------------------------------------
gulp.task('build-sass', function (callback) {
    gutil.log(colors.green.bold('*** Building the design ***'));
    runSequence('compile', 'bless', 'injectCSS', callback)
});

//-------------------------------------------------------
// Build the js files
//-------------------------------------------------------
gulp.task('build-js', function (callback) {
    gutil.log(colors.green.bold('*** Building the JavaScript ***'));
    runSequence('jslint', 'browserify', 'injectJS', callback)
});

//-------------------------------------------------------
// Font Awesome
//-------------------------------------------------------
gulp.task('fonts', function() {
    return gulp.src([
                    'node_modules/font-awesome/fonts/fontawesome-webfont.*'])
            .pipe(gulp.dest('dist/fonts/'));
});


//-------------------------------------------------------
// Default and help task
//-------------------------------------------------------
gulp.task('default', listCommand);
gulp.task('help', listCommand);

gulp.task('webserver', function() {
    connect.server({
        port:8000,
        livereload: true,
    });
});

//-------------------------------------------------------
// Functions
//-------------------------------------------------------
function listCommand() {
    gutil.log(
        colors.red.bold('\n Please use one of the available commands: \n') +
        colors.green('\t   - "watch": run <gulp watch> to watch the design, JS and templates of your project \n') +
        colors.green('\t   - "build": run <gulp build> to build the design JS and templates of your project. For minified files, use the `--production` option. \n') +
        colors.green('\t   - "build-sass": run <gulp build-sass> to build the design of your project. For minified files, use the `--production` option. \n') +
        colors.green('\t   - "build-js": run <gulp build-js> to build the JS of your project (compile, bless and CSS+JS injection into main template). For minified files, use the `--production` option. \n') +
        colors.green('\t   - "help": run <gulp help> to see the available commands \n')
    );
}

function swallowError(error) {
    console.log(colors.red(error.toString()));
    this.emit('end');
}