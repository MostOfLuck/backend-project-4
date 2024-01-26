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

  it('should download and save a page with images', async () => {
    const url = 'https://example.com';
    const expectedHtml = '<html><body><img src="images/test.png"></body></html>';
    const expectedImagePath = path.join(tempDir, 'ru-hexlet-io-courses_files', 'example-com-images-test.png');
    const expectedHtmlPath = path.join(tempDir, 'ru-hexlet-io-courses.html');

    nock(url)
      .get('/')
      .reply(200, expectedHtml)
      .get('/images/test.png')
      .reply(200, 'fake-image-content');

    const filePath = await downloadPage(url, tempDir);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const imageExists = await fs.stat(expectedImagePath);

    expect(filePath).toBe(expectedHtmlPath);
    expect(fileContent).toContain('ru-hexlet-io-courses_files/example-com-images-test.png');
    expect(imageExists).toBeTruthy();
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
