// execute: npx ts-node-esm check-epochs.ts
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair } from "@solana/web3.js";
import * as fs from "fs";
import idl from "../artkit_stake_v1.json" with { type: "json" };

async function run() {
    const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8899";
    const connection = new Connection(RPC_ENDPOINT, "confirmed");
    
    // Identitas Tenant/Proyek yang ingin dicek
    const targetProjectId = "boschoko99"; 

    // Load wallet dummy/admin hanya untuk syarat inisialisasi provider Anchor
    const walletSecretKey = JSON.parse(fs.readFileSync("./ids.json", "utf-8"));
    const signerKeypair = Keypair.fromSecretKey(new Uint8Array(walletSecretKey));
    const walletWrapper = new Wallet(signerKeypair);
    
    const provider = new AnchorProvider(connection, walletWrapper, {
        preflightCommitment: "confirmed",
    });

    const program = new Program(idl as any, provider);

    console.log(`🔍 Menghubungi Solana Cluster... Menarik semua Epoch Log untuk proyek: "${targetProjectId}"...\n`);

    try {
        // 🌟 Trik Anchor: Menarik SEMUA akun bertipe epochRewardLog yang ada di blockchain
        // Ganti 'epochRewardLog' sesuai nama camelCase struct di file IDL-mu (misal: epochLog atau epochRewardLog)
        const allEpochLogs = await (program.account as any).epochRewardLog.all();

        // Filter hasil pencarian agar hanya menampilkan data milik projek target saja
        const filteredEpochs = allEpochLogs.filter((log: any) => {
            return log.account.projectId === targetProjectId || log.account.project_id === targetProjectId;
        });

        if (filteredEpochs.length === 0) {
            console.log(`ℹ️ Tidak ditemukan Epoch yang aktif untuk proyek "${targetProjectId}".`);
            console.log(`Silakan jalankan script set-epoch.ts terlebih dahulu.`);
            return;
        }

        console.log(`=======================================================`);
        console.log(`📊 DAFTAR EPOCH REWARD YANG AKTIF [Projek: ${targetProjectId}]`);
        console.log(`=======================================================`);

        // Tampilkan data epoch dalam bentuk tabel rapi di terminal
        filteredEpochs.forEach((log: any, index: number) => {
            const acc = log.account;
            
            // Jaring pengaman penamaan properti camelCase / snake_case dari IDL
            const epochId = acc.epochId || acc.epoch_id;
            const rawAllocatedSol = acc.totalAllocatedSol || acc.total_allocated_sol || 0;
            const rawSettledPoints = acc.totalSettledPoints || acc.total_settled_points || 0;
            
            // Konversi dari satuan Lamports ke SOL asli (1 SOL = 10^9 Lamports)
            const allocatedSol = Number(rawAllocatedSol) / 1_000_000_000;

            console.log(`${index + 1}. 🗓️  Epoch ID         : ${epochId}`);
            console.log(`   🏛️  Alamat PDA Akun : ${log.publicKey.toBase58()}`);
            console.log(`   💰 Total Reward Pool: ${allocatedSol.toFixed(2)} SOL`);
            console.log(`   🎯 Total Poin Global: ${rawSettledPoints.toString()}`);
            console.log(`-------------------------------------------------------`);
        });

    } catch (err) {
        console.error("❌ Gagal menarik data Epoch dari blockchain:", err);
        console.log("\n💡 Tips: Cek nama struct akun Epoch di file IDL JSON-mu. Pastikan namanya pas (misal: 'epochLog' atau 'epochRewardLog').");
    }
}

run();