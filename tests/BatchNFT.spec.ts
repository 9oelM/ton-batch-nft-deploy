import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { BatchNFT } from '../wrappers/BatchNFT';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('BatchNFT', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('BatchNFT');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let batchNFT: SandboxContract<BatchNFT>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        batchNFT = blockchain.openContract(BatchNFT.createFromConfig({}, code));

        deployer = await blockchain.treasury('deployer');

        const deployResult = await batchNFT.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: batchNFT.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and batchNFT are ready to use
    });
});
