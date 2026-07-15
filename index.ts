// execute jalanin ini npx ts-node-esm index.ts

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { createCollection, ruleSet } from '@metaplex-foundation/mpl-core'
import { mplCore } from '@metaplex-foundation/mpl-core'
import { generateSigner, keypairIdentity, publicKey } from '@metaplex-foundation/umi'
import * as fs from 'fs'

// Initialize UMI
const umi = createUmi('http://127.0.0.1:8899').use(mplCore())
// const umi = createUmi("http://34.128.75.160:8899").use(mplCore());

// 2. Load wallet kamu untuk bayar transaksi (Pastikan id.json sudah ada dan berisi SOL Devnet)
const walletSecretKey = JSON.parse(fs.readFileSync('./ids.json', 'utf-8'))
const myKeypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(walletSecretKey))

console.log("Alamat Wallet yang bayar:", myKeypair.publicKey.toString());
umi.use(keypairIdentity(myKeypair))

// Generate a new keypair for the collection
const collectionSigner = generateSigner(umi)
const creator1 = publicKey('7mtvJZgC1UMAvZLwdaykBa12AAcjNNvgHJtzb2roadWR')
// Create a new Collection
await createCollection(umi, {
  collection: collectionSigner,
  name: 'Snakehead Story by Bos Choko',
  uri: 'https://4inpnpfjsqbojbhoflujub4n76nb75wcubdgiebtwkjeenuuoszq.turbo-gateway.com/4hr2vKmUAuSE7iromgeN_5of9sKgRmQQM7KSQjaUdLM?',
  plugins: [
    {
      type: 'Royalties',
      basisPoints: 500,
      creators: [
        { address: creator1, percentage: 100 },
      ],
      ruleSet: ruleSet('None'),
    },
  ],
}).sendAndConfirm(umi)

console.log('Collection created:', collectionSigner.publicKey)