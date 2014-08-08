var domain = require('domain');
var path = require('path');

var gulp = require('gulp');
var gutil = require('gulp-util');
var sequence = require('run-sequence');
var source = require('vinyl-source-stream');
var merge = require('merge-stream');
var rimraf = require('gulp-rimraf');
var changed = require('gulp-changed');

var traceur = require('gulp-traceur');
var sass = require('gulp-sass');
var nodemon = require('gulp-nodemon');
var browserify = require('browserify');
var watchify = require('watchify');


var production = process.env.NODE_ENV === 'production';
var watch = false;


function forgetRequire(prefix) {
  prefix = prefix || '';
  Object.keys(require.cache).forEach(function(key) {
    if (key.indexOf(prefix) === 0) {
      delete require.cache[key];
    }
  });
}


gulp.task('clean', function() {
  return gulp.src('./dist')
    .pipe(rimraf());
});


gulp.task('css', function(done) {
  return gulp.src('./app/**/*.scss')
    .pipe(sass())
    .on('error', done)
    .pipe(gulp.dest('./dist'));
});


gulp.task('browserify', function() {
  var bundler, rebundle;

  rebundle = function() {
    return bundler.bundle()
      .on('error', function(e) {
        gutil.log('Browserify Error', e);
      })
      .pipe(source('bundle.js'))
      .pipe(gulp.dest('./dist/client'));
  };

  bundler = browserify('./dist/client/index.js', {
    debug: !production,
    cache: {},
    packageCache: {},
    fullPaths: true
  });

  // Separate watcher on dist file for browserify
  if (watch) {
    bundler = watchify(bundler);
    bundler.on('update', rebundle);
    bundler.on('log', gutil.log);
  }

  return rebundle();
});


gulp.task('jslang', function(done) {
  return gulp.src('./app/**/*.js')
    .pipe(changed('./dist'))
    .pipe(traceur({sourceMap: false}))
    .on('error', done)
    .pipe(gulp.dest('./dist'));
});


gulp.task('scripts', function(done) {
  return sequence('jslang', 'browserify', done);
});


gulp.task('app-clean', function() {
  return gulp.src([
      './dist/content-build',
      './dist/content',
      './dist/templates',
      './dist/public'])
    .pipe(rimraf());
});


gulp.task('app-copy', function() {
  var types = ['content', 'templates', 'public'];
  return merge.apply(merge, types.map(function(type) {
    var src = path.join('./app', type, '/**');
    var dest = path.join('./dist', type);
    return gulp.src(src).pipe(changed(dest)).pipe(gulp.dest(dest));
  }));
});


gulp.task('app-build', function(done) {
  var d = domain.create(); // don't crash gulp when app crashes
  d.on('error', done);

  d.run(function() {
    forgetRequire(path.resolve('./dist')); // hot reload
    require('./dist').build().then(function() {
      done();
    }).catch(function(e) {
      gutil.log('App build error', e);
      done();
    });
  });
});


gulp.task('app', function(done) {
  return sequence('app-clean', 'app-copy', 'app-build', done);
});


gulp.task('watch-app-changes', function(done) {
  return sequence('jslang', 'app', done);
});


gulp.task('watch-watchers', function(done) {
  // not starting paths with . because of issue in gaze:
  // https://github.com/shama/gaze/issues/66
  gulp.watch('app/**/*.scss', ['css']);
  gulp.watch(['app/**', '!./app/**/*.scss'], ['watch-app-changes']);
  done();
});


gulp.task('watch', function(done) {
  watch = true;
  // We first do default before we start watchers to prevent
  // watching events to fire while doing the default build
  return sequence('default', 'watch-watchers', done);
});


gulp.task('server', function() {
  nodemon({
    script: 'dist/index.js',
    env: {'PORT': process.env.PORT || 9000},
    ignore: ['app/**']
  });
});


gulp.task('default', function(done) {
  return sequence('clean', 'css', 'scripts', 'app', done);
});
