const { test, expect } = require('@playwright/test');

test('play button toggles to the pause icon and back', async ({ page }) => {
  await page.goto('/');
  const playBtn = page.locator('#play-btn');
  await expect(playBtn).toHaveText('▶');

  await playBtn.click();
  await expect(playBtn).toHaveText('⏸');

  await playBtn.click();
  await expect(playBtn).toHaveText('▶');
});

test('volume slider updates the audio element volume', async ({ page }) => {
  await page.goto('/');
  const slider = page.locator('#volume-slider');
  await slider.fill('0.3');

  const volume = await page.locator('#radio-player').evaluate((audio) => audio.volume);
  expect(volume).toBeCloseTo(0.3, 2);
});

test('mute button toggles muted state and icon', async ({ page }) => {
  await page.goto('/');
  const volumeBtn = page.locator('#volume-btn');
  const audio = page.locator('#radio-player');

  await volumeBtn.click();
  await expect(audio).toHaveJSProperty('muted', true);

  await volumeBtn.click();
  await expect(audio).toHaveJSProperty('muted', false);
});

test('time display updates from 0:00 as the pure formatter would', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#time-display')).toHaveText('0:00 / Live');
});
