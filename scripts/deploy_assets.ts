import pinataSDK from '@pinata/sdk';
import { readdirSync } from 'fs';
import { writeFile, readFile } from 'fs/promises';
import path from 'path';
import fs from 'fs';
import 'dotenv/config';

async function uploadFolderToIPFS(folderPath: string): Promise<string> {
    const pinata = new pinataSDK({
        pinataApiKey: process.env.PINATA_API_KEY,
        pinataSecretApiKey: process.env.PINATA_API_SECRET,
    });

    const response = await pinata.pinFromFS(folderPath);
    return response.IpfsHash;
}

async function updateMetadataFiles(metadataFolderPath: string, imagesIpfsHash: string): Promise<void> {
    const files = readdirSync(metadataFolderPath);

    let index = 0;
    for (const filename of files) {
        const filePath = path.join(metadataFolderPath, filename);
        const file = await readFile(filePath);

        const metadata = JSON.parse(file.toString());
        metadata.image =
            index != files.length - 1
                ? `https://gateway.pinata.cloud/ipfs/${imagesIpfsHash}/${index}.png`
                : `https://gateway.pinata.cloud/ipfs/${imagesIpfsHash}/logo.png`;

        await writeFile(filePath, JSON.stringify(metadata));

        index += 1;
    }
}

async function deployAssets() {
    const metadataFolderPath = './assets/metadata/';
    const imagesFolderPath = './assets/images/';

    const imagesIpfsHash = await uploadFolderToIPFS(imagesFolderPath);
    console.log(`Successfully uploaded the pictures to ipfs: https://gateway.pinata.cloud/ipfs/${imagesIpfsHash}`);

    await updateMetadataFiles(metadataFolderPath, imagesIpfsHash);
    const metadataIpfsHash = await uploadFolderToIPFS(metadataFolderPath);
    console.log(`Successfully uploaded the metadata to ipfs: https://gateway.pinata.cloud/ipfs/${metadataIpfsHash}`);

    // Save hash to local file
    const hashes = {
        images: imagesIpfsHash,
        metadata: metadataIpfsHash,
    };
    fs.rmSync(`artifact.pinata.json`, { force: true });
    fs.writeFileSync(`artifact.pinata.json`, JSON.stringify(hashes, null, 2));

    process.exit(0);
}

deployAssets();
