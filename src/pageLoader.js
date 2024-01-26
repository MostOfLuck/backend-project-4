#!/usr/bin/env node
import axios from 'axios';
import cheerio from 'cheerio';
import { promises as fs } from 'fs';
import path from 'path';
import https from 'https';

const httpsAgent = new https.Agent({  
  rejectUnauthorized: false
});

const urlToFileName = (url, defaultExtension = '') => {
  const { hostname, pathname } = new URL(url);
  const extension = path.extname(pathname) || defaultExtension;
  return `${hostname}${pathname.replace(extension, '')}`.replace(/[^a-zA-Z0-9]/g, '-') + extension;
};

const urlToDirectoryName = (url) => {
  const { hostname, pathname } = new URL(url);
  return `${hostname}${pathname.replace(/\/$/, '')}`.replace(/[^a-zA-Z0-9]/g, '-') + '_files';
};

const downloadResource = async (url, outputPath) => {
  const response = await axios.get(url, { 
    responseType: 'arraybuffer',
    httpsAgent: url.startsWith('https') ? httpsAgent : undefined
  });
  await fs.writeFile(outputPath, response.data);
};

const downloadPage = async (url, outputDir) => {
  const response = await axios.get(url, {
    httpsAgent: url.startsWith('https') ? httpsAgent : undefined
  });
  const $ = cheerio.load(response.data);

  const resourcesDirName = urlToDirectoryName(url);
  const resourcesDir = path.join(outputDir, resourcesDirName);
  await fs.mkdir(resourcesDir, { recursive: true });

  const resourcePromises = $('img').map(async (_, element) => {
    const src = $(element).attr('src');
    if (!src) {
      return;
    }

    const resourceUrl = new URL(src, url).toString();
    const resourceName = urlToFileName(resourceUrl, path.extname(src));
    const resourcePath = path.join(resourcesDir, resourceName);
    await downloadResource(resourceUrl, resourcePath);
    $(element).attr('src', path.join(resourcesDirName, resourceName));
  }).get();

  await Promise.all(resourcePromises);

  const htmlFileName = urlToFileName(url, '.html');
  const filePath = path.join(outputDir, htmlFileName);
  const updatedHtml = $.html();
  await fs.writeFile(filePath, updatedHtml);

  return filePath;
};

export default downloadPage;
