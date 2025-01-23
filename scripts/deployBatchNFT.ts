import { toNano } from '@ton/core';
import { BatchNFT } from '../wrappers/BatchNFT';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const batchNFT = provider.open(BatchNFT.createFromConfig({}, await compile('BatchNFT')));

    await batchNFT.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(batchNFT.address);

    // run methods on `batchNFT`
}
