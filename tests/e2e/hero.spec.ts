import {test,expect} from '@playwright/test';
test('hero crossfades above an opaque background and never obscures or remounts the heading',async({page})=>{
 await page.goto('/');const heading=page.getByRole('heading',{name:'Your next somewhere.'});await expect(heading).toBeVisible();
 await page.evaluate(()=>document.fonts.ready.then(()=>undefined));const before=await heading.boundingBox();await heading.evaluate(el=>{el.setAttribute('data-original-heading','true');});
 await page.waitForFunction(()=>Boolean(document.querySelector('.hero-slide[data-incoming="true"]')),{},{timeout:12000});
 expect(await page.locator('.hero-slide[data-active="true"]').evaluate(el=>getComputedStyle(el).opacity)).toBe('1');
 const layers=await page.evaluate(()=>({images:Number(getComputedStyle(document.querySelector('.hero-slides')!).zIndex),text:Number(getComputedStyle(document.querySelector('.hero-copy')!).zIndex),opacity:getComputedStyle(document.querySelector('.hero-copy')!).opacity}));expect(layers.text).toBeGreaterThan(layers.images);expect(layers.opacity).toBe('1');
 await expect(page.locator('.hero-slide-counter')).toContainText('02',{timeout:5000});await expect(heading).toHaveAttribute('data-original-heading','true');await expect(heading).toBeVisible();expect(await heading.boundingBox()).toEqual(before);
 await expect(page.locator('.hero-slide-counter')).toContainText('03',{timeout:12000});await expect(heading).toHaveAttribute('data-original-heading','true');await expect(heading).toBeVisible();
 await page.getByRole('button',{name:'Pause destination slideshow'}).click();await expect(page.getByRole('button',{name:'Play destination slideshow'})).toBeVisible();
});
test('reduced motion disables automatic header changes',async({page})=>{await page.emulateMedia({reducedMotion:'reduce'});await page.clock.install();await page.goto('/');await page.clock.fastForward(25000);await expect(page.locator('.hero-slide-counter')).toContainText('01');await expect(page.locator('.hero-slide[data-incoming="true"]')).toHaveCount(0);await expect(page.getByRole('heading',{name:'Your next somewhere.'})).toBeVisible();});
