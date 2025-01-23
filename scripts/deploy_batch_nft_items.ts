import { Address, toNano } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { NftCollectionContent, NftCollectionEditable } from '../wrappers/NftCollectionEditable';
import fs from 'fs';
import { isPinataArtifact } from '../wrappers/PinataArtifact';
import { randomAddress } from '@ton/test-utils';
import path from 'path';
import './setup';

export async function run(provider: NetworkProvider) {
    const pinataArtifact = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'artifact.pinata.json'), 'utf-8'));

    if (!isPinataArtifact(pinataArtifact)) {
        throw new Error('Invalid artifact');
    }

    const senderAddress = provider.sender().address;
    if (!senderAddress) {
        throw new Error('Sender address is not defined');
    }
    /**
     * @@@@@@@@@
     *
     * Add the address of the NFT collection contract that you deployed here
     *
     * For ex: Address.parse(`0:14a08f4e003d4b063042e5d47e02788503b47daa410633a93b114717230d6b72`)
     *
     * @@@@@@@@@
     */
    const collectionAddress = Address.parse(`0:a49759da7145aa3459b1c92195c8fad443491659fa0ad0ede0b95ec1038b16e5`);
    const batchSize = 50;

    const nftCollection = provider.open(NftCollectionEditable.createFromAddress(collectionAddress));
    const batch: NftCollectionContent[] = Array.from({ length: batchSize }, (_, i) => i).map((index) => ({
        itemOwnerAddress: randomAddress(),
        uri: `https://gateway.pinata.cloud/ipfs/${pinataArtifact.metadata}/0.json`,
    }));
    await nftCollection.sendBatchMint(provider.sender(), {
        nftItemContents: batch,
        eachItemTONAmount: toNano('0.02'),
    });

    console.log(`Check your wallet's tx: ${provider.sender().address}`);
}
