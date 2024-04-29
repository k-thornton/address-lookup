const express = require('express');
const axios = require('axios');
require("dotenv").config();
const { parse } = require('json2csv');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public')); // Serve static files from 'public' directory


const PORT = process.env.PORT || 3001;
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
const ALCHEMY_API_KEY_POLYGON = process.env.ALCHEMY_API_KEY_POLYGON;

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });
  

async function getTransfers(chain, address) {
    const apiKey = chain === 'polygon' ? ALCHEMY_API_KEY_POLYGON : ALCHEMY_API_KEY;
    const response = await axios.post(`https://${chain}-mainnet.alchemyapi.io/v2/${apiKey}`, {
        jsonrpc: "2.0",
        id: 0,
        method: "alchemy_getAssetTransfers",
        params: [{
            fromBlock: "0x0",
            toBlock: "latest",
            fromAddress: address,
            category: ["external", "internal", "erc20", "erc721", "erc1155", "specialnft"]
        }]
    });
    const transfersOut = response.data.result.transfers;
    const xferIn = await axios.post(`https://${chain}-mainnet.alchemyapi.io/v2/${apiKey}`, {
        jsonrpc: "2.0",
        id: 0,
        method: "alchemy_getAssetTransfers",
        params: [{
            fromBlock: "0x0",
            toBlock: "latest",
            toAddress: address,
            category: ["external", "internal", "erc20", "erc721", "erc1155", "specialnft"]
        }]
    });
    const transfersIn = xferIn.data.result.transfers;
    return transfersOut.concat(transfersIn);
}


app.get('/asset-transfers/eth/:address', async (req, res) => {
    const address = req.params.address;
    try {
        const transfers = await getTransfers('polygon', address);
        const fields = ['hash', 'from', 'to', 'value', 'asset', 'category']; // Specify desired fields
        const csv = parse(transfers, { fields });
        res.header('Content-Type', 'text/plain');
        res.send(csv);
        // res.header('Content-Type', 'text/csv');
        // res.attachment("transfers.csv");
        // res.send(csv);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.get('/asset-transfers/polygon/:address', async (req, res) => {
    const address = req.params.address;
    try {
        const transfers = await getTransfers('polygon', address);
        const fields = ['hash', 'from', 'to', 'value', 'asset', 'category']; // Specify desired fields
        const csv = parse(transfers, { fields });
        res.header('Content-Type', 'text/plain');
        res.send(csv);
        // res.header('Content-Type', 'text/csv');
        // res.attachment("transfers.csv");
        // res.send(csv);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/asset-transfers/:address', async (req, res) => {
    const address = req.params.address;
    console.log(address);
    try {
        // Fetch transfers from both networks
        const ethTransfers = await getTransfers('eth', address);
        const polygonTransfers = await getTransfers('polygon', address);

        // Append network name to each transfer
        const ethTransfersWithNetwork = ethTransfers.map(transfer => ({
            ...transfer,
            network: 'Ethereum' // Add network field for Ethereum transfers
        }));
        const polygonTransfersWithNetwork = polygonTransfers.map(transfer => ({
            ...transfer,
            network: 'Polygon' // Add network field for Polygon transfers
        }));

        // Combine the transfers from both networks
        const combinedTransfers = ethTransfersWithNetwork.concat(polygonTransfersWithNetwork);

        // Specify fields for CSV, including the new 'network' field
        const fields = ['hash', 'from', 'to', 'value', 'asset', 'category', 'network']; // Add 'network' to the fields

        // Parse combined transfers to CSV
        const csv = parse(combinedTransfers, { fields });
        console.log(csv);
        res.header('Content-Type', 'text/plain');
        res.send(csv);
        // res.header('Content-Type', 'text/csv');
        // res.attachment("transfers.csv");
        // res.send(csv);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
