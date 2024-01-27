#!/usr/bin/env node
import axios from 'axios';
import debug from 'debug';
import cheerio from 'cheerio';
import { promises as fs } from 'fs';
import path from 'path';
import https from 'https';

const log = debug('page-loader');
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
  try {
    log(`Downloading resource from URL: ${url}`);
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      httpsAgent: url.startsWith('https') ? httpsAgent : undefined
    });
    await fs.writeFile(outputPath, response.data);
    log(`Resource saved to: ${outputPath}`);
  } catch (error) {
    throw new Error(`Error downloading resource ${url}: ${error.message}`);
  }
};

const isLocalResource = (resourceUrl, pageUrl) => {
  try {
    return new URL(resourceUrl, pageUrl).origin === new URL(pageUrl).origin;
  } catch (error) {
    log(`Invalid URL encountered: ${resourceUrl}`);
    return false;
  }
};

const downloadPage = async (url, outputDir) => {
  try {
    log(`Downloading page from URL: ${url}`);
    const response = await axios.get(url, {
      httpsAgent: url.startsWith('https') ? httpsAgent : undefined
    });
    if (response.status !== 200) {
      throw new Error(`Failed to download ${url}: server responded with status code ${response.status}`);
    }
    const $ = cheerio.load(response.data);

    const resourcesDirName = urlToDirectoryName(url);
    const resourcesDir = path.join(outputDir, resourcesDirName);
    await fs.mkdir(resourcesDir, { recursive: true });

    const resources = $('img, link[rel="stylesheet"], script[src]').map((_, element) => {
      const tagName = element.tagName.toLowerCase();
      const urlAttr = tagName === 'link' ? 'href' : 'src';
      let resourceUrl = $(element).attr(urlAttr);

      if (resourceUrl && isLocalResource(resourceUrl, url)) {
        const absoluteResourceUrl = new URL(resourceUrl, url).toString();
        const localResourcePath = path.join(resourcesDirName, urlToFileName(absoluteResourceUrl));
        $(element).attr(urlAttr, localResourcePath);
        return absoluteResourceUrl;
      }
    }).get().filter(Boolean);

    const uniqueResources = [...new Set(resources)];
    const resourcePromises = uniqueResources.map(resourceUrl => {
      log(`Downloading resource: ${resourceUrl}`);
      const resourceName = urlToFileName(resourceUrl);
      const resourcePath = path.join(resourcesDir, resourceName);
      return downloadResource(resourceUrl, resourcePath);
    });

    await Promise.all(resourcePromises);

    const htmlFileName = urlToFileName(url, '.html');
    const filePath = path.join(outputDir, htmlFileName);
    const updatedHtml = $.html();
    await fs.writeFile(filePath, updatedHtml);
    log(`Page downloaded and saved to: ${filePath}`);

    return filePath;
  } catch (error) {
    log(`Error: ${error.message}`);
    throw error;
  }
};

export default downloadPage;
