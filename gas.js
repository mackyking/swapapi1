const Web3 = require('web3');
const express = require("express");
const app = express();
const bodyParser = require("body-parser")
const PORT = 4000;
const http = require("http");
const server = http.createServer(app);
app.use(bodyParser.json({ limit: "100mb", type: "application/json" }));
app.use(
  bodyParser.urlencoded({
    limit: "100mb",
    extended: true,
  })
);
async function cal(){
    var amount = "1";
    const web3 = new Web3('https://bsc-dataseed.binance.org/');

//275833// for swap
//66720 // for approve
const gasLIMITWEI = web3.utils.toWei('275833', 'ether');

const gasPrice = await web3.eth.getGasPrice();
console.log((gasPrice * 66720)/1000000000000000000)
//approve k sb functions pr 66720 ye gas limit rkna
//done

//const gasFee = web3.utils.fromWei((gasPrice * gasLIMITWEI).toString(), 'ether');
  };
  cal()
