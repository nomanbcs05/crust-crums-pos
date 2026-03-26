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

                printer
                    .font('a')
                    .align('ct')
                    .style('bu')
                    .size(1, 1)
                    .text('KITCHEN ORDER')
                    .text(`Order: ${order.orderNumber || 'N/A'}`)
                    .feed(1)
                    .align('lt')
                    .style('normal')
                    .size(0, 0);

                order.items.forEach(item => {
                    printer.text(`${item.product_name || item.product?.name} x ${item.quantity}`);
                });

                printer.feed(3).cut().close();
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

                printer
                    .font('a')
                    .align('ct')
                    .style('bu')
                    .size(1, 1)
                    .text('CUSTOMER BILL')
                    .text(`Order: ${order.orderNumber || 'N/A'}`)
                    .feed(1)
                    .align('lt')
                    .style('normal')
                    .size(0, 0);

                order.items.forEach(item => {
                    const name = item.product_name || item.product?.name || 'Item';
                    const qty = item.quantity;
                    const price = item.price || item.product?.price || 0;
                    printer.text(`${name} x ${qty} : Rs ${price * qty}`);
                });

                printer
                    .feed(1)
                    .align('rt')
                    .text(`TOTAL: Rs ${order.total || order.total_amount || 0}`)
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
