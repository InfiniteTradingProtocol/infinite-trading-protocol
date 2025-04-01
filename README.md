<p align="center">
  <img src="https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/logos/Infinite_Trading_Protocol_Surface.png" alt="Infinite Trading Protocol Logo" width="800" height="400"/>
</p>

---

# Infinite Trading Protocol 

Welcome to the official code repository for Infinite Trading Protocol. The protocol offers a comprehensive suite of tools designed for advanced financial analysis, data integration, trading bots, and more.

---

## Introduction

The Infinite Trading Protocol API is designed to provide developers with the tools necessary for creating advanced trading strategies and integrating blockchain technology into their financial applications.

<p align="center">
  <img src="https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/logos/diagram.png" alt="Infinite Trading Protocol Diagram"/>
</p>

## Features

- **Advanced Financial Analysis**: Utilize our tools for comprehensive financial data analysis and insights.
- **Data Integration**: Seamlessly integrate financial data from various sources.
- **Trading Bots**: Develop, test, and deploy sophisticated trading bots to automate your trading strategies.
- **Blockchain Integration**: Leverage blockchain technology to enhance transparency and security in financial transactions.

## Code Structure

### Contracts

The `contracts` directory contains Solidity smart contracts developed using the Foundry framework. Key features include:

- **Forge**: Compile, test, fuzz, format, and deploy smart contracts.
- **Forge Std**: Collection of helpful contracts and utilities for testing.
- **Prettier**: Code formatter for non-Solidity files.
- **Solhint**: Linter for Solidity code.

#### Key Files

- `contracts/`: Contains all Solidity smart contracts.
- `test/`: Contains test contracts for unit testing.
- `.github/workflows/ci.yml`: GitHub Actions configuration for continuous integration.

### Usage

#### Build

Build the contracts:

```sh
$ forge build
```

#### Clean

Delete the build artifacts and cache directories:

```sh
$ forge clean
```

#### Compile

Compile the contracts:

```sh
$ forge build
```

#### Coverage

Get a test coverage report:

```sh
$ forge coverage
```

#### Deploy

Deploy to Anvil:

```sh
$ forge script script/Deploy.s.sol --broadcast --fork-url http://localhost:8545
```

#### Format

Format the contracts:

```sh
$ forge fmt
```

#### Gas Usage

Get a gas report:

```sh
$ forge test --gas-report
```

#### Lint

Lint the contracts:

```sh
$ bun run lint
```

#### Test

Run the tests:

```sh
$ forge test
```

Generate test coverage and output result to the terminal:

```sh
$ bun run test:coverage
```

Generate test coverage with lcov report:

```sh
$ bun run test:coverage:report
```

## Contributing

We welcome contributions from the community. If you wish to contribute to the Infinite Trading Protocol API, please fork the repository, make your changes, and submit a pull request.

## License

This project is licensed under the terms of the [MIT license](LICENSE).

---

## Contact

For support or any queries, please reach out to admin@infinitetrading.io, telegram: @infinitetradingprotocol, or X: @infinitetradepr.

## Copyright

Copyright (c) 2024 Infinite Trading. All rights reserved.

Unauthorized copying of this file, via any medium is strictly prohibited.
```

This improved README now includes detailed information about the code structure, key features, usage instructions, and more.
