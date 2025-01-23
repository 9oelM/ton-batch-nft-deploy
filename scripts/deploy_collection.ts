import { toNano } from '@ton/core';
import { compile, NetworkProvider } from '@ton/blueprint';
import { NftCollectionEditable, NftCollectionEditableConfig } from '../wrappers/NftCollectionEditable';
import fs from 'fs';
import { isPinataArtifact } from '../wrappers/PinataArtifact';

export async function run(provider: NetworkProvider) {
    const pinataArtifact = fs.readFileSync('artifact.pinata.json', 'utf-8')

    if (!isPinataArtifact(pinataArtifact)) {
        throw new Error('Invalid artifact');
    }

    const nftItemCode = await compile('NftItem');
    const nftCollectionEditableCode = await compile('NftCollectionEditable');

    const senderAddress = provider.sender().address;
    if (!senderAddress) {
        throw new Error('Sender address is not defined');
    }

    const nftCollectionConfig: NftCollectionEditableConfig = {
        ownerAddress: senderAddress,
        nftItemCode: nftItemCode,
        royaltyPercent: 0.05, // 0.05 = 5%
        royaltyAddress: senderAddress,
        nextItemIndex: 0,
        collectionContentUrl: `ipfs://${pinataArtifact.metadata}/collection.json`,
        commonContentUrl: `ipfs://${pinataArtifact.metadata}/`,
    }

    const nftCollection = provider.open(
        NftCollectionEditable.createFromConfig(
            nftCollectionConfig,
            nftCollectionEditableCode,
        ),
    );
    await nftCollection.sendDeploy(provider.sender(), toNano('0.05'));
    await provider.waitForDeploy(nftCollection.address);

    console.log(`NftCollectionEditable deployed at address: ${nftCollection.address.toString()}`);
}
