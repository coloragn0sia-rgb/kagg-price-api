const express = require('express');
const chromium = require('chrome-aws-lambda');
const puppeteer = require('puppeteer-core');
const app = express();

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('✅ Kagg Price API is running. Try /kagg-price');
});

app.get('/kagg-price', async (req, res) => {
  const url = 'https://www.kagg.jp/office-desks/okamura/344134/1229480/';
  let browser;

  try {
    const executablePath = await chromium.executablePath;
    if (!executablePath) {
      throw new Error('Chrome executable not found. This environment may not support chrome-aws-lambda.');
    }

    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath,
      headless: chromium.headless
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    const priceData = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      for (const script of scripts) {
        const text = script.textContent;
        if (text.includes('dataLayer.push')) {
          const sellingMatch = text.match(/['"]selling_price['"]\s*:\s*['"](\d+)['"]/);
          const memberMatch = text.match(/['"]member_price['"]\s*:\s*['"](\d+)['"]/);
          return {
            selling_price: sellingMatch ? sellingMatch[1] : null,
            member_price: memberMatch ? memberMatch[1] : null
          };
        }
      }
      return { selling_price: null, member_price: null };
    });

    res.json({
      selling_price: priceData.selling_price || '取得失敗',
      member_price: priceData.member_price || '取得失敗'
    });
  } catch (error) {
    res.status(500).json({ error: '取得エラー', details: error.message });
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(PORT, () => console.log(`🚀 API running on http://localhost:${PORT}/kagg-price`));