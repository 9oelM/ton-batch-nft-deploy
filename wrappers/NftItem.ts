import { Address, Cell, Contract, ContractProvider } from '@ton/core';

export class NftItem implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new NftItem(address);
    }

    async getNftData(provider: ContractProvider) {
        const res = await provider.get('get_nft_data', []);

        const init = res.stack.readBigNumber();
        const index = res.stack.readBigNumber();
        const collectionAddress = res.stack.readAddress();
        const ownerAddress = res.stack.readAddress();
        const content = res.stack.readCell();

        return {
            init,
            index,
            collectionAddress,
            ownerAddress,
            content,
        };
    }
}
