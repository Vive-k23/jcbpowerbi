const fs = require('fs');
const path = require('path');
const { minify } = require('html-minifier-terser');
const postcss = require('postcss');
const cssnano = require('cssnano');
const terser = require('terser');

// Paths
const paths = {
  html: './public/index.html', // Path to your HTML file
  css: {
    indexCss: './public/css/index.css',
    bootstrapmincss: './public/js/bootstrapmin.css', // New CSS file
  },
  js: {
    server: './src/server.js',
    embedConfig: './src/embedConfigService.js',
    authentication: './src/authentication.js',
    utils: './src/utils.js',
    bootstrapminjs: './public/js/bootstrapmin.js',
    indexjs: './public/js/index.js',
    jqueryminjs: './public/js/jquerymin.js',
    powerbimin: './public/js/powerbimin.js',
  },
  build: './build', // Output directory
};

// Ensure the build directory exists
function ensureDirectoryExists(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
    console.log(`Created directory: ${directory}`);
  }
}

// Minify HTML
function minifyHtml() {
  if (fs.existsSync(paths.html)) {
    console.log('Minifying HTML...');
    const html = fs.readFileSync(paths.html, 'utf8');
    return minify(html, {
      collapseWhitespace: true,
      removeComments: true,
      minifyCSS: true,
      minifyJS: true,
    })
      .then((minifiedHtml) => {
        const outputHtml = path.join(paths.build, 'public', 'index.html');
        ensureDirectoryExists(path.dirname(outputHtml));
        fs.writeFileSync(outputHtml, minifiedHtml);
        console.log('HTML minified successfully!');
      })
      .catch((err) => console.error(`Error during HTML minification: ${err.message}`));
  } else {
    console.error('HTML file not found at', paths.html);
  }
}

// Minify CSS
function minifyCss(cssFilePath, outputFileName, directory = '') {
  if (fs.existsSync(cssFilePath)) {
    console.log(`Minifying CSS: ${cssFilePath}`);
    const css = fs.readFileSync(cssFilePath, 'utf8');
    return postcss([cssnano])
      .process(css, { from: undefined })
      .then((result) => {
        const outputCss = path.join(paths.build, directory, outputFileName);
        ensureDirectoryExists(path.dirname(outputCss));
        fs.writeFileSync(outputCss, result.css);
        console.log(`${outputFileName} minified successfully!`);
      })
      .catch((err) => console.error(`Error during CSS minification: ${err.message}`));
  } else {
    console.error(`CSS file not found at ${cssFilePath}`);
  }
}

// Minify JavaScript
function minifyJs(jsFilePath, outputFileName, directory = '') {
  if (fs.existsSync(jsFilePath)) {
    console.log(`Minifying JavaScript: ${jsFilePath}`);
    const js = fs.readFileSync(jsFilePath, 'utf8');
    return terser
      .minify(js)
      .then((minifiedJs) => {
        const outputJs = path.join(paths.build, directory, outputFileName);
        ensureDirectoryExists(path.dirname(outputJs));
        fs.writeFileSync(outputJs, minifiedJs.code);
        console.log(`${outputFileName} minified successfully!`);
      })
      .catch((err) => console.error(`Error during minification of ${jsFilePath}: ${err.message}`));
  } else {
    console.error(`JavaScript file not found at ${jsFilePath}`);
  }
}

// Run all minification tasks
async function build() {
  console.log('Starting the build process...');
  ensureDirectoryExists(paths.build); // Ensure the build directory exists

  await Promise.all([
    minifyHtml(),
    minifyCss(paths.css.indexCss, 'index.css', 'public/css'),
    minifyCss(paths.css.bootstrapmincss, 'bootstrapmin.css', 'public/js'), // New CSS minification
    minifyJs(paths.js.server, 'server.js'),
    minifyJs(paths.js.embedConfig, 'embedConfigService.js'),
    minifyJs(paths.js.authentication, 'authentication.js'),
    minifyJs(paths.js.utils, 'utils.js'),
    minifyJs(paths.js.bootstrapminjs, 'bootstrapmin.js', 'public/js'),
    minifyJs(paths.js.indexjs, 'index.js', 'public/js'),
    minifyJs(paths.js.jqueryminjs, 'jquerymin.js', 'public/js'),
    minifyJs(paths.js.powerbimin, 'powerbimin.js', 'public/js'),
  ]);

  console.log('Build process completed!');
}

build();
