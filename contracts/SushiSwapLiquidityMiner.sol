// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IMasterChefV1.sol";
import "./interfaces/IMasterChefV2.sol";

contract SushiSwapLiquidityMiner is Ownable {
    using SafeERC20 for IERC20;
    uint256 public balanceETH;
    mapping(address => uint256) public tokenBalances;
    IERC20 private tokenA;
    IERC20 private tokenB;
    IERC20 private token;
    IERC20 private slpToken;
    IUniswapV2Router02 private sushiRouter;
    IMasterChefV1 private masterchefV1;
    IMasterChefV2 private masterchefV2;

    event LiquidityProvided(
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity
    );

    constructor(
        address sushiRouterAddress,
        address masterchefV1Address,
        address masterchefV2Address
    ) {
        sushiRouter = IUniswapV2Router02(sushiRouterAddress);
        masterchefV1 = IMasterChefV1(masterchefV1Address);
        masterchefV2 = IMasterChefV2(masterchefV2Address);
    }

    function depositETH() external payable {
        balanceETH += msg.value;
    }

    // Just in case to be able to send directly eth to the smart contract wallet address
    receive() external payable {}

    function depositToken(
        uint256 amount,
        address tokenAddress,
        address from
    ) external {
        // Transfer tokens to this contract for later use
        token = IERC20(tokenAddress);
        token.safeTransferFrom(from, address(this), amount);
        tokenBalances[address(token)] += amount;
    }

    function withdrawToken(
        uint256 amount,
        address tokenAddress
    ) external onlyOwner {
        token = IERC20(tokenAddress);
        require(
            token.balanceOf(address(this)) >= amount,
            "Not enough tokens in the contract"
        );

        // Transfer tokens back to the user
        token.safeTransfer(msg.sender, amount);
        tokenBalances[address(token)] -= amount;
    }

    function withdrawETH(uint256 amount) external onlyOwner {
        require(
            address(this).balance >= amount,
            "Not enough Ether in the contract"
        );
        // Transfer ETH from this contract
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        // Update the ETH balance
        balanceETH -= amount;
    }

    // UPDATEAR LOS BALANCES DE LOS TOKENS Y ETH CUANDO MANDO
    function joinLiquidityMiningProgram(
        address addressTokenA,
        address addressTokenB,
        uint256 amountTokenA,
        uint256 amountTokenB,
        uint256 amountTokenAMin,
        uint256 amountTokenBMin,
        address addressSLPToken,
        uint256 pid,
        bool isV1
    ) external onlyOwner {
        tokenA = IERC20(addressTokenA);
        tokenB = IERC20(addressTokenB);
        tokenA.safeApprove(address(sushiRouter), amountTokenA);
        tokenB.safeApprove(address(sushiRouter), amountTokenB);

        (uint256 amountA, uint256 amountB, uint256 liquidity) = sushiRouter
            .addLiquidity(
                addressTokenA,
                addressTokenB,
                amountTokenA,
                amountTokenB,
                amountTokenAMin,
                amountTokenBMin,
                address(this),
                block.timestamp
            );
        tokenBalances[addressTokenA] -= amountA;
        tokenBalances[addressTokenB] -= amountB;
        slpToken = IERC20(addressSLPToken);
        if (isV1) {
            // Approve SLPtoken for MasterchefV1
            slpToken.safeApprove(address(masterchefV1), liquidity);

            //Add the SLP tokens to MasterchefV1
            masterchefV1.deposit(pid, liquidity);
            emit LiquidityProvided(amountA, amountB, liquidity);
        } else {
            // Approve SLPtoken for MasterchefV2
            slpToken.approve(address(masterchefV2), liquidity);
            // //Add the SLP tokens to MasterchefV2
            masterchefV2.deposit(pid, liquidity, address(this));
            emit LiquidityProvided(amountA, amountB, liquidity);
        }
    }

    function joinLiquidityMiningProgramETH(
        address addressToken,
        uint256 amountToken,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        uint256 amountETH,
        address addressSLPToken,
        uint256 pid,
        bool isV1
    ) external onlyOwner {
        tokenA = IERC20(addressToken);
        tokenA.safeApprove(address(sushiRouter), amountToken);
        (
            uint256 amountTokenSent,
            uint256 amountETHSent,
            uint256 liquidity
        ) = sushiRouter.addLiquidityETH{value: amountETH}(
                addressToken,
                amountToken,
                amountTokenMin,
                amountETHMin,
                address(this),
                block.timestamp
            );
        tokenBalances[addressToken] -= amountTokenSent;
        balanceETH -= amountETHSent;
        // Approve SLPtoken for MasterchefV1
        slpToken = IERC20(addressSLPToken);
        if (isV1) {
            // Approve SLPtoken for MasterchefV1
            slpToken.safeApprove(address(masterchefV1), liquidity);

            //Add the SLP tokens to MasterchefV1
            masterchefV1.deposit(pid, liquidity);
            emit LiquidityProvided(amountETHSent, amountTokenSent, liquidity);
        } else {
            // Approve SLPtoken for MasterchefV2
            slpToken.approve(
                address(masterchefV2),
                slpToken.balanceOf(address(this))
            );
            //Add the SLP tokens to MasterchefV2
            masterchefV2.deposit(pid, liquidity, address(this));
            emit LiquidityProvided(amountETHSent, amountTokenSent, liquidity);
        }
    }

    // Function to check sushi rewards
    function checkRewards(
        uint256 pid,
        bool isV1
    ) public view returns (uint256 sushiRewards) {
        if (isV1) {
            return masterchefV1.pendingSushi(pid, address(this));
        }
        return masterchefV2.pendingSushi(pid, address(this));
    }

    // Function to withdraw rewards
    function withdrawRewards(
        uint256 pid,
        uint256 slpTokenAmount,
        bool isV1
    ) external onlyOwner {
        // slpTokenAmount = 0 if want to keep the SLPTokens staked
        if (isV1) {
            masterchefV1.withdraw(pid, slpTokenAmount);
        } else {
            masterchefV2.withdrawAndHarvest(pid, slpTokenAmount, address(this));
        }
    }
}
