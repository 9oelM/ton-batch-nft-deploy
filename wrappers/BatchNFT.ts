import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type BatchNFTConfig = {};

export function batchNFTConfigToCell(config: BatchNFTConfig): Cell {
    return beginCell().endCell();
}

export class BatchNFT implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new BatchNFT(address);
    }

    static createFromConfig(config: BatchNFTConfig, code: Cell, workchain = 0) {
        const data = batchNFTConfigToCell(config);
        const init = { code, data };
        return new BatchNFT(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
}
