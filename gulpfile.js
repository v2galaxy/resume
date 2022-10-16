const { src, dest, series, watch } = require('gulp');
const connect = require('gulp-connect');
const pug = require('gulp-pug');
const sass = require('gulp-sass')(require('sass'));
const cleanCSS = require('gulp-clean-css');
const rename = require('gulp-rename');
const puppeteer = require('puppeteer');
const fs = require('fs');

let port = 8080;

function serve(done) {
  connect.server({
    root: './dist',
    livereload: true,
    port
  });
  done();
}

function compileTemplate() {
  const locals = JSON.parse(fs.readFileSync('./src/data/resume.json', 'utf-8'));
  return src('./src/templates/index.pug')
    .pipe(pug({ locals }))
    .pipe(dest('dist/'))
    .pipe(connect.reload());
}

watch(['./src/templates/*.pug', './src/data/resume.json'], series(compileTemplate));

function compileStyle() {
  return src('./src/assets/styles/resume.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(cleanCSS())
    .pipe(rename('resume.min.css'))
    .pipe(dest('dist/css'))
    .pipe(connect.reload());
}

watch(['./src/assets/styles/*.scss'], series(compileStyle));

function copyStyles() {
  return src('./src/assets/styles/*.css')
    .pipe(dest('dist/css'));
}

function copyFonts() {
  return src('./src/assets/fonts/*')
    .pipe(dest('dist/fonts'));
}

function setPDFPort(done) {
  port = 8000;
  done();
}

async function generatePDF(done) {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  await page.setViewport({
    width: 1440,
    height: 900
  });

  await page.goto(`http://localhost:${port}`, { waitUntil: 'networkidle0' });

  await page.pdf({
    path: './resume.pdf',
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: false,
    margin: {
      top: 30,
      right: 40,
      bottom: 30,
      left: 40
    }
  });

  await browser.close();

  connect.serverClose();
  done();

  process.exit(0);
}

const dev = series(compileTemplate, compileStyle, copyStyles, copyFonts, serve);

exports.dev = dev;
exports.pdf = series(setPDFPort, dev, generatePDF);
