import puppeteer from 'puppeteer';

import { AppBackground, isAppBackgroundArray } from './app-backgrounds';

const logger = new console.Console({
  stdout: process.stderr,
  stderr: process.stderr,
  colorMode: 'auto',
  inspectOptions: {
    compact: false,
  },
});

async function stdoutWrite(value: string): Promise<void> {
  return new Promise((resolve, reject) => {
    process.stdout.write(value, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

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

(async function scrape(url: string = 'https://www.svgbackgrounds.com/'): Promise<void> {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);
  await page.waitForSelector('#stage .bg-btn:not(.premium)');

  page.on('console', (message) => {
    const msgType = ensureConsoleMethod(message.type());
    Promise.all(message.args().map((handle) => handle.jsonValue())).then((args) => {
      (logger[msgType] as any).call(logger, '[PAGE]', ...args);
    });
  });

  const scrapedBackgrounds = await page.evaluate(() => {
    const logger = console;
    return new Promise((resolve) => {
      logger.log('Starting background scraping');

      const results: AppBackground[] = [];
      const anchors = Array.from(document.querySelectorAll('#stage .bg-btn:not(.premium)'));
      const body = document.body;

      function scrapeNextAnchor() {
        const anchor = anchors.shift() as HTMLElement | undefined;

        if (!anchor) {
          logger.log('No more anchors to process, exiting...');
          resolve(results);
          return;
        }

        const backgroundName = anchor.getAttribute('id');

        if (!backgroundName) {
          logger.log('No "name" found for anchor', {
            id: anchor.getAttribute('id'),
            class: anchor.getAttribute('class'),
            href: anchor.getAttribute('href'),
          });
          return;
        }

        logger.log('Switching background to', backgroundName);

        anchor.click();

        setTimeout(
          function (name) {
            logger.log('Scraping background', name);

            results.push({
              $name: name,
              attachment: body.style.getPropertyValue('--BG-attachment'), // body.style.backgroundAttachment,
              color: body.style.getPropertyValue('--BG-color'), // body.style.backgroundColor,
              image: body.style.getPropertyValue('--BG-image'), // body.style.backgroundImage,
              position: body.style.getPropertyValue('--BG-position'), // body.style.backgroundPosition,
              repeat: body.style.getPropertyValue('--BG-repeat'), // body.style.backgroundRepeat,
              size: body.style.getPropertyValue('--BG-size'), // body.style.backgroundSize,
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
  logger.log('Scraping done...');

  if (isAppBackgroundArray(scrapedBackgrounds)) {
    scrapedBackgrounds.forEach((bg) => {
      bg.$name = dashCaseToTitleCase(bg.$name);
    });

    await stdoutWrite(JSON.stringify(scrapedBackgrounds) + '\n');

    logger.log(
      'Collected:',
      scrapedBackgrounds.map((bg) => bg.$name)
    );
  } else {
    logger.error('`isAppBackgroundArray` failed with:', scrapedBackgrounds);
  }
})()
  .catch((error) => {
    logger.error('Error @ scrape:', error);
    throw error;
  })
  .finally(() => process.exit());
