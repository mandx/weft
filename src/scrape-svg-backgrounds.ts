import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';

import { AppBackground, isAppBackgroundArray } from './app-backgrounds';

function capitalize(str: string): string {
  return (str[0] || '').toUpperCase() + str.slice(1);
}

function dashCaseToTitleCase(str: string): string {
  return capitalize(
    str.replace(/-[a-z]/gi, function (match: string): string {
      return ' ' + match.slice(1).toUpperCase();
    })
  );
}

function ensureConsoleMethod(method: string): keyof Console {
  if (method === 'warning') {
    method = 'warn';
  }

  method = Object.keys(console).includes(method) ? method : 'info';
  return method as keyof Console;
}

export async function scrape(url: string = 'https://www.svgbackgrounds.com/'): Promise<void> {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);
  await page.waitForSelector('#stage .preview a.button');

  page.on('console', (message) => {
    const msgType = ensureConsoleMethod(message.type());
    Promise.all(message.args().map((handle) => handle.jsonValue())).then((args) => {
      console[msgType].call(console, '[PAGE]', ...args);
    });
  });

  const scrapedBackgrounds = await page.evaluate(() => {
    return new Promise((resolve) => {
      console.log('Starting background scraping');

      const results: AppBackground[] = [];
      const anchors = Array.from(document.querySelectorAll('#stage .preview a.button'));
      const body = document.body;

      function scrapeNextAnchor() {
        const anchor = anchors.shift() as HTMLElement | undefined;

        if (!anchor) {
          console.log('No more anchors to process, exiting...');
          resolve(results);
          return;
        }

        const backgroundName = anchor.getAttribute('href')?.replace(/^#/g, '');

        console.log('Switching background to', backgroundName);

        anchor.click();

        setTimeout(
          function (name) {
            console.log('Scraping background', name);
            results.push({
              $name: name,
              color: body.style.backgroundColor,
              image: body.style.backgroundImage,
              attachment: body.style.backgroundAttachment,
              size: body.style.backgroundSize,
              repeat: body.style.backgroundRepeat,
              position: body.style.backgroundPosition,
            });
          },
          500,
          backgroundName
        );
        setTimeout(scrapeNextAnchor, 2000);
      }

      scrapeNextAnchor();
    });
  });

  await browser.close();
  console.log('Scraping done...');

  if (isAppBackgroundArray(scrapedBackgrounds)) {
    scrapedBackgrounds.forEach((bg) => {
      bg.$name = dashCaseToTitleCase(bg.$name);
    });
    const filename = __dirname + '/svgBgs.json';
    console.log('Writting', filename);
    writeFileSync(filename, JSON.stringify(scrapedBackgrounds));
    console.log(
      'Collected:',
      scrapedBackgrounds.map((bg) => bg.$name)
    );
  } else {
    console.error('`isAppBackgroundArray` failed with:', scrapedBackgrounds);
  }
}

scrape();
