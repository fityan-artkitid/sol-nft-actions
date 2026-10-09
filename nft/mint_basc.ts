import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  create,
  fetchCollection,
  mplCore,
} from "@metaplex-foundation/mpl-core";
import {
  generateSigner,
  publicKey,
  keypairIdentity,
} from "@metaplex-foundation/umi";
import * as fs from "fs";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

// 🌟 DAFTAR LINK JSON METADATA DARI TURBO GATEWAY
// Kamu tinggal tambahkan item baru di dalam array ini sesuai kebutuhan
const nftList = [
  {
    fileName: "2061.json",
    url: "https://basc.s3.amazonaws.com/meta/2061.json",
  },
  {
    fileName: "4478.json",
    url: "https://basc.s3.amazonaws.com/meta/4478.json",
  },
  {
    fileName: "1954.json",
    url: "https://basc.s3.amazonaws.com/meta/1954.json",
  }
];

async function mintMultipleAssets() {
  // 1. Inisialisasi Umi & aktifkan plugin Metaplex Core
  // const umi = createUmi("https://api.devnet.solana.com").use(mplCore());
  // const umi = createUmi("http://34.128.75.160:8899").use(mplCore());
  const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8899";
  const umi = createUmi(RPC_ENDPOINT).use(mplCore());
  const walletSecret = process.env.NEXT_PUBLIC_WALLET_SECRET;

  // 2. Baca file ids.json secara lokal (Byte Array) sebagai wallet penandatangan
  //const walletSecretKey = JSON.parse(fs.readFileSync("./ids.json", "utf-8")); //devnet
  const walletSecretKey = JSON.parse(fs.readFileSync(walletSecret || './testingwallet.json', 'utf-8')) //mainet
  const walletKeypair = umi.eddsa.createKeypairFromSecretKey(
    new Uint8Array(walletSecretKey),
  );
  umi.use(keypairIdentity(walletKeypair));

  console.log(
    "Menggunakan Wallet Authority:",
    walletKeypair.publicKey.toString(),
  );

  // 3. Masukkan Alamat Akun Koleksi (Collection Address) hasil dari create collection
  const collectionAddress = publicKey(process.env.NEXT_PUBLIC_COLLECTION_ADDRESS || "");

  try {
    console.log("Mengambil data koleksi dari blockchain...");
    const collection = await fetchCollection(umi, collectionAddress);

    const totalNFT = nftList.length;

    // 4. Proses Looping Berdasarkan Data di Array nftList
    for (let i = 0; i < totalNFT; i++) {
      const currentNft = nftList[i];
      if (currentNft == null) {
        console.log(`process kelar, ga ada yang di prosess lagi`);
        return null;
      }

      // Mengambil angka saja dari "1.json" -> menjadi "1"
      const nftNumber = currentNft.fileName.replace(".json", "");

      console.log(
        `\n[${i + 1}/${totalNFT}] Memproses BASC #${nftNumber}...`,
      );

      // Generate keypair baru secara acak khusus untuk alamat unik NFT Core ini
      const assetSigner = generateSigner(umi);

      await create(umi, {
        asset: assetSigner,
        collection: collection,
        name: `BASC #${nftNumber}`, // Penamaan on-chain otomatis mengikuti angka file
        uri: currentNft.url, // Menggunakan URL gateway langsung dari array
        plugins: [
          {
            type: "Royalties",
            basisPoints: 100, // 500 basis points = 5% Royalti
            creators: [
              {
                address: walletKeypair.publicKey, // Wallet kamu otomatis diset sebagai penikmat duit royalti sekunder
                percentage: 100, // Bagian pembagian 100% mutlak untuk wallet ini sendiri
              },
            ],
            ruleSet: { type: "None" }, // Kompatibilitas standar penuh dengan marketplace utama (Tensor/Magic Eden)
          },
          { 
            type: "FreezeDelegate", 
            frozen: false
          },
          {
            type: "TransferDelegate", // Memungkinkan Authority mentransfer NFT meskipun ada di wallet user, sementara set gini nanti di renounce
            authority: {
              type: "Address",
              address: walletKeypair.publicKey,
            },
          },
        ],
      }).sendAndConfirm(umi);

      console.log(`✅ Berhasil! NFT BASC #${nftNumber} dicetak.`);
      console.log(`   Alamat Mint NFT: ${assetSigner.publicKey.toString()}`);
    }

    console.log("\n--- 🎉 SEMUA PROSES MINTING MASSAL SELESAI ---");
  } catch (error) {
    console.error("Oops, ada kendala error di tengah jalan:", error);
  }
}

// Jalankan fungsi minting
mintMultipleAssets();
