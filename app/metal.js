var Promise = require('bluebird');
var Metalsmith = require('metalsmith');
var markdown = require('metalsmith-markdown');
var templates = require('metalsmith-templates');
var permalinks = require('metalsmith-permalinks');
var collections = require('metalsmith-collections');
var branch = require('metalsmith-branch');
var path = require('path');

var POSTS_GLOB = 'posts/*';
var PAGES_GLOB = 'pages/**/*';
var PRODUCTS_GLOB = 'products/**/*';
var PROJECTS_GLOB = 'projects/**/*';


/**
 */
function description() {
  return function(files, metalsmith, done) {
    Object.keys(files).forEach(function(file) {
      var data = files[file];
      if (!data.description) {
        data.description= data.contents.toString().substr(0, 100);
      }
    });
    done();
  };
}

/**
 * @param {String} key
 * @param [String] value (if not set file is removed)
 * @return {Function}
 */
function meta(key, value) {
  return function(files, metalsmith, done) {
    Object.keys(files).forEach(function(file) {
      var data = files[file];
      if (data[key] === undefined) {
        if (value) {
          data[key] = value;
        } else {
          delete files[file];
        }
      }
    });
    done();
  };
}

/**
 */
function navigation(items) {
  return function(files, metalsmith, done) {
    Object.keys(files).forEach(function(file) {
      var data = files[file];
      data.navigation = [];

      items.forEach(function(item) {
        var states = [];

        // Make sure we have a leading slash
        if (data.path) data.path = path.join('/', data.path);

        if (item.path === '/') {
          if (!data.path) states.push('active');
        } else if ((data.path || '').indexOf(item.path) === 0) {
          states.push('active');
        }

        data.navigation.push({
          label: item.label,
          path: item.path,
          states: states
        });
      });

    });
    done();
  };
}

/**
 */
function build() {
  var basedir = path.join(__dirname);
  var options;
  var smith;

  options = {
    templates: {
      engine: 'hogan',
      default: 'page.mustache',
      // local because build process will modify partials object
      partials: {
        page: 'page',
        header: 'header'
      }
    },
    blogPostTemplate: 'post.mustache',
    navigation: [
      {label: 'Home', path: '/'},
      {label: 'Blog', path: '/blog'},
      {label: 'Projects', path: '/projects'},
      {label: 'Products', path: '/products'}
    ]
  };

  smith = new Metalsmith(basedir)
    .source('./content')
    .use(permalinks())

    .use(markdown())
    .use(collections({
      posts: {pattern: POSTS_GLOB, sortBy: 'date', reverse: true},
      projects: {pattern: PROJECTS_GLOB},
      products: {pattern: PRODUCTS_GLOB}
    }))

    // Posts specifics
    .use(branch(POSTS_GLOB)
      .use(meta('title')) // title required
      .use(meta('template', options.blogPostTemplate)) // default template
      .use(permalinks({pattern: '/blog/:title'}))
      .use(description())
    )

    // Projects specifics
    .use(branch(PROJECTS_GLOB)
      .use(meta('title')) // title required
      .use(permalinks({pattern: '/projects/:title'}))
    )

    // Products specifics
    .use(branch(PRODUCTS_GLOB)
      .use(meta('title')) // title required
      .use(permalinks({pattern: '/products/:title'}))
    )

    // Pages specifics
    .use(branch(PAGES_GLOB)
      .use(meta('title')) // title required
      .use(permalinks({pattern: ':title'}))
    )

    // Navigation
    .use(navigation(options.navigation))

    // Templating
    .use(templates(options.templates))

    // Build
    .destination('./content-build');

  return Promise.promisify(smith.build, smith)();
}

/**
 */
module.exports.build = build;

// function remember(key) {
//   return function(files, metalsmith, done) {
//     remembered[key] = remembered[key] || {};
//     Object.keys(files).forEach(function(file) {
//       // remember actual object so we can include it later
//       remembered[key][file] = files[file];
//     });
//     done();
//   };
// }

// function exclude(key) {
//   return function(files, metalsmith, done) {
//     if (remembered[key]) {
//       Object.keys(files).forEach(function(file) {
//         if (remembered[key][file]) {
//           delete files[file];
//         }
//       });
//     }
//     done();
//   };
// }

// function include(key) {
//   return function(files, metalsmith, done) {
//     if (remembered[key]) {
//       Object.keys(remembered[key]).forEach(function(file) {
//         if (!files[file]) {
//           files[file] = remembered[key][file];
//         }
//       });
//     }
//     done();
//   };
// }
