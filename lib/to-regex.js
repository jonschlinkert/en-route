'use strict';

/**
 * based on https://github.com/pillarjs/path-to-regexp/ with modifications
 */

/**
 * Normalize the given path string, returning a regular expression.
 *
 * An empty array can be passed in for the keys, which will hold the
 * placeholder key descriptions. For example, using `/user/:id`, `keys` will
 * contain `[{ name: 'id', delimiter: '/', optional: false, repeat: false }]`.
 *
 * @param  {(string|RegExp|Array)} path
 * @param  {Array=}                keys
 * @param  {Object=}               options
 * @return {!RegExp}
 */

function pathToRegexp(val, keys, options) {
  return new RegExp(toRegexpSource(val, keys, options), flags(options));
}

/**
 * Create a regexp source string from the given value.
 *
 * @param {string|array|regexp} val
 * @param {array} keys
 * @param {object} options
 * @return {regexp}
 * @api public
 */

function toRegexpSource(val, keys, options) {
  if (Array.isArray(val)) {
    return arrayToRegexp(val, keys, options);
  }

  if (val instanceof RegExp) {
    return regexpToRegexp(val, keys, options);
  }

  return stringToRegexp(val, keys, options);
}

/**
 * Create a regular expression from the given string.
 *
 * @param  {string}  str
 * @param  {Array=}  keys
 * @param  {Object=} options
 * @return {!RegExp}
 */

function stringToRegexp(str, keys, options = {}) {
  let tokens = parse(str, options);
  let end = options.end !== false;
  let strict = options.strict;
  let delimiter = options.delimiter ? escapeString(options.delimiter) : '\\/';
  let delimiters = options.delimiters || './';
  let endsWith = [].concat(options.endsWith || []).map(escapeString).concat('$').join('|');
  let isEndDelimited = false;
  let route = '';

  // Iterate over the tokens and create our regexp string.
  for (let i = 0; i < tokens.length; i++) {
    let token = tokens[i];

    if (typeof token === 'string') {
      route += escapeString(token);
      isEndDelimited = i === tokens.length - 1 && delimiters.includes(token[token.length - 1]);
      continue;
    }

    let prefix = escapeString(token.prefix);
    let capture = token.repeat
      ? `(?:${token.pattern})(?:${prefix}(?:${token.pattern}))*`
      : token.pattern;

    if (keys) keys.push(token);

    if (token.optional) {
      if (token.partial) {
        route += prefix + `(${capture})?`;
      } else {
        route += `(?:${prefix}(${capture}))?`;
      }
    } else {
      route += `${prefix}(${capture})`;
    }
  }

  if (end) {
    if (!strict) route += `(?:${delimiter})?`;

    route += endsWith === '$' ? '$' : `(?=${endsWith})`;
  } else {
    if (!strict) route += `(?:${delimiter}(?=${endsWith}))?`;
    if (!isEndDelimited) route += `(?=${delimiter}|${endsWith})`;
  }

  return `^${route}`;
}

/**
 * Transform an array into a regular expression.
 *
 * @param  {!Array}  arr
 * @param  {Array=}  keys
 * @param  {Object=} options
 * @return {!RegExp}
 */

function arrayToRegexp(arr, keys, options) {
  let parts = [];
  arr.forEach(ele => parts.push(toRegexpSource(ele, keys, options)));
  return new RegExp(`(?:${parts.join('|')})`, flags(options));
}

/**
 * Create keys from match groups in the given regex
 * @param  {!RegExp} path
 * @param  {Array=}  keys
 * @return {!RegExp}
 */

function regexpToRegexp(regex, keys, options) {
  if (!Array.isArray(keys)) return regex.source;

  let groups = regex.source.match(/\((?!\?)/g);
  if (!groups) return regex.source;

  let i = 0;
  let group = () => ({
    name: i++,
    prefix: null,
    delimiter: null,
    optional: false,
    repeat: false,
    partial: false,
    pattern: null
  });

  groups.forEach(() => keys.push(group()));
  return regex.source;
}

/**
 * Parse a string for raw tokens.
 *
 * @param  {string}  str
 * @param  {Object=} options
 * @return {!Array}
 */

function parse(str, options = {}) {
  let PATH_REGEXP = /(\\.)|(?::(\w+)(?:\(((?:\\.|[^\\()])+)\))?|\(((?:\\.|[^\\()])+)\))([+*?])?/g;

  let defaultDelimiter = options.delimiter || '/';
  let delimiters = options.delimiters || './';
  let tokens = [];

  let pathEscaped = false;
  let key = 0;
  let index = 0;
  let path = '';
  let res;

  while ((res = PATH_REGEXP.exec(str))) {
    let m = res[0];
    let escaped = res[1];
    let offset = res.index;

    path += str.slice(index, offset);
    index = offset + m.length;

    // Ignore already escaped sequences.
    if (escaped) {
      path += escaped[1];
      pathEscaped = true;
      continue;
    }

    let prev = '';
    let next = str[index];
    let [,, name, capture, group, modifier] = res;

    if (!pathEscaped && path.length) {
      let k = path.length - 1;

      if (delimiters.includes(path[k])) {
        prev = path[k];
        path = path.slice(0, k);
      }
    }

    // Push the current path onto the tokens.
    if (path) {
      tokens.push(path);
      path = '';
      pathEscaped = false;
    }

    let partial = prev !== '' && next !== undefined && next !== prev;
    let repeat = modifier === '+' || modifier === '*';
    let optional = modifier === '?' || modifier === '*';
    let delimiter = prev || defaultDelimiter;

    let pattern = capture || group;
    if (pattern) {
      pattern = escapeGroup(pattern);
    } else {
      pattern = `[^${escapeString(delimiter)}]+?`;
    }

    tokens.push({
      name: name || key++,
      prefix: prev,
      delimiter,
      optional,
      repeat,
      partial,
      pattern
    });
  }

  // Push any remaining characters.
  if (path || index < str.length) {
    tokens.push(path + str.substr(index));
  }

  return tokens;
}

/**
 * Escape a regular expression string.
 *
 * @param  {string} str
 * @return {string}
 */

function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, '\\$1');
}

/**
 * Escape the capturing group by escaping special characters and meaning.
 *
 * @param  {string} group
 * @return {string}
 */

function escapeGroup(group) {
  return group.replace(/([=!:$/()])/g, '\\$1');
}

/**
 * Get the flags for a regexp from the options.
 *
 * @param  {Object} options
 * @return {string}
 */

function flags(options) {
  return options.flags || (options && options.sensitive ? '' : 'i');
}

/**
 * Expose `pathToRegexp`.
 */

module.exports = pathToRegexp;
module.exports.parse = parse;
