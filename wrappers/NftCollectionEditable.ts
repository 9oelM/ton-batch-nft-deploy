import {
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Dictionary,
    fromNano,
    Sender,
    SendMode,
    toNano,
} from '@ton/core';
import { encodeOffChainContent } from './utils';

enum Op {
    MINT = 1,
    BATCH_MINT = 2,
}

export type NftCollectionContent = {
    itemOwnerAddress: Address;
    uri: string;
};

export type NftCollectionEditableConfig = {
    ownerAddress: Address;
    nftItemCode: Cell;
    royaltyPercent: number;
    royaltyAddress: Address;
    nextItemIndex: number;
    collectionContentUrl: string;
    commonContentUrl: string;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function NftCollectionEditableToCell(config: NftCollectionEditableConfig): Cell {
    const dataCell = beginCell();

    dataCell.storeAddress(config.ownerAddress);
    dataCell.storeUint(config.nextItemIndex, 64);

    const contentCell = beginCell();

    const collectionContent = encodeOffChainContent(config.collectionContentUrl);

    const commonContent = beginCell();
    commonContent.storeBuffer(Buffer.from(config.commonContentUrl));

    contentCell.storeRef(collectionContent);
    contentCell.storeRef(commonContent.asCell());
    dataCell.storeRef(contentCell);

    dataCell.storeRef(config.nftItemCode);

    const royaltyBase = 1000;
    const royaltyFactor = Math.floor(config.royaltyPercent * royaltyBase);
    const royaltyCell = beginCell();
    royaltyCell.storeUint(royaltyFactor, 16);
    royaltyCell.storeUint(royaltyBase, 16);
    royaltyCell.storeAddress(config.royaltyAddress);
    dataCell.storeRef(royaltyCell);

    return dataCell.endCell();
}

export class NftCollectionEditable implements Contract {
    static BATCH_DEPLOY_LIMIT = 250;

    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static nftContentToCell(content: NftCollectionContent): Cell {
        const nftItemContent = beginCell();
        nftItemContent.storeAddress(content.itemOwnerAddress);

        const uriContent = beginCell().storeBuffer(Buffer.from(content.uri)).endCell();

        nftItemContent.storeRef(uriContent);
        return nftItemContent.endCell();
    }

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

    async sendMint(
        provider: ContractProvider,
        via: Sender,
        params: {
            value: bigint;

            nftItemContent: Cell | NftCollectionContent;
            itemIndex: number | bigint;
            amount: bigint;
        },
    ) {
        const content =
            params.nftItemContent instanceof Cell
                ? params.nftItemContent
                : NftCollectionEditable.nftContentToCell(params.nftItemContent);

        const mintBody = beginCell()
            .storeUint(Op.MINT, 32)
            .storeUint(0n, 64)
            .storeUint(params.itemIndex, 64)
            .storeCoins(params.amount)
            .storeRef(content)
            .endCell();

        await provider.internal(via, {
            value: params.value,
            body: mintBody,
        });
    }

    async sendBatchMint(
        provider: ContractProvider,
        via: Sender,
        params: {
            batchCount: number;
            nftItemContents: NftCollectionContent[];
            itemIndex: number | bigint;
            itemAmount: bigint;
        },
    ) {
        const batchCount = params.nftItemContents.length;

        const ownerAddresses = params.nftItemContents.map(({ itemOwnerAddress }) => itemOwnerAddress.toRawString());
        if (new Set(ownerAddresses).size !== params.nftItemContents.length) {
            throw new Error('Duplicate owner addresses. Each owner should be unique');
        }

        const minValue = BigInt(batchCount) * params.itemAmount + toNano('0.05');

        console.log(
            `Sending ${fromNano(minValue)} TON to deploy ${params.batchCount} NFTs (each ${fromNano(
                params.itemAmount,
            )} TON)`,
        );

        if (params.batchCount > NftCollectionEditable.BATCH_DEPLOY_LIMIT) {
            throw new Error(`Batch count exceeds the limit: ${NftCollectionEditable.BATCH_DEPLOY_LIMIT}`);
        }
        const deployList = Dictionary.empty<bigint, Cell>(Dictionary.Keys.BigInt(64), Dictionary.Values.Cell());

        for (let i = 0; i < params.batchCount; i++) {
            const content = NftCollectionEditable.nftContentToCell(params.nftItemContents[i]);

            const mintBody = beginCell().storeCoins(params.itemAmount).storeRef(content).endCell();

            deployList.set(BigInt(i), mintBody);
        }

        console.log(`Deploying ${deployList.keys().length} NFT items`);

        const mintBody = beginCell()
            .storeUint(Op.BATCH_MINT, 32)
            .storeUint(0n, 64)
            .storeDict(deployList)
            .storeUint(deployList.keys().length, 64)
            .endCell();

        await provider.internal(via, {
            value: minValue,
            body: mintBody,
        });
    }

    async getCollectionData(provider: ContractProvider) {
        const res = await provider.get('get_collection_data', []);

        const nextItemIndex = res.stack.readBigNumber();
        const collectionContent = res.stack.readCell();
        const ownerAddress = res.stack.readAddress();

        return {
            nextItemIndex,
            collectionContent,
            ownerAddress,
        };
    }

    async getNftAddressByIndex(provider: ContractProvider, index: bigint): Promise<Address> {
        const res = await provider.get('get_nft_address_by_index', [{ type: 'int', value: index }]);

        return res.stack.readAddress();
    }
}
