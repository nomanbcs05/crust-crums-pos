const express = require('express');
const escpos = require('escpos');
const Network = require('escpos-network');
const cors = require('cors');
const puppeteer = require('puppeteer-core');
const { launcher } = require('chromium-edge-launcher');
const Jimp = require('jimp');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const KOT_IP = process.env.KOT_PRINTER_IP;
const BILL_IP = process.env.BILL_PRINTER_IP;

// Utility to get Edge path
const getEdgePath = () => {
    try {
        return launcher.getInstallations()[0];
    } catch (e) {
        return 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
    }
};

const printKOT = async (order) => {
    return new Promise((resolve, reject) => {
        if (!KOT_IP) return reject("KOT Printer IP not configured");
        
        try {
            const device = new Network(KOT_IP);
            const printer = new escpos.Printer(device);

            device.open((error) => {
                if (error) return reject(error);

                const now = new Date();
                const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-');
                const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

                printer
                    .font('a')
                    .align('ct')
                    .text('------------------------------------------')
                    .text('KOT ( KITCHEN )')
                    .text('------------------------------------------')
                    .align('lt')
                    .text(`Print DateTime :    ${dateStr}    ${timeStr}`)
                    .text(`Order Date :             ${dateStr}`)
                    .text(`Order #:                 ${order.orderNumber || 'N/A'}`)
                    .text(`Order Type :             ${(order.orderType || 'N/A').toUpperCase().replace('_', ' ')}`)
                    .text(`Token #:                 ${order.orderNumber || '00'}`)
                    .text(`Server:                  ${order.serverName || 'Self Customer'}`)
                    .feed(1)
                    .text(`Customer :               ${order.customerName || ''}`)
                    .text(`Mobile :                 ${order.customerPhone || ''}`)
                    .text('------------------------------------------')
                    .text('QTY  ITEM                      CODE')
                    .text('------------------------------------------');

                order.items.forEach(item => {
                    const qty = String(item.quantity).padEnd(5);
                    const name = (item.product_name || item.product?.name || 'Item').substring(0, 25).padEnd(26);
                    const code = (item.sku || '').substring(0, 8);
                    printer.text(`${qty}${name}${code}`);
                });

                printer
                    .text('------------------------------------------')
                    .text(`COUNTER:                 ${order.payment_method || 'CASH'}`)
                    .text(`User:                    ${order.cashierName || 'ANUS CASHIER'}`)
                    .feed(3)
                    .cut()
                    .close();
                resolve();
            });
        } catch (err) {
            reject(err);
        }
    });
};

const printBillAsImage = async (htmlContent) => {
    let browser;
    try {
        browser = await puppeteer.launch({
            executablePath: getEdgePath(),
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        
        // Set viewport for 80mm printer (approx 302px width at 96dpi, but we use higher for quality)
        // 576px is a common width for 80mm thermal printers
        await page.setViewport({ width: 576, height: 1000 });
        
        // Add basic styling to ensure thermal look
        const styledHtml = `
            <html>
                <head>
                    <style>
                        body { 
                            width: 576px; 
                            margin: 0; 
                            padding: 0; 
                            background: white;
                            font-family: monospace;
                        }
                        * { box-sizing: border-box; }
                    </style>
                </head>
                <body>
                    ${htmlContent}
                </body>
            </html>
        `;

        await page.setContent(styledHtml, { waitUntil: 'networkidle0' });
        
        // Auto-size height based on content
        const height = await page.evaluate(() => document.body.scrollHeight);
        await page.setViewport({ width: 576, height: Math.ceil(height) });

        const imageBuffer = await page.screenshot({ fullPage: true });
        await browser.close();

        // Use Jimp to convert buffer to something escpos can handle if needed
        const image = await Jimp.read(imageBuffer);
        const pngBuffer = await image.getBufferAsync(Jimp.MIME_PNG);

        return new Promise((resolve, reject) => {
            if (!BILL_IP) return reject("Bill Printer IP not configured");

            const device = new Network(BILL_IP);
            const printer = new escpos.Printer(device);

            device.open(async (error) => {
                if (error) return reject(error);

                try {
                    const escposImage = await new Promise((res, rej) => {
                        escpos.Image.load(imageBuffer, 'image/png', (img) => {
                            if (img instanceof Error) rej(img);
                            else res(img);
                        });
                    });

                    printer
                        .align('ct')
                        .image(escposImage)
                        .feed(3)
                        .cut()
                        .close();
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

const printBillFallback = async (order) => {
    return new Promise((resolve, reject) => {
        if (!BILL_IP) return reject("Bill Printer IP not configured");

        try {
            const device = new Network(BILL_IP);
            const printer = new escpos.Printer(device);

            device.open((error) => {
                if (error) return reject(error);

                const now = new Date();
                const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-');
                const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

                printer
                    .font('a')
                    .align('ct')
                    .style('normal')
                    .size(0, 0)
                    .text('Near Al Habib Bank')
                    .text('Shahdadpur Road')
                    .text('Iserpura Nawab Shah')
                    .text('03114610599')
                    .text('03343610599')
                    .text('Designed & Developed By Genai Tech')
                    .text('------------------------------------------')
                    .feed(1)
                    .size(1, 1)
                    .text(order.orderNumber || '00')
                    .size(0, 0)
                    .text('------------------------------------------')
                    .align('lt')
                    .text(`Invoice #:  ${order.orderNumber || 'N/A'}     DAY-00${order.orderNumber || '00'}`)
                    .text(`Restaurant:     CRUST & CRUMS`)
                    .text(`${(order.cashierName || 'Anus').toUpperCase()} CASHIER / CASH      ${(order.orderType || 'N/A').toUpperCase().replace('_', ' ')}`)
                    .text(`${dateStr}                    ${timeStr}`)
                    .text(`Server :            ${order.serverName || 'Self Customer'}`)
                    .text(`Customer :          ${order.customerName || 'alsheekhouse'}`)
                    .text('------------------------------------------')
                    .text('Qty  Item                Rate   Amount')
                    .text('------------------------------------------');

                order.items.forEach(item => {
                    const price = item.price || item.product?.price || 0;
                    const qty = String(item.quantity).padEnd(5);
                    const name = (item.product_name || item.product?.name || 'Item').substring(0, 18).padEnd(20);
                    const rate = String(price).padEnd(7);
                    const amount = String(price * item.quantity);
                    printer.text(`${qty}${name}${rate}${amount}`);
                });

                printer
                    .text('------------------------------------------')
                    .align('rt')
                    .text(`SubTotal :              ${order.total || order.total_amount || 0}`)
                    .size(1, 0)
                    .text(`Net Bill :              ${order.total || order.total_amount || 0}`)
                    .size(0, 0)
                    .text(`Payment Mode :             ${order.payment_method || 'Cash'}`)
                    .text('------------------------------------------')
                    .align('ct')
                    .text('!!!!FOR THE LOVE OF FOOD!!!!')
                    .text('Powered By: GENAI TECHNOLOGY +923342826675')
                    .feed(3)
                    .cut()
                    .close();
                resolve();
            });
        } catch (err) {
            reject(err);
        }
    });
};

app.post('/print/kot', async (req, res) => {
    console.log('KOT Print Request:', req.body.orderNumber);
    try {
        await printKOT(req.body);
        res.status(200).send({ success: true, message: 'KOT printed' });
    } catch (error) {
        console.error('KOT Error:', error);
        res.status(200).send({ success: false, error: error.toString() });
    }
});

app.post('/print/bill', async (req, res) => {
    console.log('Bill Print Request:', req.body.orderNumber);
    try {
        if (req.body.html) {
            console.log('Printing Bill as Image...');
            await printBillAsImage(req.body.html);
        } else {
            console.log('No HTML provided, using Text Fallback...');
            await printBillFallback(req.body);
        }
        res.status(200).send({ success: true, message: 'Bill printed' });
    } catch (error) {
        console.error('Bill Print Error:', error);
        // Fallback to text if image fails
        try {
            console.log('Image print failed, attempting text fallback...');
            await printBillFallback(req.body);
            res.status(200).send({ success: true, message: 'Bill printed with fallback' });
        } catch (fallbackError) {
            console.error('Fallback failed:', fallbackError);
            res.status(200).send({ success: false, error: fallbackError.toString() });
        }
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Printer Server running on port ${PORT}`);
});
