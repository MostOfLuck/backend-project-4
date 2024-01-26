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

  it('should download and save a page with all resources', async () => {
    const url = 'https://example.com';
    const expectedHtml = `
      <html>
        <head>
          <link rel="stylesheet" href="/assets/application.css">
          <script src="/scripts/app.js"></script>
        </head>
        <body>
          <img src="/images/test.png">
        </body>
      </html>
    `;
    const expectedCssPath = path.join(tempDir, 'example-com_files', 'example-com-assets-application.css');
    const expectedJsPath = path.join(tempDir, 'example-com_files', 'example-com-scripts-app.js');
    const expectedImagePath = path.join(tempDir, 'example-com_files', 'example-com-images-test.png');
    const expectedHtmlPath = path.join(tempDir, 'example-com.html');
  
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
    expect(fileContent).toContain('example-com_files/example-com-assets-application.css');
    expect(fileContent).toContain('example-com_files/example-com-scripts-app.js');
    expect(fileContent).toContain('example-com_files/example-com-images-test.png');
    expect(await fs.stat(expectedCssPath)).toBeTruthy();
    expect(await fs.stat(expectedJsPath)).toBeTruthy();
    expect(await fs.stat(expectedImagePath)).toBeTruthy();
  });
  

  it('should handle network errors', async () => {
    const url = 'https://nonexistent.com';

    nock(url).get('/').replyWithError('Network error');

    await expect(downloadPage(url, tempDir)).rejects.toThrow('Network error');
  });

  afterAll(() => {
    nock.enableNetConnect();
  });
});
