import { chromium } from '@playwright/test';

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3001');
  console.log('App Title:', await page.title());

  // 1. Check France -> Paris
  await page.getByLabel('Country', { exact: true }).selectOption('France');
  await page.getByRole('button', { name: 'Find my adventure' }).click();
  await page.waitForTimeout(1000);
  
  const eiffelCard = page.locator('.place-card').filter({ has: page.getByRole('button', { name: 'Eiffel Tower', exact: true }) });
  const eiffelImg = eiffelCard.locator('img[data-photo-status="available"]');
  console.log('Eiffel Tower visible:', await eiffelImg.isVisible());
  console.log('Eiffel Tower src:', await eiffelImg.getAttribute('src'));
  console.log('Eiffel Tower naturalWidth:', await eiffelImg.evaluate(img => img.naturalWidth));
  console.log('Eiffel Tower atmosphere labels:', await eiffelCard.locator('.atmosphere-label').count());

  const petiteCard = page.locator('.place-card').filter({ has: page.getByRole('button', { name: 'La Petite Ceinture', exact: true }) });
  const petiteImg = petiteCard.locator('img[data-photo-status="available"]');
  console.log('La Petite Ceinture visible:', await petiteImg.isVisible());
  console.log('La Petite Ceinture src:', await petiteImg.getAttribute('src'));
  console.log('La Petite Ceinture naturalWidth:', await petiteImg.evaluate(img => img.naturalWidth));
  console.log('La Petite Ceinture atmosphere labels:', await petiteCard.locator('.atmosphere-label').count());

  // 2. Check Italy -> Rome
  await page.getByLabel('Country', { exact: true }).selectOption('Italy');
  await page.getByRole('button', { name: 'Find my adventure' }).click();
  await page.waitForTimeout(1000);
  
  const colosseumCard = page.locator('.place-card').filter({ has: page.getByRole('button', { name: 'Colosseum', exact: true }) });
  const colosseumImg = colosseumCard.locator('img[data-photo-status="available"]');
  console.log('Colosseum visible:', await colosseumImg.isVisible());
  console.log('Colosseum src:', await colosseumImg.getAttribute('src'));
  console.log('Colosseum naturalWidth:', await colosseumImg.evaluate(img => img.naturalWidth));
  console.log('Colosseum atmosphere labels:', await colosseumCard.locator('.atmosphere-label').count());

  // 3. Check Japan -> Tokyo
  await page.getByLabel('Country', { exact: true }).selectOption('Japan');
  await page.getByLabel('Location', { exact: true }).fill('Tokyo');
  await page.getByLabel('Location', { exact: true }).press('ArrowDown');
  await page.getByLabel('Location', { exact: true }).press('Enter');
  await page.getByRole('button', { name: 'Find my adventure' }).click();
  await page.waitForTimeout(1000);

  const yanakaCard = page.locator('.place-card').filter({ has: page.getByRole('button', { name: 'Yanaka Ginza', exact: true }) });
  const yanakaImg = yanakaCard.locator('img[data-photo-status="available"]');
  console.log('Yanaka Ginza visible:', await yanakaImg.isVisible());
  console.log('Yanaka Ginza naturalWidth:', await yanakaImg.evaluate(img => img.naturalWidth));
  console.log('Yanaka Ginza atmosphere labels:', await yanakaCard.locator('.atmosphere-label').count());

  // Take screenshot
  await page.screenshot({ path: 'test-results/verified-landmarks.png' });
  console.log('Screenshot saved to test-results/verified-landmarks.png');

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
