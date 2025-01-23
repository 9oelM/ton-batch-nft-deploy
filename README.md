# ton-batch-nft-deploy

_Nobody_. Nobody on this planet has published a code or a tutorial to run a batch deploy of multiple NFTs from a single message on TON. This repository serves as an example of how to do so. Batch deploy significantly decreases the gas fee. For a single mint, around 0.08 TON is required.

If you use this project, around 1.0 to 1.5 TON are required for minting 50 NFTs. That's 1 / 50 = 0.02 to 1.5 / 50 = 0.03 TON per NFT. Here's an example tx that does that: https://testnet.tonviewer.com/transaction/32f380a7f4f2d6a3d085619ec1cf6e3caaa30ec9c781d389331f07d4cda6e4b3

I'm too lazy so I won't write about how I coded this solution, so for now I will just explain how to set things up. Feel free to ping me if you have any questions.

This is for the testnet deployment:

```bash
cp .env.example .env
cp .env.testnet.example .env.testnet
```

Populate the environment vars correctly in each of the files. Make sure you have enough TON balance in the wallet for which you would supply the mnemonic.

Preferably, use Node version specified at `.nvmrc`.

Install the stuff

```bash
npm i
```

And deploy your static assets to Pinata cloud:

```bash
npm run deploy:assets
```

Then, deploy your collection to TON:

```bash
npm run deploy:collection
```

Take the raw address of the collection, and copy and paste that into `deploy_batch_nft_items.ts`.

Then, run

```bash
npm run deploy:many-items
```

Then you will see 50 NFTs being deployed at once. The excess TON will be refunded back to you.
