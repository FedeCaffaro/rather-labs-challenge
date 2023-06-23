# RatherLabs-challenge

<br />
<p align="center">
<img src="https://www.google.com/url?sa=i&url=https%3A%2F%2Fwiki.ratherlabs.com%2Fsign-in&psig=AOvVaw3P_1XpZcCTzjGimcJ_fKAr&ust=1687580092268000&source=images&cd=vfe&ved=0CBEQjRxqFwoTCOCtsvHD2P8CFQAAAAAdAAAAABAE" alt="Logo">

  <h3 align="center">RatherLabs Challenge</h3>

  <p align="center">
    This project consists of building a contract that encapsulates all the transactions needed to join and stake SushiSwap liquidity program for both MasterchefV1 and MasterchefV2.
    <br />
    <br />
    <a href="https://github.com/FedeCaffaro/rather-labs-challenge/issues">Report Bug</a>
    ·
    <a href="https://github.com/FedeCaffaro/rather-labs-challenge/issues">Request Feature</a>
  </p>
</p>

## Built With

- Hardhat 2.15.0
- Typescript 4.9.5
- Ethers 5.7.2

<!-- INSTALLATION -->

## Usage

To run this app on your pc, you need to:

- clone this repo:

  - Clone with SSH:

  ```
   git@github.com:FedeCaffaro/rather-labs-challenge.git
  ```

  - Clone with HTTPS

  ```
    https://github.com/FedeCaffaro/rather-labs-challenge.git
  ```

- run npm in order to install all the packages

  - `$ npm install`

- then, create a .env file following the .env.example. You will need to add your alchemy key , which you can get at https://www.alchemy.com/. If you want to output a gas report on each transaction and contract deployment you will need a coinmarketcap api key which you can get at https://coinmarketcap.com/api/ .

- This contract interacts with already deployed Sushiswap / Uniswap contract on ethereum mainnet. To replicate this you will need to run a node on the hardhat network forking ethereum mainnet, where ALCHEMY_API_KEY is the ethereum mainnet alchemy key.

  - `$ npx hardhat node --fork https://eth-mainnet.alchemyapi.io/v2/<ALCHEMY_API_KEY>`

- on a separate terminal, run the unit tests that replicate a full user flow to join liquidity program.
  - `npx hardhat test --network localhost `

## Authors

👤 **Federico Caffaro**

- Github: [FedeCaffaro](https://github.com/FedeCaffaro)
- LinkedIn: [Federico Caffaro](https://www.linkedin.com/in/fredcc/)
