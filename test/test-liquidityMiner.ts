import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, mine } from "@nomicfoundation/hardhat-network-helpers";
import * as dotenv from "dotenv";

dotenv.config();

describe("SushiswapLiquidityMiner", function () {
  const addressTokenA = process.env.TOKEN_A_CONTRACT_ADDRESS || "";
  const addressTokenB = process.env.TOKEN_B_CONTRACT_ADDRESS || "";
  const wethAddress = process.env.WETH_CONTRACT_ADDRESS || "";
  const addressSLPV1 = process.env.SLP_WETH_USDT_ADDRESS || "";
  const addressSLPV2 = process.env.SLP_WETH_ENS_ADDRESS || "";
  const masterchefV1Address = process.env.MASTERCHEF_V1_ADDRESS || "";
  const masterchefV2Address = process.env.MASTERCHEF_V2_ADDRRESS || "";
  const sushiTokenAddress = process.env.SUSHI_CONTRACT_ADDRESS || "";
  const uniswapV2RouterAddress =
    process.env.SUSHI_V2_ROUTER_CONTRACT_ADDRESS || "";
  const WETHABI = [
    "function deposit() payable",
    "function balanceOf(address) view returns (uint256)",
    "function approve(address spender, uint256 amount)",
  ];
  const SUSHIABI = ["function balanceOf(address) view returns (uint256)"];
  const TOKEN_A_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function approve(address spender, uint256 amount)",
  ];
  const TOKEN_B_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function approve(address spender, uint256 amount)",
  ];
  const SLP_TOKEN_A_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function approve(address spender, uint256 amount)",
  ];

  const SLP_TOKEN_B_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function approve(address spender, uint256 amount)",
  ];

  const MASTERCHEF_V1_ABI = [
    "function userInfo(uint256 _pid,address _user) public view returns (uint256 _amount, uint256 rewardDebt)",
  ];

  async function deployTokenFixture() {
    const [owner, user] = await ethers.getSigners();
    // Get the already deployed contracts
    const SLPTokenV1 = await ethers.getContractAt(
      SLP_TOKEN_A_ABI,
      addressSLPV1
    );
    const SLPTokenV2 = await ethers.getContractAt(
      SLP_TOKEN_B_ABI,
      addressSLPV2
    );
    const TokenA = await ethers.getContractAt(TOKEN_A_ABI, addressTokenA);
    const TokenB = await ethers.getContractAt(TOKEN_B_ABI, addressTokenB);
    const Weth = await ethers.getContractAt(WETHABI, wethAddress);
    const Sushi = await ethers.getContractAt(SUSHIABI, sushiTokenAddress);

    const MasterchefV1 = await ethers.getContractAt(
      MASTERCHEF_V1_ABI,
      masterchefV1Address
    );

    const UniswapRouter = await ethers.getContractAt(
      "IUniswapV2Router02",
      uniswapV2RouterAddress
    );

    // Deploy LiquidityMiner
    const SushiswapLiquidityMinerFactory = await ethers.getContractFactory(
      "SushiSwapLiquidityMiner"
    );
    const SushiswapLiquidityMiner = await SushiswapLiquidityMinerFactory.deploy(
      uniswapV2RouterAddress,
      masterchefV1Address,
      masterchefV2Address
    );
    await SushiswapLiquidityMiner.deployed();

    // Fund contract with Tokens & ETH for providing liquidity

    // Fund wallet with WETH
    const tradeAmount = ethers.utils.parseEther("2"); // Example: 2 ETH worth of tokens
    const depositTx = await Weth.deposit({
      value: tradeAmount,
    });
    await depositTx.wait();

    // Fund wallet with tokenA (USDT) by performing ETH to USDT swap.
    const tokenPathA = [wethAddress, addressTokenA]; // ETH to USDT path
    const tokenPathB = [wethAddress, addressTokenB]; // ETH to ENS path

    const minTokenAmount = 0; // Minimum acceptable amount of USDT tokens to receive
    const deadline = Math.floor(Date.now() / 1000) + 300; // Deadline (5 minutes from now)
    const swapTxA = await UniswapRouter.swapExactETHForTokens(
      minTokenAmount,
      tokenPathA,
      owner.address,
      deadline,
      {
        value: tradeAmount,
      }
    );
    await swapTxA.wait();

    const swapTxB = await UniswapRouter.swapExactETHForTokens(
      minTokenAmount,
      tokenPathB,
      owner.address,
      deadline,
      {
        value: tradeAmount,
      }
    );
    await swapTxB.wait();

    const tokenAWalletBalance = await TokenA.balanceOf(owner.address);
    const tokenBWalletBalance = await TokenB.balanceOf(owner.address);
    const wethWalletBalance = await Weth.balanceOf(owner.address);
    const amountWETHDeposited = wethWalletBalance;
    const amountETHDeposited = tradeAmount;
    const amountTokenADeposited = tokenAWalletBalance;
    const amountTokenBDeposited = tokenBWalletBalance;

    // Approve the tokens removal
    const approvalTxTokenA = await TokenA.approve(
      SushiswapLiquidityMiner.address,
      amountTokenADeposited,
      {
        gasLimit: 300000,
      }
    );
    await approvalTxTokenA.wait();

    const approvalTxTokenB = await TokenB.approve(
      SushiswapLiquidityMiner.address,
      amountTokenBDeposited,
      {
        gasLimit: 300000,
      }
    );
    await approvalTxTokenB.wait();

    const approvalTxWETH = await Weth.approve(
      SushiswapLiquidityMiner.address,
      amountWETHDeposited,
      {
        gasLimit: 300000,
      }
    );
    await approvalTxWETH.wait();

    // Deposit USDT equivalent to 1 ETH, 1 WETH and  1 ETH into the contract
    const tokenADeposit = await SushiswapLiquidityMiner.depositToken(
      amountTokenADeposited,
      addressTokenA,
      owner.address,
      { gasLimit: 300000 }
    );
    await tokenADeposit.wait();

    const tokenBDeposit = await SushiswapLiquidityMiner.depositToken(
      amountTokenBDeposited,
      addressTokenB,
      owner.address,
      { gasLimit: 300000 }
    );
    await tokenBDeposit.wait();

    const etherDeposit = await SushiswapLiquidityMiner.depositETH({
      value: amountETHDeposited,
    });
    await etherDeposit.wait();

    const wethDeposit = await SushiswapLiquidityMiner.depositToken(
      amountWETHDeposited,
      wethAddress,
      owner.address,
      { gasLimit: 300000 }
    );
    await wethDeposit.wait();
    // Fixtures can return anything you consider useful for your tests
    return {
      Weth,
      TokenA,
      SLPTokenV1,
      SLPTokenV2,
      Sushi,
      MasterchefV1,
      SushiswapLiquidityMiner,
      owner,
      user,
      amountTokenADeposited,
      amountTokenBDeposited,
      amountETHDeposited,
      amountWETHDeposited,
    };
  }
  it("Should deposit tokens and ETH", async function () {
    const {
      TokenA,
      SushiswapLiquidityMiner,
      amountETHDeposited,
      amountTokenADeposited,
    } = await loadFixture(deployTokenFixture);

    const ethBalance = await SushiswapLiquidityMiner.balanceETH();
    const tokenBalance = await SushiswapLiquidityMiner.tokenBalances(
      TokenA.address
    );
    expect(ethBalance).to.be.equal(amountETHDeposited);
    expect(tokenBalance).to.be.equal(amountTokenADeposited);
  });

  it("Should withdraw Token", async function () {
    const { TokenA, SushiswapLiquidityMiner, owner } = await loadFixture(
      deployTokenFixture
    );
    // Balance before withdraw
    const beforeWithdrawBalance = await TokenA.balanceOf(owner.address);

    // Perform the withdraw operation
    const withdrawTx = await SushiswapLiquidityMiner.connect(
      owner
    ).withdrawToken(1, addressTokenA);
    await withdrawTx.wait();

    // Balance after withdraw
    const afterWithdrawBalance = await TokenA.balanceOf(owner.address);

    // Check if the withdraw was successful by comparing balances
    expect(beforeWithdrawBalance).to.be.lt(afterWithdrawBalance);
  });

  it("Should fail to withdraw Token when not enough balance", async function () {
    const { TokenA, SushiswapLiquidityMiner } = await loadFixture(
      deployTokenFixture
    );
    const initialTokenBalance = await TokenA.balanceOf(
      SushiswapLiquidityMiner.address
    );
    await expect(
      SushiswapLiquidityMiner.withdrawToken(
        initialTokenBalance.add(1),
        addressTokenA
      )
    ).to.be.revertedWith("Not enough tokens in the contract");
  });

  it("Should withdraw ETH", async function () {
    const { SushiswapLiquidityMiner, owner } = await loadFixture(
      deployTokenFixture
    );
    const initialEthBalance = await owner.getBalance();
    const withdrawAmount = ethers.utils.parseEther("0.5");
    await SushiswapLiquidityMiner.withdrawETH(withdrawAmount);
    const finalEthBalance = await owner.getBalance();
    expect(finalEthBalance).to.be.above(initialEthBalance);
  });

  it("Should fail to withdraw ETH when not enough balance", async function () {
    const { SushiswapLiquidityMiner } = await loadFixture(deployTokenFixture);
    const withdrawAmount = ethers.utils.parseEther("1000");
    await expect(
      SushiswapLiquidityMiner.withdrawETH(withdrawAmount)
    ).to.be.revertedWith("Not enough Ether in the contract");
  });

  it("Should fail if a non-owner tries to call an onlyOwner function", async function () {
    const { TokenA, SushiswapLiquidityMiner, user } = await loadFixture(
      deployTokenFixture
    );

    const amountEth = ethers.utils.parseEther("0.05");
    const amountToken = 100 * 10 ** 6;
    const amountTokenDesired = 1000 * 10 ** 6; // Amount of 100 USDT tokens desired
    const amountTokenMin = 0; // Minimum acceptable amount of USDT tokens
    const amountETHMin = 0; // Minimum acceptable amount of ETH
    const amountETHDesired = ethers.utils.parseEther("0.1");
    const pid = 0;
    await expect(
      SushiswapLiquidityMiner.connect(user).withdrawETH(amountEth)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      SushiswapLiquidityMiner.connect(user).withdrawToken(
        amountToken,
        TokenA.address
      )
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      SushiswapLiquidityMiner.connect(user).joinLiquidityMiningProgramETH(
        addressTokenA,
        amountTokenDesired,
        amountTokenMin,
        amountETHMin,
        amountETHDesired,
        addressSLPV1,
        pid,
        true
      )
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      SushiswapLiquidityMiner.connect(user).withdrawRewards(pid, 0, true)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("Should add Liquidity with ETH/TokenA(USDT) pair on Masterchef V1. Checks that SLP tokens are deposited and yielding rewards. Also withdraws rewards.", async function () {
    // Get the already deployed contracts
    const { SLPTokenV1, SushiswapLiquidityMiner, Sushi } = await loadFixture(
      deployTokenFixture
    );
    // Specify the liquidity parameters
    const amountTokenDesired = 1000 * 10 ** 6; // Amount of 100 USDT tokens desired
    const amountTokenMin = 0; // Minimum acceptable amount of USDT tokens
    const amountETHMin = 0; // Minimum acceptable amount of ETH
    const amountETHDesired = ethers.utils.parseEther("0.1");
    const pid = 0;
    const tokenAInitialBalance = Number(
      await SushiswapLiquidityMiner.tokenBalances(addressTokenA)
    );
    const ethInitialBalance = Number(
      await SushiswapLiquidityMiner.balanceETH()
    );
    // Add liquidity
    const addLiquidityETHtx =
      await SushiswapLiquidityMiner.joinLiquidityMiningProgramETH(
        addressTokenA,
        amountTokenDesired,
        amountTokenMin,
        amountETHMin,
        amountETHDesired,
        addressSLPV1,
        pid,
        true
      );
    const receipt = await addLiquidityETHtx.wait();
    // Find the LiquidityAdded event in the logs
    const slpFinalBalance = await SLPTokenV1.balanceOf(
      SushiswapLiquidityMiner.address
    );
    const tokenAFinalBalance = Number(
      await SushiswapLiquidityMiner.tokenBalances(addressTokenA)
    );
    const ethFinalBalance = Number(await SushiswapLiquidityMiner.balanceETH());
    const eventTopic =
      SushiswapLiquidityMiner.interface.getEventTopic("LiquidityProvided");
    const eventLog = receipt.logs.find((log) =>
      log.topics.includes(eventTopic)
    );

    if (eventLog) {
      // Decode the event log
      const decodedLog = SushiswapLiquidityMiner.interface.parseLog(eventLog);

      // Check the liquidity amount
      const amountEth = decodedLog.args[0];
      const amountToken = decodedLog.args[1];
      const liquidity = decodedLog.args[2];
      expect(Number(liquidity)).to.be.greaterThan(0);
      expect(Number(amountEth)).to.be.greaterThan(0);
      expect(Number(amountToken)).to.be.greaterThan(0);
      expect(tokenAInitialBalance).to.be.greaterThan(tokenAFinalBalance);
      expect(ethInitialBalance).to.be.greaterThan(ethFinalBalance);
      expect(slpFinalBalance).to.be.equal(0);

      await mine(10);
      expect(
        Number(await SushiswapLiquidityMiner.checkRewards(pid, true))
      ).to.be.greaterThan(0);
      await SushiswapLiquidityMiner.withdrawRewards(0, 0, true);
      const sushiContractBalance = Number(
        await Sushi.balanceOf(SushiswapLiquidityMiner.address)
      );
      expect(sushiContractBalance).to.be.greaterThan(0);
    } else {
      throw new Error("LiquidityAdded event not found");
    }
    console.log("Joined liquidity program successfuly");
  });

  it("Should add Liquidity with WETH/TokenA(USDT) pair on Masterchef V1. Checks that SLP tokens are deposited and yielding rewards. Also withdraws rewards.", async function () {
    // Get the already deployed contracts
    const { SLPTokenV1, SushiswapLiquidityMiner, Sushi } = await loadFixture(
      deployTokenFixture
    );
    // Specify the liquidity parameters
    const amountTokenA = 2000 * 10 ** 6; // Amount of 1000 USDT tokens desired
    const amountTokenAMin = 0; // Minimum acceptable amount of USDT tokens
    const amountTokenBMin = 0; // Minimum acceptable amount of WETH
    const amountTokenB = ethers.utils.parseEther("1");
    const pid = 0;
    const addressTokenB = wethAddress;
    // Add liquidity
    const tokenAInitialBalance = Number(
      await SushiswapLiquidityMiner.tokenBalances(addressTokenA)
    );
    const tokenBInitialBalance = Number(
      await SushiswapLiquidityMiner.tokenBalances(addressTokenB)
    );
    const addLiquiditytx =
      await SushiswapLiquidityMiner.joinLiquidityMiningProgram(
        addressTokenA,
        addressTokenB,
        amountTokenA,
        amountTokenB,
        amountTokenAMin,
        amountTokenBMin,
        addressSLPV1,
        pid,
        true
      );
    const receipt = await addLiquiditytx.wait();
    // Find the LiquidityAdded event in the logs
    const eventTopic =
      SushiswapLiquidityMiner.interface.getEventTopic("LiquidityProvided");
    const eventLog = receipt.logs.find((log) =>
      log.topics.includes(eventTopic)
    );
    const tokenAFinalBalance = Number(
      await SushiswapLiquidityMiner.tokenBalances(addressTokenA)
    );
    const tokenBFinalBalance = Number(
      await SushiswapLiquidityMiner.tokenBalances(addressTokenB)
    );
    const slpFinalBalance = await SLPTokenV1.balanceOf(
      SushiswapLiquidityMiner.address
    );
    if (eventLog) {
      // Decode the event log
      const decodedLog = SushiswapLiquidityMiner.interface.parseLog(eventLog);

      // Check the liquidity amount
      const amountA = decodedLog.args[0];
      const amountB = decodedLog.args[1];
      const liquidity = decodedLog.args[2];
      expect(Number(liquidity)).to.be.greaterThan(0);
      expect(Number(amountA)).to.be.greaterThan(0);
      expect(Number(amountB)).to.be.greaterThan(0);
      expect(tokenAInitialBalance).to.be.greaterThan(tokenAFinalBalance);
      expect(tokenBInitialBalance).to.be.greaterThan(tokenBFinalBalance);
      expect(slpFinalBalance).to.be.equal(0);

      await mine(10);
      expect(
        Number(await SushiswapLiquidityMiner.checkRewards(pid, true))
      ).to.be.greaterThan(0);
      await SushiswapLiquidityMiner.withdrawRewards(0, 0, true);
      const sushiContractBalance = Number(
        await Sushi.balanceOf(SushiswapLiquidityMiner.address)
      );
      expect(sushiContractBalance).to.be.greaterThan(0);
    } else {
      throw new Error("LiquidityAdded event not found");
    }
    console.log("Joined liquidity program successfuly");
  });

  it("Should add Liquidity with ETH/TokenB(ENS) pair on Masterchef V2. Checks that SLP tokens are deposited and yielding rewards. Also withdraws rewards.", async function () {
    // Get the already deployed contracts
    const { SLPTokenV2, SushiswapLiquidityMiner, Sushi } = await loadFixture(
      deployTokenFixture
    );
    // Specify the liquidity parameters
    const amountTokenBDesired = 1000 * 10 * 18; // Amount of 100 ENS tokens desired
    const amountTokenBMin = 0; // Minimum acceptable amount of USDT tokens
    const amountETHMin = 0; // Minimum acceptable amount of ETH
    const amountETHDesired = ethers.utils.parseEther("0.5");
    const pid = 24;
    const tokenBInitialBalance = Number(
      await SushiswapLiquidityMiner.tokenBalances(addressTokenB)
    );
    const ethInitialBalance = Number(
      await SushiswapLiquidityMiner.balanceETH()
    );
    // Add liquidity
    const addLiquidityETHtx =
      await SushiswapLiquidityMiner.joinLiquidityMiningProgramETH(
        addressTokenB,
        amountTokenBDesired,
        amountTokenBMin,
        amountETHMin,
        amountETHDesired,
        addressSLPV2,
        pid,
        false
      );
    const receipt = await addLiquidityETHtx.wait();
    // Find the LiquidityAdded event in the logs
    const slpV2FinalBalance = await SLPTokenV2.balanceOf(
      SushiswapLiquidityMiner.address
    );
    const tokenBFinalBalance = Number(
      await SushiswapLiquidityMiner.tokenBalances(addressTokenB)
    );
    const ethFinalBalance = Number(await SushiswapLiquidityMiner.balanceETH());
    const eventTopic =
      SushiswapLiquidityMiner.interface.getEventTopic("LiquidityProvided");
    const eventLog = receipt.logs.find((log) =>
      log.topics.includes(eventTopic)
    );

    if (eventLog) {
      // Decode the event log
      const decodedLog = SushiswapLiquidityMiner.interface.parseLog(eventLog);

      // Check the liquidity amount
      const amountEth = decodedLog.args[0];
      const amountToken = decodedLog.args[1];
      const liquidity = decodedLog.args[2];
      expect(Number(liquidity)).to.be.greaterThan(0);
      expect(Number(amountEth)).to.be.greaterThan(0);
      expect(Number(amountToken)).to.be.greaterThan(0);
      expect(tokenBInitialBalance).to.be.greaterThan(tokenBFinalBalance);
      expect(ethInitialBalance).to.be.greaterThan(ethFinalBalance);
      expect(Number(slpV2FinalBalance)).to.be.equal(0);

      await mine(100);
      expect(
        Number(await SushiswapLiquidityMiner.checkRewards(pid, false))
      ).to.be.greaterThan(0);
      await SushiswapLiquidityMiner.withdrawRewards(pid, 0, false);
      const sushiContractBalance = Number(
        await Sushi.balanceOf(SushiswapLiquidityMiner.address)
      );
      expect(sushiContractBalance).to.be.greaterThan(0);
    } else {
      throw new Error("LiquidityAdded event not found");
    }
    console.log("Joined liquidity program successfuly");
  });

  it("Should add Liquidity with TokenA(ENS)/TokenB(WETH) pair on Masterchef V2. Checks that SLP tokens are deposited and yielding rewards. Also withdraws rewards.", async function () {
    // Get the already deployed contracts
    const { SLPTokenV2, SushiswapLiquidityMiner, Sushi } = await loadFixture(
      deployTokenFixture
    );
    // Specify the liquidity parameters
    const amountTokenA = 20000000000000; // Amount of ENS tokens desired
    const amountTokenAMin = 0; // Minimum acceptable amount of ENS tokens
    const amountTokenBMin = 0; // Minimum acceptable amount of WETH
    const amountTokenB = ethers.utils.parseEther("1"); // Amount of WETH desired
    const pid = 24;
    const addressTokenA = process.env.TOKEN_B_CONTRACT_ADDRESS || "";
    const addressTokenB = wethAddress;
    // Add liquidity
    const tokenAInitialBalance = Number(
      await SushiswapLiquidityMiner.tokenBalances(addressTokenA)
    );
    const tokenBInitialBalance = Number(
      await SushiswapLiquidityMiner.tokenBalances(addressTokenB)
    );
    const addLiquiditytx =
      await SushiswapLiquidityMiner.joinLiquidityMiningProgram(
        addressTokenA,
        addressTokenB,
        amountTokenA,
        amountTokenB,
        amountTokenAMin,
        amountTokenBMin,
        addressSLPV2,
        pid,
        false
      );
    const receipt = await addLiquiditytx.wait();
    // Find the LiquidityAdded event in the logs
    const eventTopic =
      SushiswapLiquidityMiner.interface.getEventTopic("LiquidityProvided");
    const eventLog = receipt.logs.find((log) =>
      log.topics.includes(eventTopic)
    );
    const tokenAFinalBalance = Number(
      await SushiswapLiquidityMiner.tokenBalances(addressTokenA)
    );
    const tokenBFinalBalance = Number(
      await SushiswapLiquidityMiner.tokenBalances(addressTokenB)
    );
    const slpFinalBalance = await SLPTokenV2.balanceOf(
      SushiswapLiquidityMiner.address
    );
    if (eventLog) {
      // Decode the event log
      const decodedLog = SushiswapLiquidityMiner.interface.parseLog(eventLog);

      // Check the liquidity amount
      const amountA = decodedLog.args[0];
      const amountB = decodedLog.args[1];
      const liquidity = decodedLog.args[2];
      expect(Number(liquidity)).to.be.greaterThan(0);
      expect(Number(amountA)).to.be.greaterThan(0);
      expect(Number(amountB)).to.be.greaterThan(0);
      expect(tokenAInitialBalance).to.be.greaterThan(tokenAFinalBalance);
      expect(tokenBInitialBalance).to.be.greaterThan(tokenBFinalBalance);
      expect(slpFinalBalance).to.be.equal(0);

      await mine(100);
      expect(
        Number(await SushiswapLiquidityMiner.checkRewards(pid, false))
      ).to.be.greaterThan(0);
      await SushiswapLiquidityMiner.withdrawRewards(pid, 0, false);
      const sushiContractBalance = Number(
        await Sushi.balanceOf(SushiswapLiquidityMiner.address)
      );
      expect(sushiContractBalance).to.be.greaterThan(0);
    } else {
      throw new Error("LiquidityAdded event not found");
    }
    console.log("Joined liquidity program successfuly");
  });
});
