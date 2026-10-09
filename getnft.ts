import { 
  Connection, 
  Keypair, 
  PublicKey, 
  Transaction, 
  sendAndConfirmTransaction 
} from '@solana/web3.js';
import { 
  getAssociatedTokenAddress, 
  createThawAccountInstruction, 
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  getAccount
} from '@solana/spl-token';
import * as fs from 'fs';

const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");

// 1. Load Keypair dari file JSON dengan benar
const secretKeyArray = JSON.parse(fs.readFileSync("./sol-boschoko.json", "utf-8"));
const authorityKeypair = Keypair.fromSecretKey(Uint8Array.from(secretKeyArray));
const myPubKey = authorityKeypair.publicKey;

const mintPubKey = new PublicKey("Bp9YsNYvBbQJZkrTpsc7D6ARueBpDS58TXkgbfmjDLWC");
const ownerPubKey = new PublicKey("HH67v5SWPVTT1A9YkvWLTqWDu8bqfDnTsfWDFYHp25y");

async function reclaimNft() {
  try {
    // 2. Dapatkan Associated Token Account (ATA) untuk Owner dan Anda
    const sourceAta = await getAssociatedTokenAddress(mintPubKey, ownerPubKey);
    const destinationAta = await getAssociatedTokenAddress(mintPubKey, myPubKey);

    const tx = new Transaction();

    // 3. Tambahkan Instruksi Unfreeze (Thaw)
    tx.add(
      createThawAccountInstruction(
        sourceAta,         // Account yang di-freeze
        mintPubKey,        // Mint NFT
        myPubKey           // Freeze Authority
      )
    );

    // 4. Buat ATA Anda jika belum ada di wallet tujuan
    try {
      await getAccount(connection, destinationAta);
    } catch (e) {
      tx.add(
        createAssociatedTokenAccountInstruction(
          myPubKey,        // Payer
          destinationAta,  // ATA baru
          myPubKey,        // Owner ATA baru
          mintPubKey       // Mint NFT
        )
      );
    }

    // 5. Tambahkan Instruksi Transfer
    tx.add(
      createTransferInstruction(
        sourceAta,         // Source ATA
        destinationAta,    // Destination ATA
        ownerPubKey,       // Authority akun sumber
        1                  // Jumlah (1 NFT = 1 token dengan decimals 0)
      )
    );

    // 6. Kirim dan konfirmasi transaksi
    const signature = await sendAndConfirmTransaction(connection, tx, [authorityKeypair]);
    console.log("Transaksi Sukses! Signature:", signature);

  } catch (error) {
    console.error("Gagal mengeksekusi transaksi:", error);
  }
}

reclaimNft();