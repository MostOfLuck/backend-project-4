#!/usr/bin/env node
import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';

const downloadPage = (url, outputDir) => {
  const fileName = urlToFileName(url);
  const filePath = path.join(outputDir, fileName);

  return axios.get(url)
    .then(response => fs.writeFile(filePath, response.data))
    .then(() => filePath);
};

const urlToFileName = (url) => {
  if (typeof url !== 'string') {
    throw new Error('URL must be a string');
  }
  return url.replace(/https?:\/\//, '').replace(/[^a-zA-Z0-9]/g, '-') + '.html';
};

export default downloadPage;
