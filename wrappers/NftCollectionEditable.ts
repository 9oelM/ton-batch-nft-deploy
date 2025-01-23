import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';
import { encodeOffChainContent } from './utils';

export type NftCollectionEditableConfig = {
    ownerAddress: Address
    nftItemCode: Cell
    royaltyPercent: number
    royaltyAddress: Address
    nextItemIndex: number
    collectionContentUrl: string
    commonContentUrl: string
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function NftCollectionEditableToCell(config: NftCollectionEditableConfig): Cell {
    const dataCell = beginCell()
    
    dataCell.storeAddress(config.ownerAddress)
    dataCell.storeUint(config.nextItemIndex, 64)

    const contentCell = beginCell()

    const collectionContent = encodeOffChainContent(config.collectionContentUrl)

    const commonContent = beginCell()
    commonContent.storeBuffer(Buffer.from(config.commonContentUrl))

    contentCell.storeRef(collectionContent)
    contentCell.storeRef(commonContent.asCell())
    dataCell.storeRef(contentCell)

    dataCell.storeRef(config.nftItemCode)

    const royaltyBase = 1000
    const royaltyFactor = Math.floor(config.royaltyPercent * royaltyBase)
    const royaltyCell = beginCell()
    royaltyCell.storeUint(royaltyFactor, 16)
    royaltyCell.storeUint(royaltyBase, 16)
    royaltyCell.storeAddress(config.royaltyAddress)
    dataCell.storeRef(royaltyCell)

    return dataCell.endCell()
}

export class NftCollectionEditable implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new NftCollectionEditable(address);
    }

    static createFromConfig(config: NftCollectionEditableConfig, code: Cell, workchain = 0) {
        const data = NftCollectionEditableToCell(config);
        const init = { code, data };
        return new NftCollectionEditable(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
}
