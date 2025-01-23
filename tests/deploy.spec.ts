import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { beginCell, Cell, fromNano, toNano } from '@ton/core';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import {
    NftCollectionContent,
    NftCollectionEditable,
    NftCollectionEditableConfig,
} from '../wrappers/NftCollectionEditable';
import { findTransaction, flattenTransaction } from '@ton/test-utils';
import { NftItem } from '../wrappers/NftItem';

describe('Batch deploy test', () => {
    let nftItemCode: Cell;
    let nftCollectionEditableCode: Cell;
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let nftCollectionConfig: NftCollectionEditableConfig;

    beforeAll(async () => {
        nftItemCode = await compile('NftItem');
        nftCollectionEditableCode = await compile('NftCollectionEditable');
    });

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');

        nftCollectionConfig = {
            ownerAddress: deployer.address,
            nftItemCode: nftItemCode,
            royaltyPercent: 0.05, // 0.05 = 5%
            royaltyAddress: deployer.address,
            nextItemIndex: 0,
            collectionContentUrl: `ipfs://QmW2mJAcQAYCwG6DRpSqDuDyz5FDRVRNxj47y95dgseCdA/collection.json`,
            commonContentUrl: `ipfs://QmW2mJAcQAYCwG6DRpSqDuDyz5FDRVRNxj47y95dgseCdA/`,
        };
    });

    async function deploy(): Promise<SandboxContract<NftCollectionEditable>> {
        const nftCollectionEditable = blockchain.openContract(
            NftCollectionEditable.createFromConfig(nftCollectionConfig, nftCollectionEditableCode),
        );
        const deployResult = await nftCollectionEditable.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).not.toHaveTransaction({
            success: false,
        });

        return nftCollectionEditable;
    }

    it('should deploy', async () => {
        await deploy();
    });

    it('should get collection data', async () => {
        const nftCollectionEditable = await deploy();

        const collectionData = await nftCollectionEditable.getCollectionData();

        expect(collectionData.nextItemIndex).toBe(0n);
        expect(collectionData.ownerAddress.equals(deployer.address)).toBe(true);
    });

    it('should mint a new NFT item', async () => {
        const nftCollectionEditable = await deploy();

        const nftItemContentCell = NftCollectionEditable.nftContentToCell({
            uri: 'https://example.com/nft1.json',
            itemOwnerAddress: (await blockchain.treasury(`itemOwner`)).address,
        });

        const initialCollectionData = await nftCollectionEditable.getCollectionData();

        // Mint the NFT
        const mintResult = await nftCollectionEditable.sendMint(deployer.getSender(), {
            value: toNano('0.5'),
            nftItemContent: nftItemContentCell,
            itemIndex: initialCollectionData.nextItemIndex,
            amount: toNano('0.1'),
        });

        expect(mintResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: nftCollectionEditable.address,
            success: true,
        });

        // Check that nextItemIndex has incremented
        const updCollectionData = await nftCollectionEditable.getCollectionData();
        expect(updCollectionData.nextItemIndex).toBe(initialCollectionData.nextItemIndex + 1n);
    });

    it('minimum required TON for a single mint', async () => {
        const nftCollectionEditable = await deploy();

        // https://docs.ton.org/v3/documentation/smart-contracts/transaction-fees/fees#:~:text=Cost%20of%20minting%20NFTs%3F,one%20NFT%20is%200.08%20TON
        // "Cost of minting NFTs?
        // The average fee for minting one NFT is 0.08 TON."
        //
        const candidates = [
            toNano(`0.02`),
            toNano(`0.03`),
            toNano(`0.04`),
            toNano(`0.05`),
            toNano(`0.06`),
            toNano(`0.07`),
            toNano(`0.071`),
            toNano(`0.073`),
            toNano(`0.075`),
            toNano(`0.077`),
            toNano(`0.08`),
            toNano(`0.09`),
            toNano(`0.1`),
        ];

        for (const value of candidates) {
            const nftOwner = (await blockchain.treasury(`itemOwner`)).address;
            const nftItemContentCell = NftCollectionEditable.nftContentToCell({
                uri: 'https://example.com/nft1.json',
                itemOwnerAddress: nftOwner,
            });
            const uriContent = beginCell().storeBuffer(Buffer.from(`https://example.com/nft1.json`)).endCell();

            const initialCollectionData = await nftCollectionEditable.getCollectionData();

            // Mint the NFT
            const mintResult = await nftCollectionEditable.sendMint(deployer.getSender(), {
                value: value,
                nftItemContent: nftItemContentCell,
                itemIndex: initialCollectionData.nextItemIndex,
                amount: toNano('0.1'),
            });

            const successTx = findTransaction(mintResult.transactions, {
                from: deployer.address,
                to: nftCollectionEditable.address,
                success: true,
            });

            if (successTx) {
                // Check that nextItemIndex has incremented
                const updCollectionData = await nftCollectionEditable.getCollectionData();
                expect(updCollectionData.nextItemIndex).toBe(initialCollectionData.nextItemIndex + 1n);

                const nftAddress = await nftCollectionEditable.getNftAddressByIndex(
                    initialCollectionData.nextItemIndex,
                );
                const nftItem = blockchain.openContract(NftItem.createFromAddress(nftAddress));
                const nftData = await nftItem.getNftData();

                expect(nftData.collectionAddress.equals(nftCollectionEditable.address)).toBe(true);
                expect(nftData.content.equals(uriContent)).toBe(true);
                expect(nftData.ownerAddress.equals(nftOwner)).toBe(true);
                expect(nftData.init).toBe(-1n); // true
                expect(nftData.index).toBe(initialCollectionData.nextItemIndex);
                console.log(`Minted NFT with value ${value.toString()}`);
            } else {
                console.log(`Failed to mint NFT with value ${value.toString()}`);
            }
        }
    });

    it('minimum required TON for a batch mint', async () => {
        const nftCollectionEditable = await deploy();

        const candidates = [
            toNano(`0.005`),
            toNano(`0.01`),
            toNano(`0.015`),
            toNano(`0.02`),
            toNano(`0.025`),
            toNano(`0.03`),
            toNano(`0.035`),
            toNano(`0.04`),
            toNano(`0.05`),
            toNano(`0.06`),
            toNano(`0.07`),
            toNano(`0.071`),
            toNano(`0.073`),
            toNano(`0.075`),
            toNano(`0.077`),
            toNano(`0.08`),
            toNano(`0.09`),
            toNano(`0.1`),
        ];
        const batchCount = 150;

        for (const itemAmount of candidates) {
            // Starts from 0
            const batch = Array.from({ length: batchCount }, (_, i) => i);
            const nftItemContents: NftCollectionContent[] = [];
            const uriContent = beginCell()
                .storeBuffer(
                    Buffer.from(
                        'https://gateway.pinata.cloud/ipfs/QmYbUB1zqkL1oykhENBEPkzX9GUDHSSXw1Jt5A1hWEDNJQ/0.png',
                    ),
                )
                .endCell();
            for (const i of batch) {
                const nftItemContentCell: NftCollectionContent = {
                    uri: 'https://gateway.pinata.cloud/ipfs/QmYbUB1zqkL1oykhENBEPkzX9GUDHSSXw1Jt5A1hWEDNJQ/0.png',
                    itemOwnerAddress: (await blockchain.treasury(`itemOwner` + i)).address,
                };

                nftItemContents.push(nftItemContentCell);
            }

            const initialCollectionData = await nftCollectionEditable.getCollectionData();

            // Mint the NFT
            const mintResult = await nftCollectionEditable.sendBatchMint(deployer.getSender(), {
                nftItemContents: nftItemContents,
                eachItemTONAmount: itemAmount,
            });

            const successTx = findTransaction(mintResult.transactions, {
                from: deployer.address,
                to: nftCollectionEditable.address,
                success: true,
            });

            if (successTx) {
                const flattened = flattenTransaction(successTx);
                // Check that nextItemIndex has incremented
                const updatedCollectionData = await nftCollectionEditable.getCollectionData();
                expect(updatedCollectionData.nextItemIndex).toBe(
                    initialCollectionData.nextItemIndex + BigInt(batchCount),
                );

                console.log(
                    `Minted ${batchCount} NFTs with total value ${fromNano(
                        flattened.value!.toString(),
                    )} and itemAmount ${fromNano(itemAmount.toString())}`,
                );

                for (const i of batch) {
                    const currentItemIndex = initialCollectionData.nextItemIndex + BigInt(i);
                    const nftAddress = await nftCollectionEditable.getNftAddressByIndex(currentItemIndex);
                    const nftItem = blockchain.openContract(NftItem.createFromAddress(nftAddress));
                    const nftData = await nftItem.getNftData();

                    expect(nftData.collectionAddress.equals(nftCollectionEditable.address)).toBe(true);
                    expect(nftData.content.equals(uriContent)).toBe(true);
                    expect(nftData.ownerAddress.equals(nftItemContents[i].itemOwnerAddress)).toBe(true);
                    expect(nftData.init).toBe(-1n); // true
                    expect(nftData.index).toBe(currentItemIndex);
                }

                console.log(`All ${batchCount} NFTs minted successfully`);
            } else {
                console.log(`Failed to mint ${batchCount} NFTs with itemAmount ${fromNano(itemAmount.toString())}`);
                // Log output for failed transaction
                // expect(mintResult.transactions).toHaveTransaction({
                //     from: deployer.address,
                //     to: nftCollectionEditable.address,
                //     success: true,
                // });
            }
        }
    });
});
