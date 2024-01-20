"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _axios = _interopRequireDefault(require("axios"));
var _fs = require("fs");
var _path = _interopRequireDefault(require("path"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
var downloadPage = function downloadPage(url, outputDir) {
  var fileName = urlToFileName(url);
  var filePath = _path["default"].join(outputDir, fileName);
  return _axios["default"].get(url).then(function (response) {
    return _fs.promises.writeFile(filePath, response.data);
  }).then(function () {
    return filePath;
  });
};
var urlToFileName = function urlToFileName(url) {
  return url.replace(/https?:\/\//, '').replace(/[^a-zA-Z0-9]/g, '-') + '.html';
};
var _default = exports["default"] = downloadPage;