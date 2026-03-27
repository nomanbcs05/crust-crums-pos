const escpos = require('escpos');
const Network = require('escpos-network');
const puppeteer = require('puppeteer-core');
const { launcher } = require('chromium-edge-launcher');
const Jimp = require('jimp');
require('dotenv').config();

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
        
        await page.setViewport({ width: 576, height: 1000 });
        
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
        const height = await page.evaluate(() => document.body.scrollHeight);
        await page.setViewport({ width: 576, height: Math.ceil(height) });

        const imageBuffer = await page.screenshot({ fullPage: true });
        await browser.close();

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

const printBill = async (order) => {
    try {
        if (order.html) {
            console.log('Printing Bill as Image...');
            await printBillAsImage(order.html);
        } else {
            console.log('No HTML provided, using Text Fallback...');
            await printBillFallback(order);
        }
    } catch (error) {
        console.error('Bill Print Error:', error);
        try {
            console.log('Image print failed, attempting text fallback...');
            await printBillFallback(order);
        } catch (fallbackError) {
            console.error('Fallback failed:', fallbackError);
            throw fallbackError;
        }
    }
};

module.exports = { printKOT, printBill };
