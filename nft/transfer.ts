import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplCore, transferV1 } from "@metaplex-foundation/mpl-core";
import { publicKey, keypairIdentity } from "@metaplex-foundation/umi";
import * as fs from "fs";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

async function transferNFT() {
  // 1. Inisialisasi Umi menuju custom localnet kamu
  const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8899";
  const umi = createUmi(RPC_ENDPOINT).use(mplCore());

  // 2. Load wallet pengirim (pemilik NFT saat ini)
  const walletSecretKey = JSON.parse(fs.readFileSync("./ids.json", "utf-8"));
  const walletKeypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(walletSecretKey));
  umi.use(keypairIdentity(walletKeypair));

  console.log("process.env.NEXT_PUBLIC_COLLECTION_ADDRESS " +process.env.NEXT_PUBLIC_COLLECTION_ADDRESS)
  // 3. Definisikan alamat NFT dan alamat wallet tujuan
  const assetAddress = publicKey("6dJ2CPuFKnDKeqGyATRzucVwgHvXGwuPZyUrBCXi8g2i");
  const destinationWallet = publicKey("4LSSc5UkLigkVVZCtrrLS9ePu4ApeWFueQo6ztqk3pHM");
  const collectionAddress = publicKey(process.env.NEXT_PUBLIC_COLLECTION_ADDRESS || "");

  console.log("Memulai proses transfer...");

  try {
    // 4. Eksekusi transfer menggunakan Metaplex Core function
    await transferV1(umi, {
      asset: assetAddress,
      newOwner: destinationWallet,
      collection: collectionAddress,
    }).sendAndConfirm(umi);

    console.log(`🎉 NFT berhasil ditransfer ke ${destinationWallet.toString()}`);
  } catch (error) {
    console.error("Transfer gagal:", error);
  }
}

transferNFT();