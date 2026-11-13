//! Diary proofs. A caller-supplied `verified: true` is never enough.
//!
//! The pinned key is 32-byte ed25519. Production leaves it unset until a
//! NEAR AI verifying key is actually known. A missing key rejects every proof.

use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use sha2::{Digest, Sha256};

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum ProofError {
    Disabled,
    Commitment,
    Signature,
}

pub fn commitment_of(plaintext: &[u8]) -> String {
    hex::encode(Sha256::digest(plaintext))
}

pub fn verify_diary(public_key: Option<&[u8]>, commitment_hex: &str, signature: &[u8]) -> Result<(), ProofError> {
    let key_bytes = public_key.ok_or(ProofError::Disabled)?;
    if commitment_hex.len() != 64 || !commitment_hex.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(ProofError::Commitment);
    }
    let key_array: [u8; 32] = key_bytes.try_into().map_err(|_| ProofError::Signature)?;
    let key = VerifyingKey::from_bytes(&key_array).map_err(|_| ProofError::Signature)?;
    let signature = Signature::from_slice(signature).map_err(|_| ProofError::Signature)?;
    let message = commitment_hex.as_bytes();
    key.verify(message, &signature).map_err(|_| ProofError::Signature)
}

#[cfg(test)]
mod tests {
    use super::*;
    use ed25519_dalek::{Signer, SigningKey};

    #[test]
    fn unset_key_rejects_and_a_real_signature_verifies() {
        let commitment = commitment_of(b"spike at the south arch");
        assert_eq!(verify_diary(None, &commitment, &[0; 64]).unwrap_err(), ProofError::Disabled);
        let signing = SigningKey::from_bytes(&[9u8; 32]);
        let signature = signing.sign(commitment.as_bytes());
        let public = signing.verifying_key().to_bytes();
        assert!(verify_diary(Some(&public), &commitment, &signature.to_bytes()).is_ok());
        assert!(verify_diary(Some(&public), &commitment, &[1u8; 64]).is_err());
        assert!(commitment_of(b"spike at the south arch").chars().all(|c| c != ' '));
    }
}
