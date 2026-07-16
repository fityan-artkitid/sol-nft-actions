// execute: npx ts-node-esm update-project.ts
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Connection, Keypair } from "@solana/web3.js";
import * as fs from "fs";
import BN from "bn.js";
import idl from "../artkit_stake_v1.json" with { type: "json" };

async function run() {
    // 1. Parameter Jaringan & Identitas Project Target
    const RPC_ENDPOINT = "http://127.0.0.1:8899";
    const connection = new Connection(RPC_ENDPOINT, "confirmed");
    const projectId = "boschoko99"; // ini gabisa dirubah, soale butuh ini sebagai id

    // NFT Collection Address (Bisa disamakan atau diganti baru jika ada migrasi koleksi)
    const nftCollectionMint = new PublicKey(
        "8ghCYzMZgRuDQ3YiFbE85yTckNzXYvDuKWyrxeCVdwEK",
    );

    // 2. Load wallet dari ids.json (Harus wallet yang sama dengan admin pembuat di awal)
    const walletSecretKey = JSON.parse(fs.readFileSync("./ids.json", "utf-8"));
    const signerKeypair = Keypair.fromSecretKey(new Uint8Array(walletSecretKey));

    console.log(
        "Alamat Wallet Admin pembayar:",
        signerKeypair.publicKey.toBase58(),
    );

    // 3. Bangun provider Anchor secara mandiri
    const walletWrapper = new Wallet(signerKeypair);
    const provider = new AnchorProvider(connection, walletWrapper, {
        preflightCommitment: "confirmed",
    });

    const program = new Program(idl as any, provider);

    // 4. Cari koordinat alamat PDA Project Config lama berdasarkan projectId
    const [projectConfigPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("project_config"), Buffer.from(projectId)],
        program.programId,
    );

    console.log("Target PDA Config yang akan diupdate:", projectConfigPDA.toBase58());

    // 5. Susun Konfigurasi BARU (Silakan ubah angka poin di sini sesuai kebutuhan)
    const NewTiersData = [
        { tierName: "Challenger", basePoints: new BN(120) },      // Misal: Naik dari 100 ke 120
        { tierName: "Champion", basePoints: new BN(180) },        // Misal: Naik dari 150 ke 180
        { tierName: "Grand Champion", basePoints: new BN(300) },  // Misal: Naik dari 250 ke 300
        { tierName: "Immortal", basePoints: new BN(600) },        // Misal: Naik dari 500 ke 600
    ];

    const NewDurationsData = [
        { days: new BN(30), multiplierBps: 10000 }, 
        { days: new BN(60), multiplierBps: 10600 }, // Misal: Pengali naik ke 1.06x
        { days: new BN(90), multiplierBps: 11500 }, // Misal: Pengali naik ke 1.15x
        { days: new BN(180), multiplierBps: 13000 },// Misal: Pengali naik ke 1.30x
        { days: new BN(365), multiplierBps: 17500 },// Misal: Pengali naik ke 1.75x
    ];

    console.log("Mengirim transaksi pembaruan data ke blockchain...");

    try {
        // 🌟 MEMANGGIL METODE UPDATE: .updateProjectConfig
        const tx = await program.methods.updateProjectConfig!(
            nftCollectionMint,
            new BN(1500),
            new BN(100000000),  // Ubah Denda kabur awal baru (misal naik jadi 0.1 SOL)
            NewTiersData,
            NewDurationsData,
        )
            .accountsStrict({
                admin: signerKeypair.publicKey,
                projectConfig: projectConfigPDA,
                systemProgram: SystemProgram.programId,
            })
            .rpc();

        console.log("🎉 Konfigurasi ekosistem Bos Choko BERHASIL diperbarui di Blockchain!");
        console.log("Signature Transaksi:", tx);
    } catch (err) {
        console.error("❌ Gagal memperbarui project_config:", err);
    }
}

run();