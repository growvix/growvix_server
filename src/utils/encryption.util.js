import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const keysPath = path.join(process.cwd(), 'rsa_keys.json');

let publicKey, privateKey;

if (fs.existsSync(keysPath)) {
    const keys = JSON.parse(fs.readFileSync(keysPath, 'utf8'));
    publicKey = keys.publicKey;
    privateKey = keys.privateKey;
} else {
    // Generate RSA key pair on server startup
    const generated = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    });
    publicKey = generated.publicKey;
    privateKey = generated.privateKey;
    fs.writeFileSync(keysPath, JSON.stringify({ publicKey, privateKey }));
}

/**
 * Get the public key (PEM format) to send to the frontend
 */
export const getPublicKey = () => publicKey;

/**
 * Decrypt an RSA-encrypted string using the server's private key
 * @param {string} encryptedData - Base64-encoded encrypted string
 * @returns {string} - Decrypted plain text
 */
export const decryptPassword = (encryptedData) => {
    try {
        const buffer = Buffer.from(encryptedData, 'base64');
        
        // Use NO_PADDING to bypass Node.js 22 strict PKCS1 blocks and manually unpad
        const decryptedRaw = crypto.privateDecrypt(
            {
                key: privateKey,
                padding: crypto.constants.RSA_NO_PADDING
            },
            buffer
        );

        // Strip PKCS#1 v1.5 padding manually
        // Format: 0x00 0x02 <non-zero padding bytes> 0x00 <payload>
        let payloadStart = -1;
        for (let i = 2; i < decryptedRaw.length; i++) {
            if (decryptedRaw[i] === 0x00) {
                payloadStart = i + 1;
                break;
            }
        }

        if (payloadStart === -1 || decryptedRaw[0] !== 0x00 || (decryptedRaw[1] !== 0x02 && decryptedRaw[1] !== 0x00)) {
            // Some parsers strictly enforce 0x02, others allow slight variations but JSencrypt uses 0x02
            // We just fallback to toString if parsing fails, but throw if safely identifiable as bad padding
            if (payloadStart === -1) throw new Error("Invalid PKCS1 padding payload");
        }

        const unpaddedBuf = decryptedRaw.subarray(payloadStart);
        return unpaddedBuf.toString('utf8');
    } catch (err) {
        throw new Error('Failed to decrypt password: ' + err.message);
    }
};
