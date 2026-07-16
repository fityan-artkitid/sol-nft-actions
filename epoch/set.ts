// execute: npx ts-node-esm set-epoch.ts
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Connection, Keypair } from "@solana/web3.js";
import * as fs from "fs";
import BN from "bn.js";
import idl from "../artkit_stake_v1.json" with { type: "json" };

async function run() {
    // 1. Parameter Jaringan & Konfigurasi Ekosistem
    const RPC_ENDPOINT = "http://127.0.0.1:8899";
    const connection = new Connection(RPC_ENDPOINT, "confirmed");
    
    // Identitas Tenant/Proyek
    const projectId = "boschoko99"; 
    
    // Target Periode Bulanan (Format: YYYYMM)
    const currentEpochId = 202607;
    
    // Alokasi SOL Hadiah untuk bulan ini (misal: 2.0 SOL)
    // Diubah ke satuan terkecil blockchain (Lamports): 2 * 10^9
    const allocatedSolAmount = new BN(2 * 1_000_000_000); 

    // 2. Load Wallet Admin dari ids.json
    const walletSecretKey = JSON.parse(fs.readFileSync("./ids.json", "utf-8"));
    const signerKeypair = Keypair.fromSecretKey(new Uint8Array(walletSecretKey));

    console.log("Alamat Wallet Admin:", signerKeypair.publicKey.toBase58());
    console.log(`Mempersiapkan rilis Reward Pool untuk Epoch: ${currentEpochId}...`);

    // 3. Bangun provider Anchor secara mandiri
    const walletWrapper = new Wallet(signerKeypair);
    const provider = new AnchorProvider(connection, walletWrapper, {
        preflightCommitment: "confirmed",
    });

    const program = new Program(idl as any, provider);

    // 4. Cari alamat PDA Project Config (Brankas Utama)
    const [projectConfigPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("project_config"), Buffer.from(projectId)],
        program.programId,
    );

    // 5. Cari / Generate alamat PDA Epoch Reward Log khusus bulan ini
    const epochBuffer = Buffer.alloc(4);
    epochBuffer.writeUInt32LE(currentEpochId);
    
    const [epochRewardLogPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("epoch_log"), Buffer.from(projectId), epochBuffer],
        program.programId,
    );

    console.log("PDA Epoch Log target:", epochRewardLogPDA.toBase58());

    // 6. Eksekusi instruksi on-chain
    try {
        // Asumsi nama metode di smart contract: setEpochReward
        const tx = await program.methods.setEpochReward!(
            currentEpochId,
            allocatedSolAmount
        )
            .accountsStrict({
                admin: signerKeypair.publicKey,
                projectConfig: projectConfigPDA,
                epochLog: epochRewardLogPDA,
                systemProgram: SystemProgram.programId,
            })
            .rpc();

        console.log(`\n🎉 SUKSES! Pintu insentif bulanan ArtKit untuk [${projectId}] telah dibuka.`);
        console.log("Signature Transaksi:", tx);
        console.log(`Alokasi Aktif: ${allocatedSolAmount.toNumber() / 1_000_000_000} SOL`);
    } catch (err) {
        console.error("❌ Gagal merilis epoch reward baru ke blockchain:", err);
    }
}

run();