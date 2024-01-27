#!/usr/bin/env node
import axios from 'axios';
import cheerio from 'cheerio';
import { promises as fs } from 'fs';
import path from 'path';
import https from 'https';
import Listr from 'listr';
import debug from 'debug';

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
    log(`Downloading resource: ${url}`);
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      httpsAgent: url.startsWith('https') ? httpsAgent : undefined
    });
    await fs.writeFile(outputPath, response.data);
    log(`Resource saved: ${outputPath}`);
  } catch (error) {
    throw new Error(`Error downloading resource ${url}: ${error.message}`);
  }
};

const downloadPage = async (url, outputDir) => {
  try {
    log(`Downloading page: ${url}`);
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
      const src = $(element).attr('src') || $(element).attr('href');
      const resourceUrl = new URL(src, url).toString();
      const resourceName = urlToFileName(resourceUrl);
      const resourcePath = path.join(resourcesDir, resourceName);
      $(element).attr('src', path.join(resourcesDirName, resourceName));
      return { url: resourceUrl, path: resourcePath };
    }).get();

    const tasks = new Listr(resources.map(({ url, path }) => ({
      title: `Downloading ${url}`,
      task: () => downloadResource(url, path),
    })), { concurrent: true, exitOnError: false });

    await tasks.run();

    const htmlFileName = urlToFileName(url);
    const filePath = path.join(outputDir, htmlFileName);
    const updatedHtml = $.html();
    await fs.writeFile(filePath, updatedHtml);
    log(`Page downloaded and saved to: ${filePath}`);

    return filePath;
  } catch (error) {
    log(error);
    throw error;
  }
};

export default downloadPage;
