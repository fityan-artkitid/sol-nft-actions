import * as fs from 'fs';
import bs58 from 'bs58';

// 1. Baca file id.json
const rawData = fs.readFileSync('./ids.json', 'utf-8');

// 2. Parse data JSON menjadi array angka (Uint8Array)
const byteArray = new Uint8Array(JSON.parse(rawData));

// 3. Ubah dari Byte Array ke string Base58
const privateKeyBase58 = bs58.encode(byteArray);

console.log("--- HASIL KONVERSI ---");
console.log("Private Key (Base58):");
console.log(privateKeyBase58); 
// Hasilnya akan berupa teks panjang seperti: 4Z3pX9...