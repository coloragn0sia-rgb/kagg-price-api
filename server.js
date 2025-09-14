const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const app = express();

// ✅ Render対応：環境変数からポート取得
const PORT = process.env.PORT || 3000;

// ✅ ルートエンドポイント追加（RenderトップURL確認用）
app.get('/', (req, res) => {
  res.send('✅ Kagg Price API is running. Try /kagg-price');
});

app.get('/kagg-price', async (req, res) => {
  const url = 'https://www.kagg.jp/office-desks/okamura/344134/1229480/';
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: false,
      slowMo: 100,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    // HTML保存（構造確認用）
    try {
      const html = await page.content();
      fs.writeFileSync('kagg.html', html);
      console.log('✅ HTML保存成功: kagg.html');
    } catch (e) {
      console.error('❌ HTML保存失敗:', e.message);
    }

    // スクリーンショット保存（描画確認用）
    try {
      await page.screenshot({ path: 'kagg.png', fullPage: true });
      console.log('✅ スクリーンショット保存成功: kagg.png');
    } catch (e) {
      console.error('❌ スクリーンショット保存失敗:', e.message);
    }

    // dataLayer.push() に含まれる価格情報を抽出
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

    console.log('🔍 抽出結果:', priceData);
    res.json({
      selling_price: priceData.selling_price || '取得失敗',
      member_price: priceData.member_price || '取得失敗'
    });
  } catch (error) {
    console.error('❌ 取得エラー:', error.message);
    res.status(500).json({ error: '取得エラー', details: error.message });
  } finally {
    if (browser) await browser.close();
  }
});

// ✅ Render環境での起動
app.listen(PORT, () => console.log(`🚀 API running on http://localhost:${PORT}/kagg-price`));