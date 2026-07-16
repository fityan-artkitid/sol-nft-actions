
// execute: npx ts-node-esm project/check-project.ts
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { PublicKey, Connection, Keypair } from "@solana/web3.js";
import * as fs from "fs";
import idl from "../artkit_stake_v1.json" with { type: "json" };

async function run() {
    const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8899";
    const connection = new Connection(RPC_ENDPOINT, "confirmed");
    
    // 🔍 MASUKKAN ID PROJEK YANG INGIN KAMU CEK STATUSNYA
    const projectId = "boschoko99"; 

    // Load wallet dummy/admin hanya sebagai formalitas provider Anchor
    const walletSecretKey = JSON.parse(fs.readFileSync("./ids.json", "utf-8"));
    const signerKeypair = Keypair.fromSecretKey(new Uint8Array(walletSecretKey));
    const walletWrapper = new Wallet(signerKeypair);
    
    const provider = new AnchorProvider(connection, walletWrapper, {
        preflightCommitment: "confirmed",
    });
    const program = new Program(idl as any, provider);

    // 1. Hitung alamat PDA secara deterministik berdasarkan seed project_config + ID
    const [projectConfigPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("project_config"), Buffer.from(projectId)],
        program.programId,
    );

    console.log(`🔍 Memeriksa ID Projek: "${projectId}"`);
    console.log(`📍 Target Alamat PDA  : ${projectConfigPDA.toBase58()}\n`);

    try {
        // 2. Tarik informasi raw account dari blockchain Solana
        const accountInfo = await connection.getAccountInfo(projectConfigPDA);

        // 3. Validasi apakah akun tersebut eksis
        if (!accountInfo) {
            console.log(`❌ STATUS: Pendaftaran TIDAK DITEMUKAN.`);
            console.log(`💡 ID Projek "${projectId}" belum pernah di-init atau sudah sukses di-close.`);
            return;
        }

        // 4. Jika eksis, decode datanya menggunakan fetch account bawaan Anchor
        // Ganti 'projectConfig' sesuai nama camelCase/snake_case di IDL-mu jika error (misal project_config)
        const configData: any = await (program.account as any).projectConfig.fetch(projectConfigPDA);

        console.log(`=======================================================`);
        console.log(`✅ STATUS: PROJEK AKTIF & TERDAFTAR DI BLOCKCHAIN`);
        console.log(`=======================================================`);
        console.log(`👑 Admin Sah (Owner)    : ${configData.admin.toBase58()}`);
        console.log(`🐟 NFT Collection Mint  : ${configData.nftCollection?.toBase58() || configData.nft_collection?.toBase58()}`);
        console.log(`📈 Poin Global Aktif    : ${configData.totalGlobalWeight?.toString() || configData.total_global_weight?.toString()}`);
        console.log(`🛡️  Min Effective Points : ${configData.minEffectivePoints?.toString() || configData.min_effective_points?.toString()}`);
        console.log(`⚠️  Denda Early Unstake : ${Number(configData.emergencyPenaltyLamports || configData.emergency_penalty_lamports) / 1_000_000_000} SOL`);
        
        console.log(`\n📊 Daftar Tier yang Diizinkan:`);
        const allowedTiers = configData.allowedTiers || configData.allowed_tiers || [];
        allowedTiers.forEach((t: any) => {
            console.log(`   - Tier: ${t.tierName || t.tier_name} (Base Points: ${t.basePoints?.toString() || t.base_points?.toString()})`);
        });

        console.log(`\n⏳ Daftar Pilihan Durasi Lockup:`);
        const allowedDurations = configData.allowedDurations || configData.allowed_durations || [];
        allowedDurations.forEach((d: any) => {
            console.log(`   - ${d.days?.toString()} Hari | Multiplier: ${(Number(d.multiplierBps || d.multiplier_bps) / 10000).toFixed(2)}x`);
        });
        console.log(`=======================================================`);

    } catch (err) {
        console.error("❌ Gagal membaca atau men-decode data projek:", err);
    }
}

run();