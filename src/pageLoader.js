#!/usr/bin/env node
import axios from 'axios';
import cheerio from 'cheerio';
import { promises as fs } from 'fs';
import path from 'path';
import https from 'https';

const httpsAgent = new https.Agent({  
  rejectUnauthorized: false
});

const urlToFileName = (url, defaultExtension = '.html') => {
  const { hostname, pathname } = new URL(url);
  const sanitizedPathname = pathname.replace(/[^a-zA-Z0-9]/g, '-');
  const extension = path.extname(pathname) || defaultExtension;
  return `${hostname}${sanitizedPathname}`.replace(/--+/g, '-').replace(/^-|-$/g, '') + extension;
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

const isLocalResource = (resourceUrl, pageUrl) => {
  return new URL(resourceUrl).origin === new URL(pageUrl).origin;
};

const downloadPage = async (url, outputDir) => {
  const response = await axios.get(url, {
    httpsAgent: url.startsWith('https') ? httpsAgent : undefined
  });
  const $ = cheerio.load(response.data);

  const resourcesDirName = urlToDirectoryName(url);
  const resourcesDir = path.join(outputDir, resourcesDirName);
  await fs.mkdir(resourcesDir, { recursive: true });

  const resources = $('img, link[rel="stylesheet"], script[src]').map((_, element) => {
    const tagName = element.tagName.toLowerCase();
    const urlAttr = tagName === 'link' ? 'href' : 'src';
    const resourceUrl = $(element).attr(urlAttr);

    if (resourceUrl && isLocalResource(resourceUrl, url)) {
      const localResourcePath = path.join(resourcesDirName, urlToFileName(resourceUrl));
      $(element).attr(urlAttr, localResourcePath);
      return new URL(resourceUrl, url).toString();
    }
  }).get().filter(Boolean);

  const uniqueResources = [...new Set(resources)];
  const resourcePromises = uniqueResources.map(resourceUrl => {
    const resourceName = urlToFileName(resourceUrl);
    const resourcePath = path.join(resourcesDir, resourceName);
    return downloadResource(resourceUrl, resourcePath);
  });

  await Promise.all(resourcePromises);

  const htmlFileName = urlToFileName(url, '.html');
  const filePath = path.join(outputDir, htmlFileName);
  const updatedHtml = $.html();
  await fs.writeFile(filePath, updatedHtml);

  return filePath;
};

export default downloadPage;
