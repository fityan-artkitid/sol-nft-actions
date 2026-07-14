import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { addPlugin, mplCore } from "@metaplex-foundation/mpl-core";
import {
  generateSigner,
  publicKey,
  keypairIdentity,
} from "@metaplex-foundation/umi";
import fs from "fs";

// 1. Inisialisasi Umi
const umi = createUmi("https://api.devnet.solana.com").use(mplCore());

// 2. Baca file ids.json secara lokal (Byte Array) sebagai wallet penandatangan
const walletSecretKey = JSON.parse(fs.readFileSync("./ids.json", "utf-8"));
const walletKeypair = umi.eddsa.createKeypairFromSecretKey(
  new Uint8Array(walletSecretKey),
);
umi.use(keypairIdentity(walletKeypair));

const assetAddress = publicKey("43URkwHib3XA34zEiAy4aqtnTHtXC5HciDx5N9xDxQXJ");

async function main() {
  console.log("Updating NFT plugin...");

  // 4. Kirim transaksi menggunakan Umi yang sudah punya Signer
  await addPlugin(umi, {
    asset: assetAddress,
    plugin: {
      type: "FreezeDelegate",
      frozen: false,
    },
  }).sendAndConfirm(umi);

  console.log("Plugin updated successfully!");
}

main().catch(console.error);

//9JuwdCVFvtzdUj5bSkqHhYPQCMukJT7AoziPKu8WKHLK
//Byj4hLhCrMkbsWdGpgmnA6oeFYyxWLaEv8rUES1nWwvJ
//43URkwHib3XA34zEiAy4aqtnTHtXC5HciDx5N9xDxQXJ
