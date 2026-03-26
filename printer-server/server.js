const express = require('express');
const escpos = require('escpos');
const Network = require('escpos-network');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const KOT_IP = process.env.KOT_PRINTER_IP;
const BILL_IP = process.env.BILL_PRINTER_IP;

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

const printBill = async (order) => {
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
        res.status(200).send({ success: false, error: error.toString() }); // Always send 200 to avoid frontend crash if printer offline
    }
});

app.post('/print/bill', async (req, res) => {
    console.log('Bill Print Request:', req.body.orderNumber);
    try {
        await printBill(req.body);
        res.status(200).send({ success: true, message: 'Bill printed' });
    } catch (error) {
        console.error('Bill Error:', error);
        res.status(200).send({ success: false, error: error.toString() });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Printer Server running on port ${PORT}`);
});
