import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';

const urlToFileName = (url) => {
  const myURL = new URL(url);
  const hostname = myURL.hostname;
  const pathname = myURL.pathname.replace(/\/$/, '');
  return `${hostname}${pathname}`.replace(/[^a-zA-Z0-9]/g, '-') + '.html';
};

const downloadPage = (url, outputDir) => {
  const fileName = urlToFileName(url);
  const filePath = path.join(outputDir, fileName);

  return axios.get(url)
    .then(response => fs.writeFile(filePath, response.data))
    .then(() => filePath);
};

export default downloadPage;
