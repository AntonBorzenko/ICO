var BigNumber = require('bignumber.js');

var ImmlaIco = artifacts.require("./ImmlaIco.sol");
var ImmlaToken = artifacts.require("./ImmlaToken.sol");
var PreIcoContract = artifacts.require("./PreIcoContract.sol");
var Importer1 = artifacts.require("./Importer1.sol");


/* user acounts */

var accounts = [
    "0xaec3ae5d2be00bfc91597d7a1b2c43818d84396a",
    "0xf1f42f995046e67b79dd5ebafd224ce964740da3",
    "0x918d3ac6c257c4dfe62152989428474c809d1a45",
    "0xcaeed947eeb1124e6cd63281055b0fce192af13f",
    "0xf862ff4b6ad7dd8e4e7a9aa61069faa1c4fd5ac1",
    "0x9f863efb256b43432eddf249dc35bafa13f30366",
    "0xf69c3f9f3fed65aaa0498dfde49cf933a9113084",
    "0xf6e2cc3b874b91e144bc7f1e2989941691eef99c",
    "0x3fb3e8431243cefb88ec1cb8669cd86c29ea9764",
    "0xb338c2fedcaadb6596ea7da5cb37de46c4522ba1",
    "0x05782fd20f1e86effb9cd749b77445a251d3c356",
    "0xa47c1f9f9f9be191e4ad94eb60536f865239ef7f"
];

var manager = accounts[0];
var founder1 = accounts[1];
var founder2 = accounts[2];
var founder3 = accounts[3];
var team = accounts[4];
var bountyOwner = accounts[5];
var hackerVasya = accounts[8];
var escrow = accounts[9];
var someUser = accounts[10];
var someUser2 = accounts[11];

var oldUser1 = accounts[6];
var oldUser2 = accounts[7];

var value1 = 123456;
var value2 = 789000;



/* some thennable functions */
const promisify = (inner) =>
    new Promise((resolve, reject) =>
        inner((err, res) => {
            if (err) { reject(err) }
            resolve(res);
        })
    );
  
const getBalance = (account, at) =>
    promisify(cb => web3.eth.getBalance(account, at ? at : 'latest', cb));
    
const sendEthers = (options) => 
    promisify(cb => web3.eth.sendTransaction(options, cb));
    
const throwable = (thennable, reason) => 
    promisify(cb => {
        var throwMessage = "Throwable exception";
        return thennable
            .then(function () {
                assert(false, throwMessage);
            })
            .catch(function (err) {
                if (err && err.message === throwMessage) {
                    assert(false, (reason ? reason : 'Throwable object did not throw error'));
                }
                cb(null);
            });
    });
    
    
const getSnapshot = () =>
    promisify(cb => web3.currentProvider.sendAsync({jsonrpc: "2.0", method: "evm_snapshot", params: [], id: 0}, function (err, res) {
        var id = null;
        if (res && res.result) {
            id = parseInt(res.result, 16);
        }
        cb(err, id);
    }));

const setSnapshot = (snapshotId) =>
    promisify(cb => web3.currentProvider.sendAsync({jsonrpc: "2.0", method: "evm_revert", params: [snapshotId], id: 0}, cb));

    
const increaseTime = addSeconds => 
    web3.currentProvider.send({jsonrpc: "2.0", method: "evm_increaseTime", params: [addSeconds], id: 0});

const getBlockNumber = () => web3.eth.getBlock('latest').number;
const getBlockTimestamp = () => web3.eth.getBlock('latest').timestamp;

/*     
const deployAllContracts = () =>
    promisify(function (cb) {
        var result = {};
        PreIcoContract.new(oldUser1, value1, oldUser2, value2)
            .then(function (preIco) {
                result.preIco = preIco;
                return ImmlaToken.new(manager, founder1, founder2, founder3, team, bountyOwner);
            })
            .then(function (token) {
                result.token = token;
                return ImmlaIco.new(result.token.address, result.preIco.address, escrow, manager, manager);
            })
            .then(function (ico) {
                result.ico = ico;
                return result.token.setIcoContract(result.ico.address, {from: manager});
            })
            .then(function () {
                cb(null, result);
            });
    });
 */
const deployedContracts = () =>
    promisify(cb => {
        var result = {};
        ImmlaIco.deployed()
            .then(function (immlaIco) {
                result.ico = immlaIco;
                return result.ico.immlaToken();
            })
            .then(function (tokenAddress) {
                result.token = ImmlaToken.at(tokenAddress);
                return result.ico.preIcoToken();
            })
            .then(function (preIco) {
                result.preIco = PreIcoContract(preIco);
                cb(null, result);
            });
    });
 
const deployContractsWithParams = (icoStartTime, icoEndTime, foundersRewardTime) => 
    promisify(cb => {
        var result = {};
        
        PreIcoContract.new(oldUser1, value1, oldUser2, value2)
            .then(function (preIco) {
                result.preIco = preIco;
                return ImmlaIco.new(manager, result.preIco.address, icoStartTime, icoEndTime, foundersRewardTime);
            })
            .then(function (ico) {
                result.ico = ico;
                return ico.immlaToken();
            })
            .then(function (tokenAddress) {
                result.token = ImmlaToken.at(tokenAddress);
                cb(null, result);
            })
    });

const deployContracts = () => deployContractsWithParams(0, 0, 0);
    
const initContractsWithParams = (icoStartTime, icoEndTime, foundersRewardTime) => 
    promisify(cb => {
        var contracts;
        deployContractsWithParams(icoStartTime, icoEndTime, foundersRewardTime)
            .then(function (_contracts) {
                contracts = _contracts;
                return contracts.ico.init(founder1, founder2, founder3, team, bountyOwner, escrow, {from: manager});
            })
            .then(function () {
                cb(null, contracts);
            });
    });

const initContracts = () => initContractsWithParams(0, 0, 0);




contract('ImmlaIco', function(accounts) { 
    /*
    it("Should be ethers on first account", function (done) {
        getBalance(accounts[0], 'latest')
            .then(function (balance) {
                assert(balance.toNumber() > 0, "balance is 0");
                done();
            });
    });
    
    it("Should work pre-ico contract well", function (done) {
        var preIcoContract;
        PreIcoContract.deployed()
            .then(function (_preIcoContract) {
                preIcoContract = _preIcoContract;
                return preIcoContract.balanceOf.call(oldUser1);
            })
            .then(function (balance1) {
                assert.equal(balance1, value1, "There is should be same value on acc1");
                return preIcoContract.balanceOf.call(oldUser2);
            })
            .then(function (balance2) {
                assert.equal(balance2, value2, "There is should be same value on acc2");
                done();
            })
    });
    
    
    it("Should be right vars", function (done) {
        var contracts;
        deployedContracts()
            .then(function (_contracts) {
                contracts = _contracts;
                return contracts.ico.founder1();
            })
            .then(function (_founder1) {
                assert.equal(founder1, _founder1, "founder addresses must be equal");
                return contracts.ico.foundersRewardTime();
            })
            .then(function (time) {
                assert.equal(time.toNumber(), 1521061200, "times are different");
                return contracts.ico.bountyOwner();
            })
            .then(function (_bountyOwner) {
                assert.equal(bountyOwner, _bountyOwner, "bounty owner addresses are different");
                return contracts.token.balanceOf.call(bountyOwner);
            })
            .then(function (balance) {
                assert(balance.equals("9361712198870680000000000"), "balances of bountyOwner are different");
                return contracts.ico.immlaToken();
            })
            .then(function (immlaTokenAddress) {
                assert.equal(immlaTokenAddress, contracts.token.address, "There are different addresses of Token");
                done();
            })
    });
    
    it("Should be protection by variable 'icoContract'", function (done) {
        var immlaToken;
        deployedContracts()
            .then(function (_contracts) {
                immlaToken = _contracts.token;
                return immlaToken.icoContract();
            })
            .then(function (icoContractAddress) {
                assert.equal(icoContractAddress, ImmlaIco.address, "Addresses are different");
                return immlaToken.emitTokens(hackerVasya, 10000, {from: hackerVasya});
            })
            .then(function () {
                console.log("emitTokens cant be called by hackerVasya");
                assert(false, "emitTokens cant be called by hackerVasya");
            })
            .catch(function () {
                return immlaToken.emitTokens(hackerVasya, 10000, {from: manager});
            })
            .then(function (result) {
                console.log("emitTokens cant be called by manager");
                assert(false, "emitTokens cant be called by manager");
            })
            .catch(function (err) {
                return immlaToken.burnTokens(bountyOwner, 10, {from: manager});
            })
            .then(function () {
                console.log("burnTokens cant be called by manager");
                assert(false, "burnTokens cant be called by manager");
            })
            .catch(function () {
                done();
            });
    });
    
    it("Should be imported nice", function (done) {
        var immlaToken;
        var immlaIco;
        
        deployedContracts()
            .then(function (_contracts) {
                immlaToken = _contracts.token;
                immlaIco = _contracts.ico;
                return immlaToken.balanceOf.call(oldUser1);
            })
            .then(function (balance) {
                assert.equal(balance, 0, "Balance of oldUser1 should be zero");
                return immlaToken.balanceOf.call(oldUser2);
            })
            .catch(function (err) {
                console.log("importError 1: ", err);
            })
            .then(function (balance) {
                assert.equal(balance, 0, "Balance of oldUser2 should be zero");
                return immlaIco.importTokens(oldUser1, {from: hackerVasya})
            })
            .then(function () {
                console.log("hackerVasya cannot import tokens");
                assert(false, "hackerVasya cannot import tokens");
            })
            .catch(function (err) {
                return immlaIco.importTokens(oldUser1, {from: oldUser1});
            })
            .then(function () {
                return immlaToken.balanceOf.call(oldUser1);
            })
            .then(function (balance1) {
                assert.equal(balance1, value1, "Balances must be equal");
                return immlaIco.importTokens(oldUser2, {from: manager});
            })
            .then(function () {
                return immlaToken.balanceOf.call(oldUser2);
            })
            .catch(function (err) {
                console.log("Import error 2: " + err);
            })
            .then(function (balance2) {
                assert.equal(balance2, value2, "Balances must be equal");
                return immlaIco.importTokens(oldUser2, {from: manager});
            })
            .then(function () {
                console.log("Balance can be imported only once")
                assert(false, "Balance can be imported only once");
            })
            .catch(function () {
                done();
            });
    });
    
    it("Should be correct setting new manager", function (done) {
        var immlaToken;
        var immlaIco;
        
        deployedContracts()
            .then(function (_contracts) {
                immlaToken = _contracts.token;
                immlaIco = _contracts.ico;
                return immlaIco.setNewManager(hackerVasya, {from: hackerVasya});
            })
            .then(function () {
                console.log("Hacker Vasya can not update manager");
                assert(false, "Hacker Vasya can not update manager");
            })
            .catch(function () {
                return immlaIco.setNewManager(team, {from: manager});
            })
            .then(function () {
                return immlaIco.icoManager();
            })
            .then(function (icoManager) {
                assert.equal(icoManager, team, "It cannot changed ico Manager");
                return immlaIco.setNewManager(manager, {from: team});
            })
            .then(function () {
                return immlaIco.icoManager();
            })
            .then(function (icoManager) {
                assert.equal(icoManager, manager, "ico manager must be manager");
                done();
            });
    });
    
    it("Should burn tokens right", function (done) {
        var immlaToken;
        var immlaIco;
        var balance1;
        
        deployedContracts()
            .then(function (_contracts) {
                immlaToken = _contracts.token;
                immlaIco = _contracts.ico;
                return immlaToken.balanceOf.call(oldUser1);
            })
            .then(function (balance) {
                balance1 = balance;
                assert(balance > 50, "oldUser1 must have a big balance");
                return immlaIco.burnTokens(oldUser1, 23, {from: manager});
            })
            .then(function () {
                return immlaToken.balanceOf.call(oldUser1);
            })
            .then(function (newBalance) {
                assert.equal(newBalance, balance1 - 23, "There should be other balance on oldUser1");
                return immlaIco.setStateMigrated({from: manager});
            })
            .then(function () {
                return immlaIco.migrated();
            })
            .catch(function (err) {
                console.log("burn tokens err:" + err);
            })
            .then(function (isMigrated) {
                assert.equal(isMigrated, true, "ICO is not migrated");
            })
            .catch(err => console.log("Assert: " + err))
            .then(function () {
                return immlaIco.burnTokens(oldUser1, 23, {from: manager});
            })
            .then(function () {
                console.log("Manager can burn tokens after migration");
                assert(false, "Manager can burn tokens after migration");
            })
            .catch(function (err) {
                done();
            });
    });
    
    it("Should be OK with sending funds", function (done) {
        var immlaToken;
        var immlaIco;
        
        var now = getBlockTimestamp();
        initContractsWithParams(now - 1000, now + 1000, now + 1000000)
            .then(function (_contracts) {
                immlaToken = _contracts.token;
                immlaIco = _contracts.ico;
                
                return sendEthers({from: someUser, to: immlaIco.address, value: 100, gas: 500000});
            })
            .then(function () {
                return immlaToken.balanceOf.call(someUser);
            })
            .then(function (someUserBalance) {
                assert.equal(someUserBalance.toNumber(), 3640 * 100, "There is buying is not ok");
                return getBalance(immlaIco.address);
            })
            .then(function (icoBalance) {
                assert.equal(icoBalance.toNumber(), 100, "Balance is not OK");
                return immlaIco.soldTokensOnIco();
            })
            .catch(function (err) {
                console.log(err);
            })
            .then(function (sold) {
                assert.equal(sold, 3640 * 100, "Sold other value");
                return immlaIco.withdrawEther({from: manager});
            })
            .then(function () {
                console.log("there is applyable withdrawEther");
                assert(false, "there is applyable withdrawEther");
            })
            .catch(function () {
                return immlaIco.stopIco({from: manager});
            })
            .then(function () { done(); })
    });
    
    
    it("Should be OK with many sending funds", function (done) {
        var immlaToken;
        var immlaIco;
        var prevBalance;
        var nextBalance;
        var base = 1000000000000000000;
        
        var now = getBlockTimestamp();
        
        initContractsWithParams(now - 1000, now + 1000, now + 1000000)
            .then(function (_contracts) {
                immlaToken = _contracts.token;
                immlaIco = _contracts.ico;
                return immlaIco.soldTokensOnIco();
            })
            .then(function (sold) {
                return sendEthers({from: someUser, to: immlaIco.address, value: new BigNumber(46718).mul(base).add(1).toFixed(), gas: 500000});
            })
            .then(function (tx) {
                return immlaToken.balanceOf.call(someUser);
            })
            .then(function (someUserBalance) {
                assert(someUserBalance.equals(new BigNumber(3640 * 46718).mul(base).add(3549)), "There is buying is not ok");
                return getBalance(immlaIco.address);
            })
            .then(function (icoBalance) {
                assert(new BigNumber(icoBalance).equals(new BigNumber(46718).mul(base).add(1)), "Balance is not OK");
                return immlaIco.soldTokensOnIco();
            })
            .then(function (sold) {
                assert(new BigNumber(sold).equals(new BigNumber(3640 * 46718).mul(base).add(3549)), "Sold other value");
                return getBalance(escrow);
            })
            .then(function (escrowBalance) {
                prevBalance = new BigNumber(escrowBalance);
                return immlaIco.withdrawEther({from: manager});
            })
            .then(function () {
                return getBalance(immlaIco.address);
            })
            .then(function (balance) {
                assert(balance.equals(0), "Balance of contract after withdraw should be 0");
                return getBalance(escrow);
            })
            .then(function (balance) {
                nextBalance = new BigNumber(balance);
                assert(nextBalance.sub(prevBalance).equals(new BigNumber(46718).mul(base).add(1)), "There is something wrong");
                done();
            });
    });
    
    it("Should be good with bad endings", function (done) {
        var contracts;
        var oldBalance;
        
        var now = getBlockTimestamp();
        
        initContractsWithParams(now - 1000, now + 1000, now + 1000000)
            .then(function (_contracts) {
                contracts = _contracts;
                return contracts.ico.icoManager();
            })
            .then(function (_manager) {
                assert.equal(_manager, manager, "There are different managers");
                return contracts.token.icoContract();
            })
            .then(function (icoContract) {
                assert.equal(icoContract, contracts.ico.address, "There is error with addresses equality");
                return getBalance(someUser2);
            })
            .then(function (balance) {
                oldBalance = new BigNumber(balance);
                return contracts.preIco.balanceOf.call(oldUser1);
            })
            .then(function (balance) {
                assert.equal(balance.toNumber(), value1, "There is bad deployed contracts");
                return sendEthers({from: someUser2, to: contracts.ico.address, value: 1000000000000000000, gas: 500000});
            })
            .catch(function (err) {
                console.log('error on sending funds:' + err);
            })
            .then(function () {
                return contracts.ico.withdrawEther({from: manager});
            })
            .then(function () {
                console.log("Sorry there is no withdrawEther before stopped or successful ICO");
                assert(false, "Sorry there is no withdrawEther before stopped or successful ICO");
            })
            .catch(function (err) {
                return contracts.ico.stopIco({from: manager});
            })
            .then(function () {
                return contracts.ico.withdrawEther({from: manager});
            })
            .then(function () {
                return getBalance(someUser2);
            })
            .then(function (balance) {
                assert(new BigNumber(balance).greaterThan(oldBalance.sub(1000000000000000000)), "There are not withdrawed funds");
                return getBalance(contracts.ico.address);
            })
            .then(function (icoBalance) {
                assert.equal(icoBalance.toNumber(), 0, "There are not withdrawed funds");
                done();
            });
    });
    
    it("Should be max limit", function (done) {
        var contracts;
        var now = getBlockTimestamp();
        
        initContractsWithParams(now - 1000, now + 1000, now + 1000000)
            .then(function (_contracts) {
                contracts = _contracts;
                return contracts.ico.icoStart();
            })
            .then(function (startDate) {
                assert(startDate.equals(now - 1000), "There is different times");
            })
            .catch(err => console.log("Max limit: " + err))
            .then(function () {
                return sendEthers({from: someUser2, to: contracts.ico.address, value: new BigNumber(46718 * 5).mul(1000000000000000000).toFixed(), gas: 500000});
            })
            .then(function () {
                assert(false, "There is cannot be so much sum");
                console.log("There is cannot be so much sum");
            })
            .catch(function (err) {
                done();
            });
    });
    
    it("Should be broken transaction before starting", function (done) {
        var contracts;
        var now = getBlockTimestamp();
        
        initContractsWithParams(now + 1000, now + 10000, now + 1000000)
            .then(function (_contracts) {
                contracts = _contracts;
                return throwable(
                    sendEthers({from: hackerVasya, to: contracts.ico.address, value: 100, gas: 500000}),
                    "ICO contract should not receive ethers brefore start"
                )
            })
            .then(function () {
                done();
            })
    });
    
    it("Should be broken transaction after ending", function (done) {
        var contracts;
        var now = getBlockTimestamp();
        
        initContractsWithParams(now - 10000, now - 1000, now + 1000000)
            .then(function (_contracts) {
                contracts = _contracts;
                return throwable(
                    sendEthers({from: hackerVasya, to: contracts.ico.address, value: 100, gas: 500000}),
                    "ICO contract should not receive ethers after ICO ending"
                )
            })
            .then(function () {
                done();
            })
    });
    
    it("Should be send tokens to founders", function (done) {
        var contracts;
        var now = getBlockTimestamp();
        
        var tokensOnPreIco = new BigNumber("13232941687168431951684000");
        var wiesToSend = new BigNumber(1000000000000000000).mul(46718 + 10000);
        var tokensOnIco = new BigNumber(46718 * 3640 + 10000 * 3549).mul(1000000000000000000);
        
        var sum = tokensOnPreIco.add(tokensOnIco);
        var totalCountOfTokens = sum.div(0.813).floor();
        var totalRewardForFounders = totalCountOfTokens.mul(0.1).floor();
        var founder1Rew = totalRewardForFounders.mul(0.43).floor();
        var founder2Rew = totalRewardForFounders.mul(0.43).floor();
        var founder3Rew = totalRewardForFounders.mul(0.14).floor();
        
        initContractsWithParams(now - 10000, now + 1000, now - 1000000)
            .then(function (_contracts) {
                contracts = _contracts;
                return sendEthers({from: someUser2, to: contracts.ico.address, value: wiesToSend.toFixed(), gas: 500000});
            })
            .then(function () {
                return contracts.ico.sendTokensToFounders({from: manager})
            })
            .then(function () {
                return contracts.token.balanceOf(founder1)
            })
            .then(function (_founder1Balance) {
                assert(_founder1Balance.equals(founder1Rew), "Wrong balance for founder 1")
                return contracts.token.balanceOf(founder2)
            })
            .then(function (_founder2Balance) {
                assert(_founder2Balance.equals(founder2Rew), "Wrong balance for founder 2")
                return contracts.token.balanceOf(founder3)
            })
            .then(function (_founder3Balance) {
                assert(_founder3Balance.equals(founder3Rew), "Wrong balance for founder 3")
                return throwable(contracts.ico.sendTokensToFounders({from: manager}), "sendTokensToFounders cant be called twice")
            })
            .then(() => { done() })
    });
    
    it("Should be dont send tokens to founders before good time", function (done) {
        var contracts;
        var now = getBlockTimestamp();
        initContractsWithParams(now - 10000, now - 1000, now + 1000000)
            .then(function (_contracts) {
                contracts = _contracts;
                return throwable(
                    contracts.ico.sendTokensToFounders({from: manager}),
                    "You cant send tokens to founders before rewardTime"
                )
            })
            .then( () => { done() })
    })
    */
    it("Should be imported well", function () {
        var preIco;
        var ico;
        var importer;
        var token;
        
        var user1 = "0x32ba9a7d0423e03a525fe2ebeb661d2085778bd8";
        var user2 = "0x1e2368f7c2fdb0cffc3d2014d6749bb71aa07257";
        
        return Importer1.new({from: someUser})
            .then(function (_importer) {
                importer = _importer;
                return PreIcoContract.new(user1, value1, user2, value2)
            })
            .then(function (_preIco) {
                preIco = _preIco;
                return ImmlaIco.new(manager, preIco.address, 0, 0, 0);
            })
            .then(function (_ico) {
                ico = _ico;
                return ico.setNewTokenImporter(importer.address, {from: manager});
            })
            .then( () => {
                return ico.tokenImporter();
            } )
            .then((tokenImporter) => {
                assert.equal(tokenImporter, importer.address, "Wow importers are different");
                return importer.owner();
            })
            .then((owner) => {
                assert.equal(owner, someUser, "different import owners");
                return importer.importTokens(ico.address, {from: someUser}) 
            })
            .then( () => {
                return ico.immlaToken()
            } )
            .then( (tokenAddress) => { 
                token = ImmlaToken.at(tokenAddress); 
                return token.balanceOf.call(user1); 
            } )
            .then( (user1Bal) => {
                assert(user1Bal.equals(value1), "Diff balance of user1");
            } )
    });
});
