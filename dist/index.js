"use strict";

var _commander = require("commander");
var _pageLoader = _interopRequireDefault(require("./pageLoader.js"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
_commander.program.name('page-loader').description('Page loader utility').version('1.0.0').argument('<url>', 'URL of the page to download').option('-o, --output [dir]', 'output directory', process.cwd()).action(function (url, options) {
  (0, _pageLoader["default"])(url, options.output).then(function (filePath) {
    return console.log("Page was downloaded into '".concat(filePath, "'"));
  })["catch"](function (error) {
    return console.error("Error: ".concat(error.message));
  });
});
_commander.program.parse(process.argv);