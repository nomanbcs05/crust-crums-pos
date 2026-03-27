const escpos = require('escpos');
const Network = require('escpos-network');
const puppeteer = require('puppeteer-core');
const { launcher } = require('chromium-edge-launcher');
require('dotenv').config();

const KOT_IP = process.env.KOT_PRINTER_IP;
const BILL_IP = process.env.BILL_PRINTER_IP;

const getEdgePath = () => {
    try {
        return launcher.getInstallations()[0];
    } catch (e) {
        return 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
    }
};

const printAsImage = async (htmlContent, printerIp) => {
    if (!printerIp) return Promise.reject("Printer IP not configured");
    let browser;
    try {
        browser = await puppeteer.launch({ executablePath: getEdgePath(), headless: true, args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.setViewport({ width: 576, height: 1024 });
        const styledHtml = `<html><head><style>body { width: 576px; margin: 0; padding: 10px; background: white; font-family: monospace; } * { box-sizing: border-box; }</style></head><body>${htmlContent}</body></html>`;
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
                    const escposImage = await new Promise((res, rej) => escpos.Image.load(imageBuffer, 'image/png', (img) => img instanceof Error ? rej(img) : res(img)));
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
    return new Promise((resolve, reject) => {
        if (!KOT_IP) return reject("KOT Printer IP not configured");
        const device = new Network(KOT_IP);
        const printer = new escpos.Printer(device);
        device.open((error) => {
            if (error) return reject(error);
            printer.font('a').align('ct').text('KOT ( KITCHEN )').align('lt').text(`Order: ${order.orderNumber}`).text('--------------------------------');
            order.items.forEach(item => printer.text(`${item.quantity} x ${item.product_name || item.product.name}`));
            printer.text('--------------------------------').feed(3).cut().close();
            resolve();
        });
    });
};

const printBillFallback = async (order) => {
    return new Promise((resolve, reject) => {
        if (!BILL_IP) return reject("Bill Printer IP not configured");
        const device = new Network(BILL_IP);
        const printer = new escpos.Printer(device);
        device.open((error) => {
            if (error) return reject(error);
            printer.align('ct').size(1,1).text(`Bill - #${order.orderNumber}`).size(0,0).text('--------------------------------');
            order.items.forEach(item => printer.text(`${item.quantity}x ${item.product_name || item.product.name} - ${item.price * item.quantity}`));
            printer.text('--------------------------------').align('rt').text(`Total: ${order.total}`).feed(3).cut().close();
            resolve();
        });
    });
};

const printKOT = async (order) => {
    try {
        if (order.html) {
            await printAsImage(order.html, KOT_IP);
        } else {
            await printKOTFallback(order);
        }
    } catch (error) {
        console.error('KOT Image Print Error:', error);
        await printKOTFallback(order);
        throw error; // Re-throw to be caught by the main server
    }
};

const printBill = async (order) => {
    try {
        if (order.html) {
            await printAsImage(order.html, BILL_IP);
        } else {
            await printBillFallback(order);
        }
    } catch (error) {
        console.error('Bill Image Print Error:', error);
        await printBillFallback(order);
        throw error;
    }
};

module.exports = { printKOT, printBill };
