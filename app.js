// [START gae_node_request_example]
const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const fs = require('fs'); 

const app = express();
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

app.get('/', (_, res) => {
  res
    .status(200)
    .send('Hello, world!')
    .end();
});

app.get('/:user/balance', (req, res) => {
    const { user } = req.params;

    fs.readFile('users.json', (err, data) => { 
        const jsonParsed = JSON.parse(data);
 
        if (user in jsonParsed) {
            res.send({balance: jsonParsed[user].balance});
        } else {
            res.sendStatus(404);
        }
    }); 
});

app.get('/:user/positions', (req, res) => {
    const { user } = req.params;

    fs.readFile('users.json', (err, data) => { 
        const jsonParsed = JSON.parse(data);
 
        if (user in jsonParsed) {
            res.send({positions: jsonParsed[user].positions});
        } else {
            res.sendStatus(404);
        }
    }); 
});

app.post('/:user/setup', (req, res) => {
    const { user } = req.params;
    const { risk } = req.body;

    fs.readFile('users.json', async (err, data) => { 
        const jsonParsed = JSON.parse(data);
 
        if (user in jsonParsed) {
            res.send('user already exists');
        } else {
            let positions = {};
            let money = 0;
            if (risk !== undefined) {
                if (risk >= 0 && risk < 33) {
                    positions = {"AAPL": 5};
                } else if (risk < 66) {
                    positions = {"GOOG": 2};
                } else if (risk <= 100) {
                    positions = {"TSLA": 10};
                } else {
                    res.send('invalid risk');
                    return;
                }
                for (position in positions) {
                    const response = await fetch(`https://financialmodelingprep.com/api/v3/stock/real-time-price/${position}`);
                    const { price } = await response.json();
                    money += price * positions[position];
                }
            }
            jsonParsed[user] = {balance: 5000 - money, positions };
            fs.writeFile("users.json", JSON.stringify(jsonParsed));
            res.sendStatus(200);
        }
    }); 
});

app.post('/:user/buy', async (req, res) => {
    const { user } = req.params;
    const { stock, amount } = req.body;

    const response = await fetch(`https://financialmodelingprep.com/api/v3/stock/real-time-price/${stock}`);
    const { price } = await response.json();
    fs.readFile('users.json', (err, data) => { 
        const jsonParsed = JSON.parse(data);
        if (user in jsonParsed) {
            if ((price * amount) < jsonParsed[user].balance) {
                if (stock in jsonParsed[user].positions) {
                    jsonParsed[user].positions[stock] += amount;
                } else {
                    jsonParsed[user].positions[stock] = amount;
                }
                jsonParsed[user].balance -= (price * amount);
                fs.writeFile("users.json", JSON.stringify(jsonParsed));
                res.send({success: true});
            } else {
                res.send({success: false, error: 'Insufficient funds to make that purchase.'});
            }
        } else {
            res.send({success: false, error: 'Unknown user.'});
        }
    });
});

app.post('/:user/sell', async (req, res) => {
    const { user } = req.params;
    const { stock, amount } = req.body;

    const response = await fetch(`https://financialmodelingprep.com/api/v3/stock/real-time-price/${stock}`);
    const { price } = await response.json();
    fs.readFile('users.json', (err, data) => { 
        const jsonParsed = JSON.parse(data);
        if (user in jsonParsed) {
            if (stock in jsonParsed[user].positions && (jsonParsed[user].positions[stock] - amount) >= 0) {
                jsonParsed[user].positions[stock] -= amount;
                jsonParsed[user].balance += (price * amount);
                fs.writeFile("users.json", JSON.stringify(jsonParsed));
                res.sendStatus(200);
            } else {
                res.send('you don\'t own that much of this stock');
            }
        } else {
            res.send('user doesn\'t exist');
        }
    });
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
  console.log('Press Ctrl+C to quit.');
});
// [END gae_node_request_example]

module.exports = app;
