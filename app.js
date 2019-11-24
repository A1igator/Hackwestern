// [START gae_node_request_example]
const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const fs = require('fs').promises; 

const app = express();
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
fs.writeFile("/tmp/users.json", JSON.stringify({}), (err) => {console.log(err)});
app.get('/', (_, res) => {
  res
    .status(200)
    .send('Hello, world!')
    .end();
});

app.get('/:user/balance', async (req, res) => {
    const { user } = req.params;
    const usrData = await getUser(user);

    res.send({success: true, balance: usrData.balance});
});

app.get('/:user/positions', async (req, res) => {
    const { user } = req.params;

    const data = await getUser(user);

    res.send({success: true, positions: data.positions});
});

app.get('/:user/recommend', async (req, res) => {
    const { user } = req.params;
    const { risk } = req.body;

    const data = await fs.readFile('/tmp/users.json');
    const jsonParsed = JSON.parse(data);

    if (user in jsonParsed) {
        res.send({success: false, error: 'user already exists'});
    } else {
        let positions = {};
        // let money = 0;
        if (risk !== undefined) {
            if (risk >= 0 && risk < 33) {
                positions = {"AAPL": 5};
            } else if (risk < 66) {
                positions = {"GOOG": 2};
            } else if (risk <= 100) {
                positions = {"TSLA": 10};
            } else {
                res.send({success: false, error: 'invalid risk'});
                return;
            }
            // for (position in positions) {
            //     const response = await fetch(`https://financialmodelingprep.com/api/v3/stock/real-time-price/${position}`);
            //     const { price } = await response.json();
            //     money += price * positions[position];
            // }
        }
        // jsonParsed[user] = { balance: 5000 - money, positions };
        // fs.writeFile("/tmp/users.json", JSON.stringify(jsonParsed), (err) => {console.log(err)});
        res.send({success: true, positions});
    }
});

const getUser = async usr => {
    const data = await fs.readFile('/tmp/users.json');
    const jsonParsed = JSON.parse(data);
    if (usr in jsonParsed) {
        return jsonParsed[usr];
    } else {
        jsonParsed[usr] = {balance: 5000, positions: {}}
        await fs.writeFile("/tmp/users.json", JSON.stringify(jsonParsed));
        return jsonParsed[usr];
    }
};

app.post('/:user/buy', async (req, res) => {
    const { user } = req.params;
    const { stock, amount } = req.body;

    const response = await fetch(`https://financialmodelingprep.com/api/v3/stock/real-time-price/${stock}`);
    const { price } = await response.json();

    if (stock === undefined || amount === undefined) {
        res.sendStatus(400);
        return;
    }

    const data = await getUser(user);
    if ((price * amount) < data.balance) {
        if (stock in data.positions) {
            data.positions[stock] += amount;
        } else {
            data.positions[stock] = amount;
        }
        data.balance -= (price * amount);
        const obj = await fs.readFile('/tmp/users.json')
        const jsonParsed = await JSON.parse(obj);
        jsonParsed[user] = data;
        await fs.writeFile("/tmp/users.json", JSON.stringify(jsonParsed));
        res.send({success: true});
    } else {
        res.send({success: false, error: 'Insufficient funds to make that purchase.'});
    }
});

app.post('/:user/sell', async (req, res) => {
    const { user } = req.params;
    const { stock, amount } = req.body;

    const response = await fetch(`https://financialmodelingprep.com/api/v3/stock/real-time-price/${stock}`);
    const { price } = await response.json();

    if (stock === undefined || amount === undefined) {
        res.sendStatus(400);
        return;
    }

    const data = await getUser(user);
    if (stock in data.positions && (data.positions[stock] - amount) >= 0) {
        data.positions[stock] -= amount;
        if (data.positions[stock] === 0) {
            delete data.positions[stock];
        }
        data.balance += (price * amount);
        const obj = await fs.readFile('/tmp/users.json');
        jsonParsed = JSON.parse(obj);
        jsonParsed[user] = data;
        await fs.writeFile("/tmp/users.json", JSON.stringify(jsonParsed));
        res.send({success: true});
    } else {
        res.send({success: false, error: 'you don\'t own that much of this stock'});
    }
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
  console.log('Press Ctrl+C to quit.');
});
// [END gae_node_request_example]

module.exports = app;
