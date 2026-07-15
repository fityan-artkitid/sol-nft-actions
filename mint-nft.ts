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

// 🌟 DAFTAR LINK JSON METADATA DARI TURBO GATEWAY
// Kamu tinggal tambahkan item baru di dalam array ini sesuai kebutuhan
const nftList = [
  {
    fileName: "1.json",
    url: "https://turbo-gateway.com/WeLMHITMTeDjWbEZNN2mJd6xa-CWeif6udbeaYZwvE0",
  },
  {
    fileName: "2.json",
    url: "https://turbo-gateway.com/h97HcLGS4EScrJyjUsjq4k9BxiDt8qu9jCOWyHcw_RE",
  },
  {
    fileName: "3.json",
    url: "https://turbo-gateway.com/GeribJVnSj3jyhqR0R9X1RcE6gUmrK5rhRF6H1h2i8M",
  },
  {
    fileName: "4.json",
    url: "https://turbo-gateway.com/3cGn_b2JH_JcwVFR8G08sJD3hMs1uuSpSiIbUKTTV90",
  }
  // {
  //   fileName: "5.json",
  //   url: "https://turbo-gateway.com/TcScjHEh8ej2HE9XDt3b-ozHS4DdECYcEK8lFXfN7Uc",
  // },
  // {
  //   fileName: "6.json",
  //   url: "https://turbo-gateway.com/6jboV9tX022pLQJL5ZE1h2-txBGBXTMsu-mPhAt7uB0",
  // },
  // {
  //   fileName: "7.json",
  //   url: "https://turbo-gateway.com/LEd1ZjM9ff_RBRy7oLtjD_mZzUG3psvW97IIILGtcwM",
  // },
  // {
  //   fileName: "8.json",
  //   url: "https://turbo-gateway.com/yU8xZeta6VjU0iYup8LJK1bUU2IyGfjP066R4RemHNQ",
  // },
  // {
  //   fileName: "9.json",
  //   url: "https://turbo-gateway.com/Zbu3fmdH7TXKDUtEw8gmoUNDPFHQ1nnhhTNDNDtBPp8",
  // },
  // {
  //   fileName: "10.json",
  //   url: "https://turbo-gateway.com/HLpPVagfK374gaQ5wIJBqbNpNJeBhk0nwWP1IPb4O3w",
  // },
  // {
  //   fileName: "15.json",
  //   url: "https://turbo-gateway.com/fslc7p80dyhOGcvdbT4KtGHPb8nmHoH8WQJOQFbbTQg",
  // },
  // {
  //   fileName: "14.json",
  //   url: "https://turbo-gateway.com/NNAlfSlaGHiz1DX1uhhFrMSkoBwvLBhvi9i74-NmUIY",
  // },
  // {
  //   fileName: "13.json",
  //   url: "https://turbo-gateway.com/IG4sni22WHbZLAvHBmB-s1KZE4QzMVy3KtoyakopEb8",
  // },
  // {
  //   fileName: "12.json",
  //   url: "https://turbo-gateway.com/U42cQ7E_AOgihpgwfQedKC71ZE7JHvKQJDPxClL83W4",
  // },
  // {
  //   fileName: "11.json",
  //   url: "https://turbo-gateway.com/C1H-3Pxjqi2zxdTexs5A3E00MRZ3Y5XAsjJc533FdpQ",
  // },
];

async function mintMultipleAssets() {
  // 1. Inisialisasi Umi & aktifkan plugin Metaplex Core
  // const umi = createUmi("https://api.devnet.solana.com").use(mplCore());
  // const umi = createUmi("http://34.128.75.160:8899").use(mplCore());
  const umi = createUmi("http://127.0.0.1:8899").use(mplCore());

  // 2. Baca file ids.json secara lokal (Byte Array) sebagai wallet penandatangan
  const walletSecretKey = JSON.parse(fs.readFileSync("./ids.json", "utf-8"));
  const walletKeypair = umi.eddsa.createKeypairFromSecretKey(
    new Uint8Array(walletSecretKey),
  );
  umi.use(keypairIdentity(walletKeypair));

  console.log(
    "Menggunakan Wallet Authority:",
    walletKeypair.publicKey.toString(),
  );

  // 3. Masukkan Alamat Akun Koleksi (Collection Address) hasil dari create collection
  const collectionAddress = publicKey(
    "8ghCYzMZgRuDQ3YiFbE85yTckNzXYvDuKWyrxeCVdwEK",
  );

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
        `\n[${i + 1}/${totalNFT}] Memproses Bos Choko #${nftNumber}...`,
      );

      // Generate keypair baru secara acak khusus untuk alamat unik NFT Core ini
      const assetSigner = generateSigner(umi);

      await create(umi, {
        asset: assetSigner,
        collection: collection,
        name: `Bos Choko #${nftNumber}`, // Penamaan on-chain otomatis mengikuti angka file
        uri: currentNft.url, // Menggunakan URL gateway langsung dari array
        plugins: [
          {
            type: "Royalties",
            basisPoints: 500, // 500 basis points = 5% Royalti
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
          }
        ],
      }).sendAndConfirm(umi);

      console.log(`✅ Berhasil! NFT Bos Choko #${nftNumber} dicetak.`);
      console.log(`   Alamat Mint NFT: ${assetSigner.publicKey.toString()}`);
    }

    console.log("\n--- 🎉 SEMUA PROSES MINTING MASSAL SELESAI ---");
  } catch (error) {
    console.error("Oops, ada kendala error di tengah jalan:", error);
  }
}

// Jalankan fungsi minting
mintMultipleAssets();
