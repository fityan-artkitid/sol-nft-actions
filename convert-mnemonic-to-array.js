import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import { Keypair } from '@solana/web3.js';

const mnemonic = "hill degree quick acoustic survey pistol cement purity bulk time home ride";

// 1. Convert mnemonic ke seed buffer
const seed = await bip39.mnemonicToSeed(mnemonic);

// 2. Derivasi path Solana (m/44'/501'/0'/0')
const path = "m/44'/501'/0'/0'";
const derivedSeed = derivePath(path, seed.toString('hex')).key;

// 3. Buat Keypair
const keypair = Keypair.fromSeed(derivedSeed);

// 4. Print byte array
console.log("JSON Keypair Array:");
console.log(JSON.stringify(Array.from(keypair.secretKey)));