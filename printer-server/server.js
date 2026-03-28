const express = require('express');
const escpos = require('escpos');
const Network = require('escpos-network');
const cors = require('cors');
const puppeteer = require('puppeteer-core');
const { launcher } = require('chromium-edge-launcher');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const KOT_IP = process.env.KOT_PRINTER_IP || '192.168.100.150';
const BILL_IP = process.env.BILL_PRINTER_IP || '192.168.100.151';

console.log('Printer Configuration:');
console.log(' - KOT Printer IP:', KOT_IP);
console.log(' - Bill Printer IP:', BILL_IP);

const getEdgePath = () => {
    try {
        return launcher.getInstallations()[0];
    } catch (e) {
        console.warn('Could not find Edge via launcher, using default path.');
        return 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
    }
};

const printAsImage = async (htmlContent, printerIp) => {
    if (!printerIp) return Promise.reject("Printer IP not configured");

    let browser;
    try {
        browser = await puppeteer.launch({
            executablePath: getEdgePath(),
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        
        await page.setViewport({ width: 576, height: 1024 }); // 576px for 80mm paper
        
        const styledHtml = `
            <html>
                <head>
                    <style>
                        body { width: 576px; margin: 0; padding: 10px; background: white; font-family: monospace; }
                        * { box-sizing: border-box; }
                    </style>
                </head>
                <body>${htmlContent}</body>
            </html>
        `;

        await page.setContent(styledHtml, { waitUntil: 'networkidle0' });
        const height = await page.evaluate(() => document.body.scrollHeight);
        await page.setViewport({ width: 576, height: Math.ceil(height) + 20 });

        const imageBuffer = await page.screenshot({ fullPage: true });
        await browser.close();

        return new Promise((resolve, reject) => {
            const device = new Network(printerIp);
            const printer = new escpos.Printer(device);

            device.open(async (error) => {
                if (error) return reject(error);
                try {
                    const escposImage = await new Promise((res, rej) => {
                        escpos.Image.load(imageBuffer, 'image/png', (img) => img instanceof Error ? rej(img) : res(img));
                    });
                    printer.align('ct').image(escposImage).feed(3).cut().close();
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
        });
    } catch (err) {
        if (browser) await browser.close();
        throw err;
    }
};

const printKOTFallback = async (order) => {
    // This is the original fast, text-based KOT printing logic
    return new Promise((resolve, reject) => {
        if (!KOT_IP) return reject("KOT Printer IP not configured");
        const device = new Network(KOT_IP);
        const printer = new escpos.Printer(device);
        device.open((error) => {
            if (error) return reject(error);
            const now = new Date();
            const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-');
            const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
            printer.font('a').align('ct').text('KOT ( KITCHEN )').align('lt')
                   .text(`Print: ${dateStr} ${timeStr}`)
                   .text(`Order: ${order.orderNumber || 'N/A'} | Type: ${(order.orderType || 'N/A').toUpperCase()}`)
                   .text('------------------------------------------');
            order.items.forEach(item => {
                const name = (item.product_name || item.product?.name || 'Item').substring(0, 25);
                printer.text(`${item.quantity} x ${name}`);
            });
            printer.text('------------------------------------------').feed(3).cut().close();
            resolve();
        });
    });
};

const printBillFallback = async (order) => {
    // Original text-based bill printing
    return new Promise((resolve, reject) => {
        if (!BILL_IP) return reject("Bill Printer IP not configured");
        const device = new Network(BILL_IP);
        const printer = new escpos.Printer(device);
        device.open((error) => {
            if (error) return reject(error);
            printer.align('ct').size(1,1).text(`Bill - Order #${order.orderNumber || 'N/A'}`).size(0,0)
                   .text('------------------------------------------');
            order.items.forEach(item => {
                const name = (item.product_name || item.product?.name || 'Item').substring(0, 20);
                printer.text(`${item.quantity}x ${name} - ${item.price * item.quantity}`);
            });
            printer.text('------------------------------------------')
                   .align('rt').text(`Total: ${order.total || order.total_amount || 0}`)
                   .feed(3).cut().close();
            resolve();
        });
    });
};

// --- API Endpoints ---

app.post('/print/kot', async (req, res) => {
    console.log(`KOT Print Request: ${req.body.orderNumber}`);
    try {
        if (req.body.html) {
            console.log('Printing KOT as Image...');
            await printAsImage(req.body.html, KOT_IP);
        } else {
            console.log('No HTML for KOT, using Text Fallback...');
            await printKOTFallback(req.body);
        }
        res.status(200).send({ success: true, message: 'KOT printed' });
    } catch (error) {
        console.error('KOT Print Error:', error);
        try {
            console.log('KOT Image print failed, attempting text fallback...');
            await printKOTFallback(req.body);
            res.status(200).send({ success: true, message: 'KOT printed with fallback' });
        } catch (fallbackError) {
            console.error('KOT Fallback failed:', fallbackError);
            res.status(200).send({ success: false, error: fallbackError.toString() });
        }
    }
});

app.post('/print/bill', async (req, res) => {
    console.log(`Bill Print Request: ${req.body.orderNumber}`);
    try {
        if (req.body.html) {
            console.log('Printing Bill as Image...');
            await printAsImage(req.body.html, BILL_IP);
        } else {
            console.log('No HTML for Bill, using Text Fallback...');
            await printBillFallback(req.body);
        }
        res.status(200).send({ success: true, message: 'Bill printed' });
    } catch (error) {
        console.error('Bill Print Error:', error);
        try {
            console.log('Bill Image print failed, attempting text fallback...');
            await printBillFallback(req.body);
            res.status(200).send({ success: true, message: 'Bill printed with fallback' });
        } catch (fallbackError) {
            console.error('Bill Fallback failed:', fallbackError);
            res.status(200).send({ success: false, error: fallbackError.toString() });
        }
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Printer Server running on port ${PORT}`);
});
