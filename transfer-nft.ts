import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplCore, transferV1 } from "@metaplex-foundation/mpl-core";
import { publicKey, keypairIdentity } from "@metaplex-foundation/umi";
import * as fs from "fs";

async function transferNFT() {
  // 1. Inisialisasi Umi menuju custom localnet kamu
  const umi = createUmi("http://34.128.75.160:8899").use(mplCore());

  // 2. Load wallet pengirim (pemilik NFT saat ini)
  const walletSecretKey = JSON.parse(fs.readFileSync("./ids.json", "utf-8"));
  const walletKeypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(walletSecretKey));
  umi.use(keypairIdentity(walletKeypair));

  // 3. Definisikan alamat NFT dan alamat wallet tujuan
  const assetAddress = publicKey("6fspXZ5b3F8jbZMQTXP6aYFn12eoudtLaAg7FQX8Wek7");
  const destinationWallet = publicKey("4LSSc5UkLigkVVZCtrrLS9ePu4ApeWFueQo6ztqk3pHM");
  const collectionAddress = publicKey("9Vo8Awz2HkSjqqGobAbWJvXEFJrYZZmSwdxgSCoLfCut");

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