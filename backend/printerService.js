const escpos = require('escpos');
const Network = require('escpos-network');
require('dotenv').config();

const KOT_IP = process.env.KOT_PRINTER_IP;
const BILL_IP = process.env.BILL_PRINTER_IP;

const printKOT = async (order) => {
    if (!KOT_IP) return console.error("KOT IP not configured");
    try {
        const device = new Network(KOT_IP, 9100);
        const printer = new escpos.Printer(device);
        device.open((err) => {
            if (err) return console.error("KOT Error:", err);
            printer.font('a').align('ct').size(1, 1).text('KOT').text(`Order #: ${order.orderNumber}`).text('--------------------------------').align('lt');
            order.items.forEach(item => printer.text(`${item.product_name || item.product.name} x ${item.quantity}`));
            printer.text('--------------------------------').cut().close();
        });
    } catch (e) { console.error(e); }
};

const printBill = async (order) => {
    if (!BILL_IP) return console.error("Bill IP not configured");
    try {
        const device = new Network(BILL_IP, 9100);
        const printer = new escpos.Printer(device);
        device.open((err) => {
            if (err) return console.error("Bill Error:", err);
            printer.font('a').align('ct').size(1, 1).text('BILL').text(`Order #: ${order.orderNumber}`).text('--------------------------------').align('lt');
            order.items.forEach(item => printer.text(`${item.product_name || item.product.name} x ${item.quantity} - Rs ${item.price * item.quantity}`));
            printer.text('--------------------------------').align('rt').text(`Total: Rs ${order.total}`).cut().close();
        });
    } catch (e) { console.error(e); }
};

module.exports = { printKOT, printBill };
