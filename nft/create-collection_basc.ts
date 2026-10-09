// execute jalanin ini npx ts-node-esm nft/create-collection_basc.ts

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { createCollection, ruleSet } from '@metaplex-foundation/mpl-core'
import { mplCore } from '@metaplex-foundation/mpl-core'
import { generateSigner, keypairIdentity, publicKey } from '@metaplex-foundation/umi'
import * as fs from 'fs'
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

// Initialize UMI
const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8899";
const umi = createUmi(RPC_ENDPOINT).use(mplCore())
const walletSecret = process.env.NEXT_PUBLIC_WALLET_SECRET;
// const umi = createUmi("http://34.128.75.160:8899").use(mplCore());

// 2. Load wallet kamu untuk bayar transaksi (Pastikan id.json sudah ada dan berisi SOL Devnet)
// const walletSecretKey = JSON.parse(fs.readFileSync('./ids.json', 'utf-8')) //devnet
const walletSecretKey = JSON.parse(fs.readFileSync(walletSecret || './testingwallet.json', 'utf-8')) //mainet
const myKeypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(walletSecretKey))

console.log("Alamat Wallet yang bayar:", myKeypair.publicKey.toString());
umi.use(keypairIdentity(myKeypair))

// Generate a new keypair for the collection
const collectionSigner = generateSigner(umi)
const creator1 = publicKey('4LSSc5UkLigkVVZCtrrLS9ePu4ApeWFueQo6ztqk3pHM')
// Create a new Collection
await createCollection(umi, {
  collection: collectionSigner,
  name: 'Bored Ape Solana Club',
  uri: 'https://arweave.net/7RHTS7Qmre6nv6TvwGX9ZMdMdEQkWxaeOhtjbAj5pfo',
  plugins: [
    {
      type: 'Royalties',
      basisPoints: 100,
      creators: [
        { address: creator1, percentage: 100 },
      ],
      ruleSet: ruleSet('None'),
    },
  ],
}).sendAndConfirm(umi)

console.log('Collection created:', collectionSigner.publicKey)