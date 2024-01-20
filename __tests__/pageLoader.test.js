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

  it('should download and save a page', async () => {
    const url = 'https://example.com';
    const expectedContent = '<html>content</html>';
    const expectedPath = path.join(tempDir, 'example-com.html');

    nock(url).get('/').reply(200, expectedContent);

    const filePath = await downloadPage(url, tempDir);
    const fileContent = await fs.readFile(filePath, 'utf-8');

    expect(filePath).toBe(expectedPath);
    expect(fileContent).toBe(expectedContent);
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
