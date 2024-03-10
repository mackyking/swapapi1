const Web3 = require('web3');
const express = require("express");
const app = express();
const bodyParser = require("body-parser")
const PORT = 4000;
const http = require("http");
const axios = require('axios');
const BSCSCAN_API_KEY = '3WK22B41CG3Y67YFQ6RKJIH778Z9P2Y36J';
const server = http.createServer(app);
app.use(bodyParser.json({ limit: "100mb", type: "application/json" }));
app.use(
  bodyParser.urlencoded({
    limit: "100mb",
    extended: true,
  })
);


app.get('/getGlobalAllSwappedAllDataSpefificsUsing/:txhash', async (req, res) => {
  const contractAddress = '0xfB265e16e882d3d32639253ffcfC4b0a2E861467';
  const apiKey = BSCSCAN_API_KEY;
  const toAddress = '0x11353b85DBf896da69FC045D3c6014874Dfc2Aaa';
  const txhash = req.params.txhash; // Extract the transaction hash from the URL

  if (!toAddress || !txhash) {
    res.status(400).json({ error: 'toAddress and txhash are required in the query parameters' });
    return;
  }

  try {
    const baseUrl = 'https://api.bscscan.com/api';
    const module = 'account';
    const action = 'tokentx';

    const params = {
      module,
      action,
      contractaddress: contractAddress,
      sort: 'desc',
      apikey: apiKey,
      address: toAddress, // Include the toAddress in the params
    };

    const response = await axios.get(baseUrl, { params });

    if (response.status === 200) {
      const data = response.data;
      if (data.status === '1') {
        const transactions = data.result;
        const web3 = new Web3();
        
        // Filter transactions to include only the one with the specified transaction hash
        const filteredTransaction = transactions.find(transaction => transaction.hash.toLowerCase() === txhash.toLowerCase());

        if (filteredTransaction) {
          const quantity = web3.utils.fromWei(filteredTransaction.value, 'ether');
          const date = new Date(filteredTransaction.timeStamp * 1000).toUTCString();
          let fromAddressFormatted = filteredTransaction.from;
          let toAddressFormatted = filteredTransaction.to;

          const normalizedFromAddress = filteredTransaction.from.toLowerCase();
          const normalizedToAddress = filteredTransaction.to.toLowerCase();
          const normalizedTargetAddress = toAddress.toLowerCase();

          if (normalizedFromAddress === normalizedTargetAddress) {
            fromAddressFormatted = 'PancakeSwap V2: BSC-USD-F3';
          }

          if (normalizedToAddress === normalizedTargetAddress) {
            toAddressFormatted = 'PancakeSwap V2: BSC-USD-F3';
          }

          // Prepare the response for the specific transaction
          const responseObj = {
            txnHash: filteredTransaction.hash,
            date: date,
            from: fromAddressFormatted,
            to: toAddressFormatted,
            quantity: quantity,
          };

          res.json(responseObj);
        } else {
          res.status(404).json({ error: 'Transaction not found' });
        }
      } else {
        res.status(500).json({ error: 'API response status is not 1' });
      }
    } else {
      res.status(500).json({ error: 'Unable to fetch data from the BSCscan API' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while fetching data' });
  }
});

app.post('/transferBNB', async (req, res) => {
  try {
    var privateKeyy = req.body.privateKeyy;
    var privateKey = "0x".concat(privateKeyy);
    var fromAddress = req.body.fromAddress;
    var toAddress = req.body.toAddress;
    var amount = req.body.amount; // Transfer 1 BNB

    const balance = await web3.eth.getBalance(fromAddress);
    console.log('Balance:', web3.utils.fromWei(balance, 'ether'), 'BNB');


    // Validate inputs
    if (!fromAddress || !toAddress || !amount || !privateKeyy) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Convert amount to Wei (1 BNB = 10^18 Wei)
    const amountInWei = web3.utils.toWei(amount.toString());

    // Estimate gas required for the transaction
    const gasEstimate = await web3.eth.estimateGas({
      from: fromAddress,
      to: toAddress,
      value: amountInWei,
    });

    // Get the current gas price
    const gasPrice = await web3.eth.getGasPrice();

    // Construct the transaction object with a custom gas price and the estimated gas limit
    const transactionObject = {
      from: fromAddress,
      to: toAddress,
      value: amountInWei,
      gasPrice: web3.utils.toHex(gasPrice), // Use the current gas price
      gas: web3.utils.toHex(gasEstimate), // Set gas limit from estimation
    };

    // Sign and send the transaction
    const signedTx = await web3.eth.accounts.signTransaction(transactionObject, privateKey);
    const sentTx = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

    res.status(200).json({ transactionHash: sentTx.transactionHash });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/swapF3toUSDT", async (req, res) => {
  try {
    var privateKey = req.body.privateKey;
    var amount = req.body.inputAmount;
    privateKey = "0x".concat(privateKey);
    const web3 = new Web3('https://bsc-dataseed.binance.org/');
    //const privateKey = '0xa2ee5a60a7a875b4647349edc04b9443c488b5ba614bbcee99360813e1323bd5';
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    const pancakeSwapAddress = '0x10ed43c718714eb63d5aa57b78b54704e256024e';
    const pancakeSwapABI = require('./abi.json');
    const pancakeSwapContract = new web3.eth.Contract(pancakeSwapABI, pancakeSwapAddress);
    const inputTokenAddress = '0xfb265e16e882d3d32639253ffcfc4b0a2e861467';
    const outputTokenAddress = '0x55d398326f99059ff775485246999027b3197955';
    const inputAmount = web3.utils.toWei(amount, 'ether');
    const minOutputAmount = web3.utils.toWei('0', 'ether');
    //// approval part
    const tokenabi = require('./abif3.json');
    const tokencontract = new web3.eth.Contract(tokenabi, inputTokenAddress);
    web3.eth.accounts.wallet.add(privateKey);
    const gasPrice = await web3.eth.getGasPrice();
    try {
      const approves = await tokencontract.methods
        .approve(
          pancakeSwapAddress,
          inputAmount
        )
        .send({ from: account.address, gasPrice: gasPrice, gasLimit: 66720 });
      console.log(approves.transactionHash)
    }
    catch (err) {
      console.log(err);
      return res.status(401).send("Insufficient funds");
    }
    /////
    console.log(inputAmount, minOutputAmount)

    const swapData = pancakeSwapContract.methods.swapExactTokensForTokens(
      inputAmount,
      minOutputAmount,
      [inputTokenAddress, outputTokenAddress],
      account.address,
      Date.now() + 1000 * 60 * 10 // set to expire after 10 minutes
    ).encodeABI();


    var block = await web3.eth.getBlock("latest");

    var gasLimit = Math.round(block.gasLimit / block.transactions.length);
    // console.log(block,gasLimit)
    var tx = {
      gas: gasLimit,
      to: pancakeSwapAddress,
      data: swapData
    }
    web3.eth.accounts.wallet.add(privateKey);
    try {
      const swapTransaction = await pancakeSwapContract.methods
        .swapExactTokensForTokens(
          inputAmount,
          minOutputAmount,
          [inputTokenAddress, outputTokenAddress],
          account.address,
          Date.now() + 1000 * 60 * 10 // set to expire after 10 minutes
        )
        .send({ from: account.address, gasPrice: gasPrice, gasLimit: 275833 });
      console.log(swapTransaction.transactionHash)
      res.status(200).send("Swap Successful")
    }
    catch (error) {
      console.log("error hai", error)
      return res.status(401).send("Insufficient Funds")
    }
  }
  catch (err) {
    return res.status(400).send("Insufficient Funds")
  }

});

app.post("/swapUSDTtoF3", async (req, res) => {
  try {
    var privateKey = req.body.privateKey;
    var amount = req.body.inputAmount;
    privateKey = "0x".concat(privateKey);
    const web3 = new Web3('https://bsc-dataseed.binance.org/');
    //const privateKey = '0xa2ee5a60a7a875b4647349edc04b9443c488b5ba614bbcee99360813e1323bd5';
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    const pancakeSwapAddress = '0x10ed43c718714eb63d5aa57b78b54704e256024e';
    const pancakeSwapABI = require('./abi.json');
    const pancakeSwapContract = new web3.eth.Contract(pancakeSwapABI, pancakeSwapAddress);
    const inputTokenAddress = '0x55d398326f99059ff775485246999027b3197955';
    const outputTokenAddress = '0xfb265e16e882d3d32639253ffcfc4b0a2e861467';
    const inputAmount = web3.utils.toWei(amount, 'ether');
    const minOutputAmount = web3.utils.toWei('0', 'ether');
    //// approval part
    const tokenabi = require('./abif3.json');
    const tokencontract = new web3.eth.Contract(tokenabi, inputTokenAddress);
    web3.eth.accounts.wallet.add(privateKey);
    const gasPrice = await web3.eth.getGasPrice();
    try {
      const approves = await tokencontract.methods
        .approve(
          pancakeSwapAddress,
          inputAmount
        )
        .send({ from: account.address, gasPrice: gasPrice, gasLimit: 66720 });
      console.log(approves.transactionHash)
    }
    catch (err) {
      console.log(err);
      return res.status(401).send("Insufficient funds");
    }
    /////
    console.log(inputAmount, minOutputAmount)

    const swapData = pancakeSwapContract.methods.swapExactTokensForTokens(
      inputAmount,
      minOutputAmount,
      [inputTokenAddress, outputTokenAddress],
      account.address,
      Date.now() + 1000 * 60 * 10 // set to expire after 10 minutes
    ).encodeABI();


    var block = await web3.eth.getBlock("latest");

    var gasLimit = Math.round(block.gasLimit / block.transactions.length);
    // console.log(block,gasLimit)
    var tx = {
      gas: gasLimit,
      to: pancakeSwapAddress,
      data: swapData
    }
    web3.eth.accounts.wallet.add(privateKey);
    try {
      const swapTransaction = await pancakeSwapContract.methods
        .swapExactTokensForTokens(
          inputAmount,
          minOutputAmount,
          [inputTokenAddress, outputTokenAddress],
          account.address,
          Date.now() + 1000 * 60 * 10 // set to expire after 10 minutes
        )
        .send({ from: account.address, gasPrice: gasPrice, gasLimit: 275833 });
      console.log(swapTransaction.transactionHash)
      res.status(200).send("Swap Successful")
    }
    catch (error) {
      console.log("error hai", error)
      return res.status(401).send("Insufficient Funds")
    }
  }
  catch (err) {
    return res.status(400).send("Insufficient Funds")
  }

});

app.post("/swapUSDTtoBNB", async (req, res) => {
  try {
    var privateKey = req.body.privateKey;
    var amount = req.body.inputAmount;
    privateKey = "0x".concat(privateKey);
    const web3 = new Web3('https://bsc-dataseed.binance.org/');
    //const privateKey = '0xa2ee5a60a7a875b4647349edc04b9443c488b5ba614bbcee99360813e1323bd5';
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    const pancakeSwapAddress = '0x10ed43c718714eb63d5aa57b78b54704e256024e';
    const pancakeSwapABI = require('./abi.json');
    const pancakeSwapContract = new web3.eth.Contract(pancakeSwapABI, pancakeSwapAddress);
    const inputTokenAddress = '0x55d398326f99059ff775485246999027b3197955';
    const outputTokenAddress = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
    const inputAmount = web3.utils.toWei(amount, 'ether');
    const minOutputAmount = web3.utils.toWei('0', 'ether');
    //// approval part
    const tokenabi = require('./abif3.json');
    const tokencontract = new web3.eth.Contract(tokenabi, inputTokenAddress);
    web3.eth.accounts.wallet.add(privateKey);
    const gasPrice = await web3.eth.getGasPrice();
    try {
      const approves = await tokencontract.methods
        .approve(
          pancakeSwapAddress,
          inputAmount
        )
        .send({ from: account.address, gasPrice: gasPrice, gasLimit: 66720 });
      console.log(approves.transactionHash)
    }
    catch (err) {
      console.log(err);
      return res.status(401).send("Insufficient funds");
    }
    /////
    console.log(inputAmount, minOutputAmount)

    const swapData = pancakeSwapContract.methods.swapExactTokensForTokens(
      inputAmount,
      minOutputAmount,
      [inputTokenAddress, outputTokenAddress],
      account.address,
      Date.now() + 1000 * 60 * 10 // set to expire after 10 minutes
    ).encodeABI();


    var block = await web3.eth.getBlock("latest");

    var gasLimit = Math.round(block.gasLimit / block.transactions.length);
    // console.log(block,gasLimit)
    var tx = {
      gas: gasLimit,
      to: pancakeSwapAddress,
      data: swapData
    }
    web3.eth.accounts.wallet.add(privateKey);
    try {
      const swapTransaction = await pancakeSwapContract.methods
        .swapExactTokensForTokens(
          inputAmount,
          minOutputAmount,
          [inputTokenAddress, outputTokenAddress],
          account.address,
          Date.now() + 1000 * 60 * 10 // set to expire after 10 minutes
        )
        .send({ from: account.address, gasPrice: gasPrice, gasLimit: 275833 });
      console.log(swapTransaction.transactionHash)
      res.status(200).send("Swap Successful")
    }
    catch (error) {
      console.log("error hai", error)
      return res.status(401).send("Insufficient Funds")
    }
  }
  catch (err) {
    return res.status(400).send("Insufficient Funds")
  }

});

app.post("/swapBNBtoUSDT", async (req, res) => {
  try {
    var privateKey = req.body.privateKey;
    var amount = req.body.inputAmount;
    privateKey = "0x".concat(privateKey);
    const web3 = new Web3('https://bsc-dataseed.binance.org/');
    //const privateKey = '0xa2ee5a60a7a875b4647349edc04b9443c488b5ba614bbcee99360813e1323bd5';
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    const pancakeSwapAddress = '0x10ed43c718714eb63d5aa57b78b54704e256024e';
    const pancakeSwapABI = require('./abi.json');
    const pancakeSwapContract = new web3.eth.Contract(pancakeSwapABI, pancakeSwapAddress);
    const inputTokenAddress = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
    const outputTokenAddress = '0x55d398326f99059ff775485246999027b3197955';
    const inputAmount = web3.utils.toWei(amount, 'ether');
    const minOutputAmount = web3.utils.toWei('0', 'ether');
    //// approval part
    const tokenabi = require('./abif3.json');
    const tokencontract = new web3.eth.Contract(tokenabi, inputTokenAddress);
    web3.eth.accounts.wallet.add(privateKey);
    const gasPrice = await web3.eth.getGasPrice();
    try {
      const approves = await tokencontract.methods
        .approve(
          pancakeSwapAddress,
          inputAmount
        )
        .send({ from: account.address, gasPrice: gasPrice, gasLimit: 66720 });
      console.log(approves.transactionHash)
    }
    catch (err) {
      console.log(err);
      return res.status(401).send("Insufficient funds");
    }
    /////
    console.log(inputAmount, minOutputAmount)

    const swapData = pancakeSwapContract.methods.swapExactTokensForTokens(
      inputAmount,
      minOutputAmount,
      [inputTokenAddress, outputTokenAddress],
      account.address,
      Date.now() + 1000 * 60 * 10 // set to expire after 10 minutes
    ).encodeABI();


    var block = await web3.eth.getBlock("latest");

    var gasLimit = Math.round(block.gasLimit / block.transactions.length);
    // console.log(block,gasLimit)
    var tx = {
      gas: gasLimit,
      to: pancakeSwapAddress,
      data: swapData
    }
    web3.eth.accounts.wallet.add(privateKey);
    try {
      const swapTransaction = await pancakeSwapContract.methods
        .swapExactTokensForTokens(
          inputAmount,
          minOutputAmount,
          [inputTokenAddress, outputTokenAddress],
          account.address,
          Date.now() + 1000 * 60 * 10 // set to expire after 10 minutes
        )
        .send({ from: account.address, gasPrice: gasPrice, gasLimit: 275833 });
      console.log(swapTransaction.transactionHash)
      res.status(200).send("Swap Successful")
    }
    catch (error) {
      console.log("error hai", error)
      return res.status(401).send("Insufficient Funds")
    }
  }
  catch (err) {
    return res.status(400).send("Insufficient Funds")
  }

});
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////

app.post("/swapf3gasfee", async (req, res) => {
  try{
  var amount = req.body.inputAmount;
  const web3 = new Web3('https://bsc-dataseed.binance.org/');
//const privateKey = '0xa2ee5a60a7a875b4647349edc04b9443c488b5ba614bbcee99360813e1323bd5';
const pancakeSwapAddress = '0x10ed43c718714eb63d5aa57b78b54704e256024e';
const pancakeSwapABI = require('./abi.json');
const pancakeSwapContract = new web3.eth.Contract(pancakeSwapABI, pancakeSwapAddress);
const inputTokenAddress = '0xfb265e16e882d3d32639253ffcfc4b0a2e861467';
const outputTokenAddress = '0x55d398326f99059ff775485246999027b3197955';
const inputAmount = web3.utils.toWei(amount, 'ether');
const minOutputAmount = web3.utils.toWei('0', 'ether');

const amounts = await pancakeSwapContract.methods.getAmountsOut(inputAmount, [inputTokenAddress, outputTokenAddress]).call();
const estimatedOutputAmount = amounts[1];
console.log("Amounts : "+web3.utils.fromWei(estimatedOutputAmount,'ether'))
const gasPrice = await web3.eth.getGasPrice(); 
// const gasEstimate = await uniswapRouter.methods.swapExactTokensForTokens(
//   inputAmount,
//   minOutputAmount,
//   [inputTokenAddress, outputTokenAddress],
//   '0xDcA8C13A13f7d73b6F82B6b0C9d2A0BB4cfB7C25',
//   deadline
// ).estimateGas({ from: '0xDcA8C13A13f7d73b6F82B6b0C9d2A0BB4cfB7C25', gasPrice });

// const gasEstimate = await pancakeSwapContract.estimateGas.swapExactTokensForTokens(
//   inputAmount,
//   0, // minimum output amount, can be set to 0 for now
//   [inputTokenAddress, outputTokenAddress],
//   '0xDcA8C13A13f7d73b6F82B6b0C9d2A0BB4cfB7C25', // your wallet address
//   deadline,
//   { gasPrice }
// );

const gasFee = web3.utils.toBN(gasPrice).mul(web3.utils.toBN(275833+66720));
console.log("Gas fee "+gasFee)

const estimatedOutputAmountInEth = web3.utils.fromWei(estimatedOutputAmount, 'ether');
const gasFeeInEth = web3.utils.fromWei(gasFee, 'ether');
const totalCostInEth = parseFloat(estimatedOutputAmountInEth) + parseFloat(gasFeeInEth);
console.log(`Estimated output amount: ${estimatedOutputAmountInEth} USDT`);
console.log(`Gas fee: ${gasFeeInEth} BNB`);
console.log(`Total cost: ${totalCostInEth} BNB`);
const result = {
  estimatedOutputAmount : estimatedOutputAmountInEth,
  gasFee : gasFeeInEth,
  totalCost : totalCostInEth
}
return res.status(200).send(result)
    }
    catch(err){
      return res.status(400).send(err)
    }

});
//////////////////////////////////////////////////////////
app.post("/swapf3ConversionAmount", async (req, res) => {
  try{
  const web3 = new Web3('https://bsc-dataseed.binance.org/');
//const privateKey = '0xa2ee5a60a7a875b4647349edc04b9443c488b5ba614bbcee99360813e1323bd5';
const pancakeSwapAddress = '0x10ed43c718714eb63d5aa57b78b54704e256024e';
const pancakeSwapABI = require('./abi.json');
const pancakeSwapContract = new web3.eth.Contract(pancakeSwapABI, pancakeSwapAddress);
const inputTokenAddress = '0xfb265e16e882d3d32639253ffcfc4b0a2e861467';
const outputTokenAddress = '0x55d398326f99059ff775485246999027b3197955';
const inputAmount = web3.utils.toWei('1', 'ether');
const minOutputAmount = web3.utils.toWei('0', 'ether');

const amounts = await pancakeSwapContract.methods.getAmountsOut(inputAmount, [inputTokenAddress, outputTokenAddress]).call();
const estimatedOutputAmount = amounts[1];
console.log("Amounts : "+web3.utils.fromWei(estimatedOutputAmount,'ether'))

const gasPrice = await web3.eth.getGasPrice();
const gasFee = web3.utils.toBN(gasPrice).mul(web3.utils.toBN(275833+66720));
console.log("Gas fee "+gasFee)

const estimatedOutputAmountInEth = web3.utils.fromWei(estimatedOutputAmount, 'ether');
const gasFeeInEth = web3.utils.fromWei(gasFee, 'ether');
const totalCostInEth = parseFloat(estimatedOutputAmountInEth) + parseFloat(gasFeeInEth);
console.log(`Estimated output amount: ${estimatedOutputAmountInEth} USDT`);
console.log(`Gas fee: ${gasFeeInEth} BNB`);
console.log(`Total cost: ${totalCostInEth} BNB`);
const result = {
  estimatedOutputAmount : estimatedOutputAmountInEth,
  gasFee : gasFeeInEth,
  totalCost : totalCostInEth
}
return res.status(200).send(result)
    }
    catch(err){
      return res.status(400).send("Wrong Input")
    }

});
//////////////////////////////////////////////////////////
app.post("/swapusdt",async (req, res) => {
  try{
  var privateKey = req.body.privateKey;
  var amount = req.body.inputAmount;
  privateKey = "0x".concat(privateKey);
  const web3 = new Web3('https://bsc-dataseed.binance.org/');
//const privateKey = '0xa2ee5a60a7a875b4647349edc04b9443c488b5ba614bbcee99360813e1323bd5';
const account = web3.eth.accounts.privateKeyToAccount(privateKey);
console.log(account.address);
const pancakeSwapAddress = '0x10ed43c718714eb63d5aa57b78b54704e256024e';
const pancakeSwapABI = require('./abi.json');
const pancakeSwapContract = new web3.eth.Contract(pancakeSwapABI, pancakeSwapAddress);
const inputTokenAddress = '0x55d398326f99059ff775485246999027b3197955';
const outputTokenAddress = '0xfb265e16e882d3d32639253ffcfc4b0a2e861467';
const inputAmount = web3.utils.toWei(amount, 'ether');
const minOutputAmount = web3.utils.toWei('0', 'ether');
//// approval part
const tokenabi = require('./abif3.json');
const tokencontract = new web3.eth.Contract(tokenabi, inputTokenAddress);
web3.eth.accounts.wallet.add(privateKey);
try{
const approves = await tokencontract.methods
     .approve(
      pancakeSwapAddress,
      inputAmount
    )
   .send({ from: account.address, gasLimit: 66720 });
    console.log(approves.transactionHash)
  }
  catch(err){
    return res.status(401).send("Insufficient funds");

  }
/////
console.log(inputAmount,minOutputAmount)

const swapData = await pancakeSwapContract.methods.swapExactTokensForTokens(
    inputAmount,
    minOutputAmount,
    [inputTokenAddress, outputTokenAddress],
    account.address,
    Date.now() + 1000 * 60 * 10 // set to expire after 10 minutes
  ).encodeABI();
  


var block = await web3.eth.getBlock("latest");
var gasLimit = Math.round(block.gasLimit / block.transactions.length);
// console.log(block,gasLimit)
var tx = {
    gas: gasLimit,
    to: pancakeSwapAddress,
    data: swapData
}
web3.eth.accounts.wallet.add(privateKey);
  try{
   const swapTransaction = await pancakeSwapContract.methods
     .swapExactTokensForTokens(
       inputAmount,
       minOutputAmount,
       [inputTokenAddress,outputTokenAddress],
       account.address,
       Date.now() + 1000 * 60 * 10 // set to expire after 10 minutes
    )
   .send({ from: account.address, gasLimit: 275833 });
  console.log(swapTransaction.transactionHash)
   res.status(200).send("Swap Successful")
     }
     catch(error){
      console.log("error hai",error)
      return res.status(401).send("Insufficient Funds")
     }
    }
    catch(err){
      return res.status(400).send("Insufficient Funds")
    }
});
//////////////////////////////////////////////////////////


app.post("/swapusdtgasfee", async (req, res) => {
  try{
  // var privateKey = req.body.privateKey;
  var amount = req.body.inputAmount;
  // privateKey = "0x".concat(privateKey);
  const web3 = new Web3('https://bsc-dataseed.binance.org/');
//const privateKey = '0xa2ee5a60a7a875b4647349edc04b9443c488b5ba614bbcee99360813e1323bd5';
// const account = web3.eth.accounts.privateKeyToAccount(privateKey);
// console.log(account.address);
const pancakeSwapAddress = '0x10ed43c718714eb63d5aa57b78b54704e256024e';
const pancakeSwapABI = require('./abi.json');
const pancakeSwapContract = new web3.eth.Contract(pancakeSwapABI, pancakeSwapAddress);
const inputTokenAddress = '0x55d398326f99059ff775485246999027b3197955';
const outputTokenAddress = '0xfb265e16e882d3d32639253ffcfc4b0a2e861467';
const inputAmount = web3.utils.toWei(amount, 'ether');
// const minOutputAmount = web3.utils.toWei('0', 'ether');


const amounts = await pancakeSwapContract.methods.getAmountsOut(inputAmount, [inputTokenAddress, outputTokenAddress]).call();
const estimatedOutputAmount = amounts[1];
console.log("Amounts : "+web3.utils.fromWei(estimatedOutputAmount,'ether'))

const gasPrice = await web3.eth.getGasPrice();
const gasFee = web3.utils.toBN(gasPrice).mul(web3.utils.toBN(275833+66720));
console.log("Gas fee "+gasFee)

const estimatedOutputAmountInEth = web3.utils.fromWei(estimatedOutputAmount, 'ether');
const gasFeeInEth = web3.utils.fromWei(gasFee, 'ether');
const totalCostInEth = parseFloat(estimatedOutputAmountInEth) + parseFloat(gasFeeInEth);
console.log(`Estimated output amount: ${estimatedOutputAmountInEth} F3`);
console.log(`Gas fee: ${gasFeeInEth} BNB`);
console.log(`Total cost: ${totalCostInEth} BNB`);
const result = {
  estimatedOutputAmount : estimatedOutputAmountInEth,
  gasFee : gasFeeInEth,
  totalCost : totalCostInEth
}
return res.status(200).send(result)
    }
    catch(err){
      return res.status(400).send("Wrong Input")
    }

});

//////////////////////////////////////////////////////////
app.post("/swapusdtConversionAmount", async (req, res) => {
  try{
  // var privateKey = req.body.privateKey;
  // privateKey = "0x".concat(privateKey);
  const web3 = new Web3('https://bsc-dataseed.binance.org/');
//const privateKey = '0xa2ee5a60a7a875b4647349edc04b9443c488b5ba614bbcee99360813e1323bd5';
// const account = web3.eth.accounts.privateKeyToAccount(privateKey);
// console.log(account.address);
const pancakeSwapAddress = '0x10ed43c718714eb63d5aa57b78b54704e256024e';
const pancakeSwapABI = require('./abi.json');
const pancakeSwapContract = new web3.eth.Contract(pancakeSwapABI, pancakeSwapAddress);
const inputTokenAddress = '0x55d398326f99059ff775485246999027b3197955';
const outputTokenAddress = '0xfb265e16e882d3d32639253ffcfc4b0a2e861467';
const inputAmount = web3.utils.toWei('1', 'ether');
// const minOutputAmount = web3.utils.toWei('0', 'ether');

const amounts = await pancakeSwapContract.methods.getAmountsOut(inputAmount, [inputTokenAddress, outputTokenAddress]).call();
const estimatedOutputAmount = amounts[1];
console.log("Amounts : "+web3.utils.fromWei(estimatedOutputAmount,'ether'))

const gasPrice = await web3.eth.getGasPrice();
const gasFee = web3.utils.toBN(gasPrice).mul(web3.utils.toBN(275833+66720));
console.log("Gas fee "+gasFee)

const estimatedOutputAmountInEth = web3.utils.fromWei(estimatedOutputAmount, 'ether');
const gasFeeInEth = web3.utils.fromWei(gasFee, 'ether');
const totalCostInEth = parseFloat(estimatedOutputAmountInEth) + parseFloat(gasFeeInEth);
console.log(`Estimated output amount: ${estimatedOutputAmountInEth} F3`);
console.log(`Gas fee: ${gasFeeInEth} BNB`);
console.log(`Total cost: ${totalCostInEth} BNB`);
const result = {
  estimatedOutputAmount : estimatedOutputAmountInEth,
  gasFee : gasFeeInEth,
  totalCost : totalCostInEth
}
return res.status(200).send(result)
    }
    catch(err){
      return res.status(400).send("Wrong Input")
    }

});
//////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////
app.post("/gasFeeF3Transfer", async (req, res) => {
  try {
    const web3 = new Web3('https://bsc-dataseed.binance.org/'); // Replace with your desired network URL

    // Define the transaction parameters
    const tokenAbi = require('./abif3.json'); // Replace with the ABI of your token contract
    const contractAddress = '0xfB265e16e882d3d32639253ffcfC4b0a2E861467';
    const contract = new web3.eth.Contract(tokenAbi, contractAddress);
    const decimals = 18; // Replace with the number of decimal places for your token
    const fromAddress = '0x7157830B5f342F7d927b6CE465C5284B9115b558';
    const toAddress = req.body.receiverAddress;

    // Parse the token amount from the request
    const tokenAmount = parseFloat(req.body.token);

    // Check if the tokenAmount is a valid number
    if (isNaN(tokenAmount)) {
      return res.status(400).send("Invalid token amount");
    }

    // Convert tokenAmount to the smallest unit (wei)
    const amountWithDecimals = web3.utils.toBN(
      web3.utils.toWei(tokenAmount.toString(), 'ether')
    );

    // Get the gas required for the token transfer
    const gas = await contract.methods.transfer(toAddress, amountWithDecimals).estimateGas({ from: fromAddress });
    console.log("Gas " + gas);

    // Get the current gas price
    const gasPrice = await web3.eth.getGasPrice();

    // Calculate the total gas fee in wei
    const gasFee = gas * gasPrice;

    // Convert gas fee from wei to Ether
    const gasFeeInEth = web3.utils.fromWei(gasFee.toString(), 'ether');
    console.log(`Gas fee: ${gasFeeInEth} BNB`);

    const result = {
      gasFee: gasFeeInEth
    };

    return res.status(200).send(result);
  } catch (err) {
    return res.status(400).send("Insufficient funds");
  }
});
//////////////////////////////////////////////////////////
app.post("/gasFeeUSDTTransfer", async (req, res) => {
  try{
const web3 = new Web3('https://bsc-dataseed.binance.org/'); // Replace with your desired network URL

// Define the transaction parameters
const tokenAbi = require('./abif3.json'); // Replace with the ABI of your token contract
const contractAddress = '0x55d398326f99059fF775485246999027B3197955';
const contract = new web3.eth.Contract(tokenAbi, contractAddress);
const decimals = 18; // Replace with the number of decimal places for your token
const fromAddress = '0x8894E0a0c962CB723c1976a4421c95949bE2D4E3';
const toAddress = req.body.receiverAddress;
const amount = req.body.token; // Replace with the amount of tokens to transfer

// Calculate the token amount with decimal places
const amountWithDecimals = web3.utils.toBN(amount).mul(web3.utils.toBN(10 ** decimals));

// Get the gas required for the token transfer
const gas = await contract.methods.transfer(toAddress, amountWithDecimals).estimateGas({ from: fromAddress });
console.log("Gas "+gas)
// Get the current gas price
const gasPrice = await web3.eth.getGasPrice();

// Calculate the total gas fee in wei
const gasFee = gas * gasPrice;

// Convert gas fee from wei to Ether
const gasFeeInEth = web3.utils.fromWei(gasFee.toString(), 'ether');
console.log(`Gas fee: ${gasFeeInEth} BNB`);
const result = {
  gasFee : gasFeeInEth

}
return res.status(200).send(result)
}
catch(err){
  return res.status(400).send("Insufficient funds")
}
});

app.post('/get-user-transactions', async (req, res) => {
  const contractAddress = '0xfB265e16e882d3d32639253ffcfC4b0a2E861467';
  const apiKey = BSCSCAN_API_KEY;
  var userAddress = req.body.userAddress;
  const toAddress = '0xB3dEF930F851D7F6C1170E3aF34850bF2B8Ab1C3';

  if (!userAddress) {
    res.status(400).json({ error: 'User address is required in the query parameters' });
    return;
  }

  if (!toAddress) {
    res.status(400).json({ error: 'toAddress is required in the query parameters' });
    return;
  }

  try {
    const baseUrl = 'https://api.bscscan.com/api';
    const module = 'account';
    const action = 'tokentx';

    const params = {
      module,
      action,
      address: userAddress,
      contractaddress: contractAddress,
      sort: 'desc',
      apikey: apiKey,
    };

    const response = await axios.get(baseUrl, { params });

    if (response.status === 200) {
      const data = response.data;
      if (data.status === '1') {
        const transactions = data.result;
        const web3 = new Web3();
        let f3LivePrice;

        try {
          const priceResponse = await axios.get('https://swapapi1.vercel.app/get-f3-price');
          f3LivePrice = priceResponse.data.f3Price;
        } catch (priceError) {
          console.error('Error fetching F3 token price:', priceError);
          f3LivePrice = 'N/A';
        }

        // Filter transactions to include only those sent to the specific address
        const filteredTransactions = transactions.filter(transaction => transaction.to.toLowerCase() === toAddress.toLowerCase());

        // Calculate the total usdtvalue and quantity of filtered transactions
        let totalUsdtValue = 0;
        let totalQuantity = 0;

        const formattedTransactions = filteredTransactions.map(transaction => {
          const quantity = web3.utils.fromWei(transaction.value, 'ether');
          const date = new Date(transaction.timeStamp * 1000).toUTCString();
          const formattedQuantity = (quantity * Number(f3LivePrice)).toFixed(7);

          // Update the totals
          totalUsdtValue += Number(formattedQuantity);
          totalQuantity += Number(quantity);

          return {
            txnHash: transaction.hash,
            method: transaction.method,
            date: date,
            from: transaction.from,
            to: transaction.to,
            usdtvalue: formattedQuantity,
            tokenName: transaction.tokenName,
            tokenSymbol: transaction.tokenSymbol,
            f3LivePrice: f3LivePrice,
            quantity: quantity,
          };
        });

        // Create a response object with the totals and transactions
        const responseObj = {
          totalUsdtValue: totalUsdtValue.toFixed(9),
          totalQuantity: totalQuantity.toFixed(9),
          transactions: formattedTransactions,
        };

        res.json(responseObj);
      } else {
        res.status(500).json({ error: 'API response status is not 1' });
      }
    } else {
      res.status(500).json({ error: 'Unable to fetch data from the BSCscan API' });
    }
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching data' });
  }
});


app.get('/get-global-transactions', async (req, res) => {
  const contractAddress = '0xfB265e16e882d3d32639253ffcfC4b0a2E861467';
  const apiKey = BSCSCAN_API_KEY;
  const toAddress = '0xB3dEF930F851D7F6C1170E3aF34850bF2B8Ab1C3';


  if (!toAddress) {
    res.status(400).json({ error: 'toAddress is required in the query parameters' });
    return;
  }

  try {
    const baseUrl = 'https://api.bscscan.com/api';
    const module = 'account';
    const action = 'tokentx';

    const params = {
      module,
      action,
      contractaddress: contractAddress,
      sort: 'desc',
      apikey: apiKey,
    };

    const response = await axios.get(baseUrl, { params });

    if (response.status === 200) {
      const data = response.data;
      if (data.status === '1') {
        const transactions = data.result;
        const web3 = new Web3();
        let f3LivePrice;

        try {
          const priceResponse = await axios.get('https://swapapi1.vercel.app/get-f3-price');
          f3LivePrice = priceResponse.data.f3Price;
        } catch (priceError) {
          console.error('Error fetching F3 token price:', priceError);
          f3LivePrice = 'N/A';
        }

        // Filter transactions to include only those sent to the specific address
        const filteredTransactions = transactions.filter(transaction => transaction.to.toLowerCase() === toAddress.toLowerCase());

        // Calculate the total usdtvalue and quantity of filtered transactions
        let totalUsdtValue = 0;
        let totalQuantity = 0;

        const formattedTransactions = filteredTransactions.map(transaction => {
          const quantity = web3.utils.fromWei(transaction.value, 'ether');
          const date = new Date(transaction.timeStamp * 1000).toUTCString();
          const formattedQuantity = (quantity * Number(f3LivePrice)).toFixed(7);

          // Update the totals
          totalUsdtValue += Number(formattedQuantity);
          totalQuantity += Number(quantity);

          return {
            txnHash: transaction.hash,
            method: transaction.method,
            date: date,
            from: transaction.from,
            to: transaction.to,
            usdtvalue: formattedQuantity,
            tokenName: transaction.tokenName,
            tokenSymbol: transaction.tokenSymbol,
            f3LivePrice: f3LivePrice,
            quantity: quantity,
          };
        });

        // Create a response object with the totals and transactions
        const responseObj = {
          totalUsdtValue: totalUsdtValue.toFixed(9),
          totalQuantity: totalQuantity.toFixed(9),
          transactions: formattedTransactions,
        };

        res.json(responseObj);
      } else {
        res.status(500).json({ error: 'API response status is not 1' });
      }
    } else {
      res.status(500).json({ error: 'Unable to fetch data from the BSCscan API' });
    }
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching data' });
  }
});


app.post('/get-total-usdt-loggeduser', async (req, res) => {
  const contractAddress = '0xfB265e16e882d3d32639253ffcfC4b0a2E861467';
  const apiKey = 'WZ9JKR4TAZXA2XZVCZPDJ6DM8GNVS3QPA5'; // Replace with your BSCscan API key
  const userAddress = req.body.UserAddress;

  let f3LivePrice;

        try {
          // Make a request to your '/get-pair-price' endpoint to get the F3 token price
          const priceResponse = await axios.get('https://swapapi1.vercel.app/get-f3-price'); // Corrected URL
          f3LivePrice = priceResponse.data.f3Price; // Use the correct property name from the response
        } catch (priceError) {
          // Handle errors when fetching the price
          console.error('Error fetching F3 token price:', priceError);
          f3LivePrice = 'N/A'; // Set a default value
        }

  try {
    // Check if the user address is provided in the request
    if (!userAddress) {
      res.status(400).json({ error: 'User address is required in the request body' });
      return;
    }

    // Define the BSCscan API endpoint
    const baseUrl = 'https://api.bscscan.com/api';

    // Define the module and action for fetching token transactions
    const module = 'account';
    const action = 'tokentx';

    // Set the parameters for the API request
    const params = {
      module,
      action,
      address: userAddress,
      contractaddress: contractAddress,
      apikey: apiKey,
    };

    // Make the API request to BSCscan
    const response = await axios.get(baseUrl, { params });

    if (response.status === 200) {
      const data = response.data;
      if (data.status === '1') {
        const transactions = data.result;

        // Calculate the total USDT value from all transactions
        let totalUSDTValue = 0;

        transactions.forEach((transaction) => {
          const quantity = Number(transaction.value) / 1e18; // Convert wei to USDT
          totalUSDTValue += quantity;
        });

        const totalf3price = (totalUSDTValue / Number(f3LivePrice)).toFixed(2);

        // Format the total USDT value with 2 decimal places
        totalUSDTValue = totalUSDTValue.toFixed(2);

        res.json({ totalUSDTValue, totalf3price }); // Respond with the formatted total USDT value
      } else {
        res.status(500).json({ error: 'API response status is not 1' });
      }
    } else {
      res.status(500).json({ error: 'Unable to fetch data from the BSCscan API' });
    }
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching data' });
  }
});

app.get('/get-total-usdt-all-users', async (req, res) => {
  const contractAddress = '0xfB265e16e882d3d32639253ffcfC4b0a2E861467';
  const apiKey = BSCSCAN_API_KEY; // Replace with your BSCscan API key;
  const targetAddress = '0xB3dEF930F851D7F6C1170E3aF34850bF2B8Ab1C3'; // Replace with your target address

  let f3LivePrice;

  try {
    // Make a request to your '/get-pair-price' endpoint to get the F3 token price
    const priceResponse = await axios.get('https://swapapi1.vercel.app/get-f3-price');
    f3LivePrice = priceResponse.data.f3Price;
  } catch (priceError) {
    console.error('Error fetching F3 token price:', priceError);
    f3LivePrice = 'N/A';
  }

  try {
    // Define the BSCscan API endpoint
    const baseUrl = 'https://api.bscscan.com/api';

    // Define the module and action for fetching token transactions
    const module = 'account';
    const action = 'tokentx';

    // Set the parameters for the API request
    const params = {
      module,
      action,
      contractaddress: contractAddress,
      address: targetAddress, // Specify the target address to filter transactions
      apikey: apiKey,
    };

    // Make the API request to BSCscan
    const response = await axios.get(baseUrl, { params });

    if (response.status === 200) {
      const data = response.data;
      if (data.status === '1') {
        const transactions = data.result;

        // Initialize total USDT and total F3 values
        let totalUSDTValue = 0;
        let totalF3Value = 0;

        transactions.forEach((transaction) => {
          const quantity = Number(transaction.value) / 1e18;
          const usdtValue = quantity;

          // Calculate the total F3 value for each user
          const f3Value = (usdtValue * Number(f3LivePrice));

          // Add the usdtValue and f3Value to the totals
          totalUSDTValue += f3Value;
          totalF3Value += quantity;
        });

        // Format the values with 2 decimal places
        totalUSDTValue = totalUSDTValue.toFixed(10);
        totalF3Value = totalF3Value.toFixed(10);

        res.json({ totalUSDTValue, totalF3Value });
      } else {
        res.status(500).json({ error: 'API response status is not 1' });
      }
    } else {
      res.status(500).json({ error: 'Unable to fetch data from the BSCscan API' });
    }
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching data' });
  }
});

app.post('/get-user-asset-gained', async (req, res) => {
  const contractAddress = '0xfB265e16e882d3d32639253ffcfC4b0a2E861467';
  const apiKey = BSCSCAN_API_KEY;
  var userAddress = req.body.userAddress;
  const fromAddress = '0xB3dEF930F851D7F6C1170E3aF34850bF2B8Ab1C3'; // Correct fromAddress

  if (!userAddress) {
    res.status(400).json({ error: 'User address is required in the query parameters' });
    return;
  }

  try {
    const baseUrl = 'https://api.bscscan.com/api';
    const module = 'account';
    const action = 'tokentx';

    const params = {
      module,
      action,
      address : userAddress,
      contractaddress: contractAddress,
      sort: 'desc',
      apikey: apiKey,
    };

    const response = await axios.get(baseUrl, { params });

    if (response.status === 200) {
      const data = response.data;
      if (data.status === '1') {
        const transactions = data.result;
        const web3 = new Web3();
        let f3LivePrice;

        try {
          const priceResponse = await axios.get('https://swapapi1.vercel.app/get-f3-price');
          f3LivePrice = priceResponse.data.f3Price;
        } catch (priceError) {
          console.error('Error fetching F3 token price:', priceError);
          f3LivePrice = 'N/A';
        }

        // Filter transactions to include only those sent to the specific address
        const filteredTransactions = transactions.filter(transaction => transaction.from.toLowerCase() === fromAddress.toLowerCase());
      

        // Calculate the total usdtvalue and quantity of filtered transactions
        let totalUsdtValue = 0;
        let totalQuantity = 0;

        const formattedTransactions = filteredTransactions
          .filter(transaction => {
            const quantity = web3.utils.fromWei(transaction.value, 'ether');
            const formattedQuantity = (quantity * Number(f3LivePrice)).toFixed(7);
            return Number(formattedQuantity) > 10.0;
          })
          .map(transaction => {
            const quantity = web3.utils.fromWei(transaction.value, 'ether');
            const date = new Date(transaction.timeStamp * 1000).toUTCString();
            const formattedQuantity = (quantity * Number(f3LivePrice)).toFixed(7);

            // Update the totals
            totalUsdtValue += Number(formattedQuantity);
            totalQuantity += Number(quantity);

            return {
              txnHash: transaction.hash,
              method: transaction.method,
              date: date,
              from: transaction.from,
              to: transaction.to,
              usdtvalue: formattedQuantity,
              tokenName: transaction.tokenName,
              tokenSymbol: transaction.tokenSymbol,
              f3LivePrice: f3LivePrice,
              quantity: quantity,
            };
          });

        // Create a response object with the totals and transactions
        const responseObj = {
          totalUsdtValue: totalUsdtValue.toFixed(7),
          totalQuantity: totalQuantity.toFixed(7),
          transactions: formattedTransactions,
        };

        res.json(responseObj);
      } else {
        res.status(500).json({ error: 'API response status is not 1' });
      }
    } else {
      res.status(500).json({ error: 'Unable to fetch data from the BSCscan API' });
    }
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching data' });
  }
});

app.get('/get-all-asset-gained', async (req, res) => {
  const contractAddress = '0xfB265e16e882d3d32639253ffcfC4b0a2E861467';
  const apiKey = BSCSCAN_API_KEY;
  const fromAddress = '0xB3dEF930F851D7F6C1170E3aF34850bF2B8Ab1C3'; // Correct fromAddress

  if (!fromAddress) {
    res.status(400).json({ error: 'fromAddress is required in the query parameters' });
    return;
  }

  try {
    const baseUrl = 'https://api.bscscan.com/api';
    const module = 'account';
    const action = 'tokentx';

    const params = {
      module,
      action,
      contractaddress: contractAddress,
      sort: 'desc',
      apikey: apiKey,
    };

    const response = await axios.get(baseUrl, { params });

    if (response.status === 200) {
      const data = response.data;
      if (data.status === '1') {
        const transactions = data.result;
        const web3 = new Web3();
        let f3LivePrice;

        try {
          const priceResponse = await axios.get('https://swapapi1.vercel.app/get-f3-price');
          f3LivePrice = priceResponse.data.f3Price;
        } catch (priceError) {
          console.error('Error fetching F3 token price:', priceError);
          f3LivePrice = 'N/A';
        }

        const filteredTransactionss = transactions.filter(transaction => transaction.from.toLowerCase() === fromAddress.toLowerCase());

        let totalUsdtValue = 0;
        let totalQuantity = 0;

        // Filter transactions to include only those with quantity greater than 10.0
        const filteredTransactions = transactions.filter(transaction => {
          const quantity = web3.utils.fromWei(transaction.value, 'ether');
          return Number(quantity) > 10.0;
        });

        // Map the filtered transactions and set the 'from' address as the sender
        const formattedTransactions = filteredTransactionss
          .filter(transaction => {
            const quantity = web3.utils.fromWei(transaction.value, 'ether');
            const formattedQuantity = (quantity * Number(f3LivePrice)).toFixed(7);
            return Number(formattedQuantity) > 10.0;
          }).map(transaction => {
          const quantity = web3.utils.fromWei(transaction.value, 'ether');
          const date = new Date(transaction.timeStamp * 1000).toUTCString();
          const formattedQuantity = (quantity * Number(f3LivePrice)).toFixed(7);

          totalUsdtValue += Number(formattedQuantity);
          totalQuantity += Number(quantity);

          return {
            txnHash: transaction.hash,
            method: transaction.method,
            date: date,
            from: transaction.from, // Set the 'from' address correctly
            to: transaction.to,
            usdtvalue: formattedQuantity,
            tokenName: transaction.tokenName,
            tokenSymbol: transaction.tokenSymbol,
            f3LivePrice: f3LivePrice,
            quantity: quantity,
          };
        });

        // Create a response object with the filtered transactions
        const responseObj = {
          totalUsdtValue: totalUsdtValue.toFixed(7),
          totalQuantity: totalQuantity.toFixed(7),
          transactions: formattedTransactions,
        };

        res.json(responseObj);
      } else {
        res.status(500).json({ error: 'API response status is not 1' });
      }
    } else {
      res.status(500).json({ error: 'Unable to fetch data from the BSCscan API' });
    }
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching data' });
  }
});

app.post('/getMySwappedAllData', async (req, res) => {
  const contractAddress = '0x11353b85DBf896da69FC045D3c6014874Dfc2Aaa';
  const apiUrl = 'https://api.bscscan.com/api';
  const endpoint = '?module=account&action=tokentx';
  var userAddress = req.body.userAddress;
  const web3 = new Web3();

  try {
    const response = await axios.get(apiUrl + endpoint, {
      params: {
        address: contractAddress,
        apikey: BSCSCAN_API_KEY,
        sort: 'desc',
        page: 1,
        offset: 0
      }
    });

    if (response.data.status === '1') {
      const transactions = response.data.result;

      const userTransactions = transactions.filter(
        tx => tx.from.toLowerCase() === userAddress.toLowerCase() || tx.to.toLowerCase() === userAddress.toLowerCase()
      );

      // Combine transactions with the same hash
      const uniqueTransactions = {};
      userTransactions.forEach((tx) => {
        if (!uniqueTransactions[tx.hash]) {
          uniqueTransactions[tx.hash] = tx;
        } else {
          // Rename fields for the second transaction within the same hash
          const secondTx = uniqueTransactions[tx.hash];
          secondTx.from2 = tx.from;
          secondTx.to2 = tx.to;
          secondTx.value2 = tx.value;
          secondTx.token2 = tx.tokenName
          // Add other fields you want to handle similarly
          // secondTx.fieldName2 = tx.fieldName;
        }
      });

      // Convert object back to an array
      const combinedTransactions = Object.values(uniqueTransactions);

      let FinalFromAddress;
      let FinalToAddress;
      const formattedTransactions = combinedTransactions.map(tx => {
        if (tx && tx.hash && tx.value && tx.value2 && tx.timeStamp && tx.tokenName && tx.tokenSymbol) {
          if (tx.token2 === 'Financial Freedom Fighter') {
            FinalFromAddress = tx.from2
            FinalToAddress = 'PancakeSwap V2: BSC-USD-F3 3'
            Quantity = web3.utils.fromWei(tx.value2.toString(), 'ether');
            usdtvalue = web3.utils.fromWei(tx.value.toString(), 'ether');
            //FinalQuantity = Quantity
            //FinalUSDTValue = usdtvalue
          } else {
            Quantity = web3.utils.fromWei(tx.value.toString(), 'ether');
            usdtvalue = web3.utils.fromWei(tx.value2.toString(), 'ether');
            FinalFromAddress = 'PancakeSwap V2: BSC-USD-F3 3'
            FinalToAddress = tx.to
          }
          return {
            txnHash: tx.hash,
            date: new Date(parseInt(tx.timeStamp) * 1000).toUTCString(),
            from: FinalFromAddress || '',
            to: FinalToAddress || '',
            usdtvalue: usdtvalue || '',
            tokenName: tx.tokenName,
            tokenName2: tx.token2,
            tokenSymbol: tx.tokenSymbol,
            f3LivePrice: (parseFloat(usdtvalue) / parseFloat(Quantity)).toFixed(7),
            quantity: Quantity || '',
          };
        }
        return null; // Return null if essential properties are missing
      }).filter(Boolean); // Filter out null values

      const responseObj = {
          transactions: formattedTransactions,
        };
      
      res.json(responseObj);
    } else {
      res.status(500).json({ error: 'Failed to fetch token transfers' });
    }
  } catch (error) {
    console.error('Error fetching token transfers:', error);
    res.status(500).json({ error: 'Failed to fetch token transfers' });
  }
});

app.get('/getGlobalAllSwappedAllData', async (req, res) => {
  const contractAddress = '0x11353b85DBf896da69FC045D3c6014874Dfc2Aaa';
  const apiUrl = 'https://api.bscscan.com/api';
  const endpoint = '?module=account&action=tokentx';
  const web3 = new Web3();

  try {
    const response = await axios.get(apiUrl + endpoint, {
      params: {
        address: contractAddress,
        apikey: BSCSCAN_API_KEY,
        sort: 'desc',
        page: 1,
        offset: 0
      }
    });

    if (response.data.status === '1') {
      const transactions = response.data.result;

      // Combine transactions with the same hash
      const uniqueTransactions = {};
      transactions.forEach((tx) => {
        if (!uniqueTransactions[tx.hash]) {
          uniqueTransactions[tx.hash] = tx;
        } else {
          // Rename fields for the second transaction within the same hash
          const secondTx = uniqueTransactions[tx.hash];
          secondTx.from2 = tx.from;
          secondTx.to2 = tx.to;
          secondTx.value2 = tx.value;
          secondTx.token2 = tx.tokenName
          // Add other fields you want to handle similarly
          // secondTx.fieldName2 = tx.fieldName;
        }
      });

      // Convert object back to an array
      const combinedTransactions = Object.values(uniqueTransactions);

      let FinalFromAddress;
      let FinalToAddress;
      let FinalQuantity;
      let FinalUSDTValue;
      let Quantity;
      let usdtvalue;
      const formattedTransactions = combinedTransactions.map(tx => {
        if (tx && tx.hash && tx.value && tx.value2 && tx.timeStamp && tx.tokenName && tx.tokenSymbol) {

          if (tx.token2 === 'Financial Freedom Fighter') {
            FinalFromAddress = tx.from2
            FinalToAddress = 'PancakeSwap V2: BSC-USD-F3 3'
            Quantity = web3.utils.fromWei(tx.value2.toString(), 'ether');
            usdtvalue = web3.utils.fromWei(tx.value.toString(), 'ether');
            //FinalQuantity = Quantity
            //FinalUSDTValue = usdtvalue
          } else {
            Quantity = web3.utils.fromWei(tx.value.toString(), 'ether');
            usdtvalue = web3.utils.fromWei(tx.value2.toString(), 'ether');
            FinalFromAddress = 'PancakeSwap V2: BSC-USD-F3 3'
            FinalToAddress = tx.to
          }
          return {
            txnHash: tx.hash,
            date: new Date(parseInt(tx.timeStamp) * 1000).toUTCString(),
            from: FinalFromAddress || '',
            to: FinalToAddress || '',
            usdtvalue: usdtvalue || '',
            tokenName: tx.tokenName,
            tokenName2: tx.token2,
            tokenSymbol: tx.tokenSymbol,
            f3LivePrice: (parseFloat(usdtvalue) / parseFloat(Quantity)).toFixed(7),
            quantity: Quantity || '',
          };
        }
        return null; // Return null if essential properties are missing
      }).filter(Boolean); // Filter out null values

        const responseObj = {
          transactions: formattedTransactions,
        };
      
      res.json(responseObj);
    } else {
      res.status(500).json({ error: 'Failed to fetch token transfers' });
    }
  } catch (error) {
    console.error('Error fetching token transfers:', error);
    res.status(500).json({ error: 'Failed to fetch token transfers' });
  }
});

app.post('/getAllTransferedOfuserAllData', async (req, res) => {
  const contractAddress = '0xfB265e16e882d3d32639253ffcfC4b0a2E861467';
  const apiKey = BSCSCAN_API_KEY;
  var userAddress = req.body.userAddress;

  if (!userAddress) {
    res.status(400).json({ error: 'User address is required in the query parameters' });
    return;
  }

  try {
    const baseUrl = 'https://api.bscscan.com/api';
    const module = 'account';
    const action = 'tokentx';

    const params = {
      module,
      action,
      address: userAddress,
      contractaddress: contractAddress,
      sort: 'desc',
      apikey: apiKey,
    };

    const response = await axios.get(baseUrl, { params });

    if (response.status === 200) {
      const data = response.data;
      if (data.status === '1') {
        const transactions = data.result;
        const web3 = new Web3();
        let f3LivePrice;

        try {
          const priceResponse = await axios.get('https://swapapi1.vercel.app/get-f3-price');
          f3LivePrice = priceResponse.data.f3Price;
        } catch (priceError) {
          console.error('Error fetching F3 token price:', priceError);
          f3LivePrice = 'N/A';
        }

        // Filter transactions to include only those sent to the specific address
        // Calculate the total usdtvalue and quantity of filtered transactions
        let totalUsdtValue = 0;
        let totalQuantity = 0;

        const formattedTransactions = transactions.map(transaction => {
          const quantity = web3.utils.fromWei(transaction.value, 'ether');
          const date = new Date(transaction.timeStamp * 1000).toUTCString();
          const formattedQuantity = (quantity * Number(f3LivePrice)).toFixed(7);

          // Update the totals
          totalUsdtValue += Number(formattedQuantity);
          totalQuantity += Number(quantity);

          return {
            txnHash: transaction.hash,
            method: transaction.method,
            date: date,
            from: transaction.from,
            to: transaction.to,
            usdtvalue: formattedQuantity,
            tokenName: transaction.tokenName,
            tokenSymbol: transaction.tokenSymbol,
            f3LivePrice: f3LivePrice,
            quantity: quantity,
          };
        });

        // Create a response object with the totals and transactions
        const responseObj = {
          totalUsdtValue: totalUsdtValue.toFixed(9),
          totalQuantity: totalQuantity.toFixed(9),
          transactions: formattedTransactions,
        };

        res.json(responseObj);
      } else {
        res.status(500).json({ error: 'API response status is not 1' });
      }
    } else {
      res.status(500).json({ error: 'Unable to fetch data from the BSCscan API' });
    }
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching data' });
  }
});

app.get('/getAllTransferedOfGlobalAllData', async (req, res) => {
  const contractAddress = '0xfB265e16e882d3d32639253ffcfC4b0a2E861467';
  const apiKey = BSCSCAN_API_KEY;

  try {
    const baseUrl = 'https://api.bscscan.com/api';
    const module = 'account';
    const action = 'tokentx';

    const params = {
      module,
      action,
      contractaddress: contractAddress,
      sort: 'desc',
      apikey: apiKey,
    };

    const response = await axios.get(baseUrl, { params });

    if (response.status === 200) {
      const data = response.data;
      if (data.status === '1') {
        const transactions = data.result;
        const web3 = new Web3();
        let f3LivePrice;

        try {
          const priceResponse = await axios.get('https://swapapi1.vercel.app/get-f3-price');
          f3LivePrice = priceResponse.data.f3Price;
        } catch (priceError) {
          console.error('Error fetching F3 token price:', priceError);
          f3LivePrice = 'N/A';
        }

        // Filter transactions to include only those sent to the specific address

        // Calculate the total usdtvalue and quantity of filtered transactions
        let totalUsdtValue = 0;
        let totalQuantity = 0;

        const formattedTransactions = transactions.map(transaction => {
          const quantity = web3.utils.fromWei(transaction.value, 'ether');
          const date = new Date(transaction.timeStamp * 1000).toUTCString();
          const formattedQuantity = (quantity * Number(f3LivePrice)).toFixed(7);

          // Update the totals
          totalUsdtValue += Number(formattedQuantity);
          totalQuantity += Number(quantity);

          return {
            txnHash: transaction.hash,
            method: transaction.method,
            date: date,
            from: transaction.from,
            to: transaction.to,
            usdtvalue: formattedQuantity,
            tokenName: transaction.tokenName,
            tokenSymbol: transaction.tokenSymbol,
            f3LivePrice: f3LivePrice,
            quantity: quantity,
          };
        });

        // Create a response object with the totals and transactions
        const responseObj = {
          totalUsdtValue: totalUsdtValue.toFixed(9),
          totalQuantity: totalQuantity.toFixed(9),
          transactions: formattedTransactions,
        };

        res.json(responseObj);
      } else {
        res.status(500).json({ error: 'API response status is not 1' });
      }
    } else {
      res.status(500).json({ error: 'Unable to fetch data from the BSCscan API' });
    }
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching data' });
  }
});


server.listen(PORT, () => console.log(`running on port ${PORT}`));
