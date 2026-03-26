const express = require('express');
const cors = require('cors');
const { printKOT, printBill } = require('./printerService');
const app = express();
app.use(express.json());
app.use(cors());

app.post('/print/kot', async (req, res) => {
    await printKOT(req.body);
    res.status(200).send({ message: 'Sent to KOT' });
});

app.post('/print/bill', async (req, res) => {
    await printBill(req.body);
    res.status(200).send({ message: 'Sent to Bill' });
});

app.listen(5000, () => console.log('Printer API running on port 5000'));
