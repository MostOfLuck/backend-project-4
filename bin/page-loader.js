#!/usr/bin/env node
import { program } from 'commander';
import downloadPage from '../src/pageLoader.js';

program
  .name('page-loader')
  .description('Page loader utility')
  .version('1.0.0')
  .option('-o, --output [dir]', 'output directory', process.cwd())
  .action((url, options) => {
    downloadPage(url, options.output)
      .then(filePath => console.log(`Page was downloaded into '${filePath}'`))
      .catch(error => console.error(`Error: ${error.message}`));
  });

program.parse(process.argv);
