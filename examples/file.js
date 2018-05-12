'use strict';

const path = require('path');
const util = require('util');
const assert = require('assert');

/**
 * Create a new `File` with the given object. A File is a virtual file object.
 *
 * ```js
 * new File({ path: 'path/to/file.hbs' });
 * new File({ path: 'path/to/file.hbs', contents: Buffer.from('...') });
 * ```
 * @name File
 * @param {Object} `file`
 * @api public
 */

class File {
  constructor(file = {}) {
    this.history = [];
    this.contents = file.contents || null;
    this.cwd = file.cwd || process.cwd();
    this.base = file.base || this.cwd;
    this.stat = file.stat || null;
    if (file.path) this.path = file.path;
    for (const key in file) {
      if (!File.isBuiltIn(key)) {
        this[key] = file[key];
      }
    }
  }

  [util.inspect.custom]() {
    let inspect = [`"${this.path[0] === '/' ? this.path : this.relative || ''}"`];
    if (this.isBuffer()) inspect.push(this.contents.inspect());
    if (this.isStream()) inspect.push(inspectStream(this.contents));
    return `<File ${inspect.join(' ')}>`;
  }

  isNull() {
    return this.contents === null;
  }

  isBuffer() {
    const val = this.contents;
    return isObject(val) && val.constructor
      && typeof val.constructor.isBuffer === 'function'
      && val.constructor.isBuffer(val);
  }

  isStream() {
    return isObject(this.contents) && typeof this.contents.pipe === 'function';
  }

  isDirectory() {
    if (!this.isNull()) {
      return false;
    }
    if (this.stat && typeof this.stat.isDirectory === 'function') {
      return this.stat.isDirectory();
    }
    return false;
  }

  isSymbolicLink() {
    if (!this.isNull()) {
      return false;
    }
    if (this.stat && typeof this.stat.isSymbolicLink === 'function') {
      return this.stat.isSymbolicLink();
    }
    return false;
  }

  isAbsolute() {
    return path.isAbsolute(this.path);
  }

  /**
   * file.cwd
   */

  set cwd(val) {
    this._cwd = val;
  }
  get cwd() {
    return path.resolve(this._cwd);
  }

  /**
   * file.base
   */

  set base(base) {
    this._base = base;
  }
  get base() {
    return this._base ? path.resolve(this._base) : this.cwd;
  }

  /**
   * file.path
   */

  set path(filepath) {
    assert.equal(typeof filepath, 'string', 'expected file.path to be a string');
    if (filepath !== '' && filepath !== this.path) {
      this.history.push(path.normalize(filepath));
    }
  }
  get path() {
    return this.history[this.history.length - 1];
  }

  /**
   * file.absolute
   */

  get absolute() {
    return path.resolve(this.path);
  }

  /**
   * file.relative
   */

  get relative() {
    return path.relative(this.base, this.path);
  }

  /**
   * file.dirname
   */

  set dirname(dirname) {
    this.path = path.join(dirname, this.basename);
  }
  get dirname() {
    return path.dirname(this.path);
  }

  /**
   * file.folder
   */

  set folder(folder) {
    this.path = path.join(path.dirname(this.dirname), folder, this.basename);
  }
  get folder() {
    return path.basename(this.dirname);
  }

  /**
   * file.basename
   */

  set basename(basename) {
    this.path = path.join(this.dirname, basename);
  }
  get basename() {
    return path.basename(this.path);
  }

  /**
   * file.stem
   */

  set stem(stem) {
    this.basename = stem + this.extname;
  }
  get stem() {
    return path.basename(this.path, this.extname);
  }

  /**
   * file.extname
   */

  set extname(extname) {
    this.basename = this.stem + extname;
  }
  get extname() {
    return path.extname(this.path);
  }

  static isFile(file) {
    return utils.isObject(file) && file._isVinyl === true;
  }
  static isVinyl(file) {
    return this.isFile(file);
  }
  static isBuiltIn(key) {
    return this.builtins.includes(key);
  }
  static get builtins() {
    return [
      '_base',
      '_contents',
      '_cwd',
      '_isVinyl',
      '_symlink',
      'absolute',
      'base',
      'constructor',
      'contents',
      'cwd',
      'history',
      'isBuffer',
      'isDirectory',
      'isNull',
      'isStream',
      'isSymbolic',
      'isSymbolicLink',
      'path',
      'relative'
    ];
  }
}

function isObject(val) {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

function inspectStream(stream) {
  return '<' + stream.constructor.name.replace('Stream', '') + 'Stream>';
}

module.exports = File;

// const file = new File({ path: __filename, cwd: __dirname });
// // const file = new File({ path: '/foo/bar/baz/qux/fez.js' });
// console.log(file.folder); //=> 'qux'
// file.folder = 'blah';
// console.log(file.path); //=> '/foo/bar/baz/blah/fez.js'
// console.log(file.folder); //=> 'blah'
// // file.base = process.cwd();
// // file.path = 'index.js';
// // file.contents = Buffer.from('foo bar baz');
// // console.log(File.builtins)
