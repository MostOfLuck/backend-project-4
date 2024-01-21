#!/usr/bin/env node
import axios from 'axios';
import cheerio from 'cheerio';
import { promises as fs } from 'fs';
import path from 'path';

const downloadPage = async (url, outputDir) => {
  const response = await axios.get(url);
  const $ = cheerio.load(response.data);

  const resourcesDir = path.join(outputDir, 'ru-hexlet-io-courses_files');
  await fs.mkdir(resourcesDir, { recursive: true });

  $('img').each(async (i, element) => {
    const src = $(element).attr('src');
    const resourceUrl = new URL(src, url);
    const resourceName = urlToFileName(resourceUrl.toString());
    const resourcePath = path.join(resourcesDir, resourceName);

    const response = await axios.get(resourceUrl.href, { responseType: 'arraybuffer' });
    await fs.writeFile(resourcePath, response.data);

    $(element).attr('src', path.join('ru-hexlet-io-courses_files', resourceName));
  });

  const updatedHtml = $.html();
  const filePath = path.join(outputDir, 'ru-hexlet-io-courses.html');
  await fs.writeFile(filePath, updatedHtml);

  return filePath;
};

const urlToFileName = (url) => {
  const myURL = new URL(url);
  const hostname = myURL.hostname;
  const pathname = myURL.pathname.replace(/\/$/, '');
  return `${hostname}${pathname}`.replace(/[^a-zA-Z0-9]/g, '-') + '.html';
};

export default downloadPage;

