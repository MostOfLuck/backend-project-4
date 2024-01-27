import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import nock from 'nock';
import downloadPage from '../src/pageLoader.js';

describe('pageLoader', () => {
  let tempDir;

  beforeAll(() => {
    nock.disableNetConnect();
  });

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
  });

  afterEach(() => {
    nock.cleanAll();
  });

  afterAll(() => {
    nock.enableNetConnect();
  });

  it('should download and save a page with all resources', async () => {
    const url = 'https://example.com';
    const expectedHtml = `<html>
        <head>
          <link rel="stylesheet" href="/assets/application.css">
          <script src="/scripts/app.js"></script>
        </head>
        <body>
          <img src="/images/test.png">
        </body>
      </html>`;
    const expectedCssPath = path.join(tempDir, 'example-com_files', 'example.com-assets-application-css.css');
    const expectedJsPath = path.join(tempDir, 'example-com_files', 'example.com-scripts-app-js.js');
    const expectedImagePath = path.join(tempDir, 'example-com_files', 'example.com-images-test-png.png');
    const expectedHtmlPath = path.join(tempDir, 'example.com.html');

    nock(url)
      .get('/')
      .reply(200, expectedHtml)
      .get('/assets/application.css')
      .reply(200, 'fake-css-content')
      .get('/scripts/app.js')
      .reply(200, 'fake-js-content')
      .get('/images/test.png')
      .reply(200, 'fake-image-content');

    const filePath = await downloadPage(url, tempDir);
    const fileContent = await fs.readFile(filePath, 'utf-8');

    expect(filePath).toBe(expectedHtmlPath);
    expect(fileContent).toContain('example-com_files/example.com-assets-application-css.css');
    expect(fileContent).toContain('example-com_files/example.com-scripts-app-js.js');
    expect(fileContent).toContain('example-com_files/example.com-images-test-png.png');
    await expect(fs.stat(expectedCssPath)).resolves.toBeTruthy();
    await expect(fs.stat(expectedJsPath)).resolves.toBeTruthy();
    await expect(fs.stat(expectedImagePath)).resolves.toBeTruthy();
  });

  it('should handle network errors', async () => {
    const url = 'https://nonexistent.com';
    nock(url).get('/').replyWithError({ message: 'Network error', code: 'ENOTFOUND' });

    await expect(downloadPage(url, tempDir)).rejects.toThrow('Network error');
  });

  it('should handle non-200 HTTP status codes', async () => {
    const url = 'https://example.com/unavailable';
    nock('https://example.com')
      .get('/unavailable')
      .reply(404, 'Not Found');
  
    await expect(downloadPage(url, tempDir)).rejects.toThrow('Request failed with status code 404');
  });
});
