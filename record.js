const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

function injectCursor(page) {
  return page.evaluate(() => {
    const cursor = document.createElement('div');
    cursor.id = 'virtual-cursor';
    cursor.style.position = 'fixed';
    cursor.style.left = '50%';
    cursor.style.top = '25%';
    cursor.style.width = '24px';
    cursor.style.height = '24px';
    cursor.style.borderRadius = '50%';
    cursor.style.backgroundColor = 'rgba(6, 182, 212, 0.45)';
    cursor.style.border = '2px solid rgba(255, 255, 255, 0.9)';
    cursor.style.boxShadow = '0 0 15px rgba(6, 182, 212, 0.8), 0 2px 5px rgba(0,0,0,0.4)';
    cursor.style.pointerEvents = 'none';
    cursor.style.zIndex = '999999';
    cursor.style.transform = 'translate(-50%, -50%)';
    cursor.style.transition = 'transform 0.14s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.15s ease';
    document.body.appendChild(cursor);

    window.addEventListener('mousemove', (e) => {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';
    });

    window.addEventListener('mousedown', () => {
      cursor.style.transform = 'translate(-50%, -50%) scale(0.65)';
      cursor.style.backgroundColor = 'rgba(16, 185, 129, 0.7)';
    });
    window.addEventListener('mouseup', () => {
      cursor.style.transform = 'translate(-50%, -50%) scale(1)';
      cursor.style.backgroundColor = 'rgba(6, 182, 212, 0.45)';
    });
  });
}

(async () => {
  const dir = __dirname;
  const tempDir = path.join(dir, 'temp-record');
  if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(tempDir);

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const fileUrl = 'file://' + path.join(dir, 'index.html');

  // ==========================================
  // 1. DESKTOP RECORDING (1200x900)
  // ==========================================
  console.log('--- [06] Recording Desktop Version ---');
  const desktopVideoDir = path.join(tempDir, 'desktop');
  fs.mkdirSync(desktopVideoDir);

  const desktopContext = await browser.newContext({
    viewport: { width: 1200, height: 900 },
    deviceScaleFactor: 2,
    recordVideo: { dir: desktopVideoDir, size: { width: 1200, height: 900 } }
  });

  const dPage = await desktopContext.newPage();
  await dPage.goto(fileUrl, { waitUntil: 'load' });
  await dPage.waitForTimeout(600);

  // Screenshot Desktop
  await dPage.screenshot({ path: path.join(dir, 'screenshot-desktop.png') });
  console.log('Saved screenshot-desktop.png');

  await injectCursor(dPage);
  await dPage.mouse.move(600, 300);
  await dPage.waitForTimeout(400);

  // Click Git Branch Trigger to open Popover
  const branchBtn = await dPage.$('#branchTriggerBtn');
  const branchBox = await branchBtn.boundingBox();
  if (branchBox) {
    await dPage.mouse.move(branchBox.x + branchBox.width / 2, branchBox.y + branchBox.height / 2, { steps: 16 });
    await dPage.waitForTimeout(200);
    await dPage.mouse.down();
    await dPage.waitForTimeout(100);
    await dPage.mouse.up();
    await dPage.waitForTimeout(700); // Popover open
  }

  // Hover and select a branch in popover
  const branchItems = await dPage.$$('.branch-item');
  if (branchItems.length > 1) {
    const itemBox = await branchItems[1].boundingBox();
    if (itemBox) {
      await dPage.mouse.move(itemBox.x + itemBox.width / 2, itemBox.y + itemBox.height / 2, { steps: 14 });
      await dPage.waitForTimeout(300);
      await dPage.mouse.down();
      await dPage.waitForTimeout(100);
      await dPage.mouse.up();
      await dPage.waitForTimeout(600); // Branch switched!
    }
  }

  // Click Copy Email button
  const copyBtn = await dPage.$('#copyEmailBtn');
  const copyBox = await copyBtn.boundingBox();
  if (copyBox) {
    await dPage.mouse.move(copyBox.x + copyBox.width / 2, copyBox.y + copyBox.height / 2, { steps: 16 });
    await dPage.waitForTimeout(250);
    await dPage.mouse.down();
    await dPage.waitForTimeout(100);
    await dPage.mouse.up();
    await dPage.waitForTimeout(900); // Tooltip visible
  }

  // Click Theme Switcher (toggle to light)
  const themeBtn = await dPage.$('#themeToggle');
  const themeBox = await themeBtn.boundingBox();
  if (themeBox) {
    await dPage.mouse.move(themeBox.x + themeBox.width / 2, themeBox.y + themeBox.height / 2, { steps: 16 });
    await dPage.waitForTimeout(200);
    await dPage.mouse.down();
    await dPage.waitForTimeout(100);
    await dPage.mouse.up();
    await dPage.waitForTimeout(800); // White canvas
  }

  // Re-open branch popover in light mode
  if (branchBox) {
    await dPage.mouse.move(branchBox.x + branchBox.width / 2, branchBox.y + branchBox.height / 2, { steps: 14 });
    await dPage.waitForTimeout(200);
    await dPage.mouse.down();
    await dPage.waitForTimeout(100);
    await dPage.mouse.up();
    await dPage.waitForTimeout(600);
  }

  // Select main branch
  if (branchItems.length > 0) {
    const itemBox = await branchItems[0].boundingBox();
    if (itemBox) {
      await dPage.mouse.move(itemBox.x + itemBox.width / 2, itemBox.y + itemBox.height / 2, { steps: 14 });
      await dPage.waitForTimeout(250);
      await dPage.mouse.down();
      await dPage.waitForTimeout(100);
      await dPage.mouse.up();
      await dPage.waitForTimeout(500);
    }
  }

  // Toggle theme back to Dark
  if (themeBox) {
    await dPage.mouse.move(themeBox.x + themeBox.width / 2, themeBox.y + themeBox.height / 2, { steps: 14 });
    await dPage.waitForTimeout(200);
    await dPage.mouse.down();
    await dPage.waitForTimeout(100);
    await dPage.mouse.up();
    await dPage.waitForTimeout(600);
  }

  await dPage.close();
  await desktopContext.close();

  // Convert desktop video
  const dVideos = fs.readdirSync(desktopVideoDir).filter(f => f.endsWith('.webm'));
  if (dVideos.length > 0) {
    execSync(`ffmpeg -y -i "${path.join(desktopVideoDir, dVideos[0])}" -c:v libx264 -pix_fmt yuv420p -r 30 -b:v 2M "${path.join(dir, 'video-desktop.mp4')}"`);
    console.log('Saved video-desktop.mp4');
  }

  // ==========================================
  // 2. MOBILE RECORDING (390x844 iPhone View)
  // ==========================================
  console.log('--- [06] Recording Mobile Version ---');
  const mobileVideoDir = path.join(tempDir, 'mobile');
  fs.mkdirSync(mobileVideoDir);

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    recordVideo: { dir: mobileVideoDir, size: { width: 390, height: 844 } }
  });

  const mPage = await mobileContext.newPage();
  await mPage.goto(fileUrl, { waitUntil: 'load' });
  await mPage.waitForTimeout(600);

  // Screenshot Mobile
  await mPage.screenshot({ path: path.join(dir, 'screenshot-mobile.png') });
  console.log('Saved screenshot-mobile.png');

  await injectCursor(mPage);
  await mPage.mouse.move(195, 300);
  await mPage.waitForTimeout(400);

  // Tap Hamburger Menu button
  const mMenuBtn = await mPage.$('#mobileMenuBtn');
  const mBox = await mMenuBtn.boundingBox();
  if (mBox) {
    await mPage.mouse.move(mBox.x + mBox.width / 2, mBox.y + mBox.height / 2, { steps: 16 });
    await mPage.waitForTimeout(200);
    await mPage.mouse.down();
    await mPage.waitForTimeout(100);
    await mPage.mouse.up();
    await mPage.waitForTimeout(800); // Mobile sidebar sheet opened
  }

  // Tap close button in sidebar
  const closeBtn = await mPage.$('#closeSidebarBtn');
  const closeBox = closeBtn ? await closeBtn.boundingBox() : null;
  if (closeBox) {
    await mPage.mouse.move(closeBox.x + closeBox.width / 2, closeBox.y + closeBox.height / 2, { steps: 14 });
    await mPage.waitForTimeout(200);
    await mPage.mouse.down();
    await mPage.waitForTimeout(100);
    await mPage.mouse.up();
    await mPage.waitForTimeout(700); // Sidebar closed
  }

  // Tap theme toggle on mobile top bar
  const mThemeBtn = await mPage.$('#mobileThemeToggle');
  const mThemeBox = await mThemeBtn.boundingBox();
  if (mThemeBox) {
    await mPage.mouse.move(mThemeBox.x + mThemeBox.width / 2, mThemeBox.y + mThemeBox.height / 2, { steps: 16 });
    await mPage.waitForTimeout(200);
    await mPage.mouse.down();
    await mPage.waitForTimeout(100);
    await mPage.mouse.up();
    await mPage.waitForTimeout(800); // Light mode

    // Toggle theme back to Dark
    await mPage.mouse.down();
    await mPage.waitForTimeout(100);
    await mPage.mouse.up();
    await mPage.waitForTimeout(600);
  }

  await mPage.close();
  await mobileContext.close();
  await browser.close();

  // Convert mobile video
  const mVideos = fs.readdirSync(mobileVideoDir).filter(f => f.endsWith('.webm'));
  if (mVideos.length > 0) {
    execSync(`ffmpeg -y -i "${path.join(mobileVideoDir, mVideos[0])}" -c:v libx264 -pix_fmt yuv420p -r 30 -b:v 2M "${path.join(dir, 'video-mobile.mp4')}"`);
    console.log('Saved video-mobile.mp4');
  }

  // Cleanup temp files
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log('06 Desktop & Mobile assets recorded successfully!');
})();
