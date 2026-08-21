package crypto

import (
	"crypto/ecdh"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
)

// KeyPair represents an ECDH P-256 public/private keypair
type KeyPair struct {
	PrivateKey *ecdh.PrivateKey
	PublicKey  *ecdh.PublicKey
}

// GenerateECDHKeyPair generates a P-256 key pair for ephemeral key exchange
func GenerateECDHKeyPair() (*KeyPair, error) {
	curve := ecdh.P256()
	privKey, err := curve.GenerateKey(rand.Reader)
	if err != nil {
		return nil, fmt.Errorf("failed to generate ECDH key: %w", err)
	}

	return &KeyPair{
		PrivateKey: privKey,
		PublicKey:  privKey.PublicKey(),
	}, nil
}

// PublicKeyBase64 exports the public key as a base64-encoded string
func (kp *KeyPair) PublicKeyBase64() string {
	return base64.StdEncoding.EncodeToString(kp.PublicKey.Bytes())
}

// DeriveSharedSecret derives a 32-byte shared AES key from private key and peer's public key
func DeriveSharedSecret(privKey *ecdh.PrivateKey, peerPubKeyBase64 string) ([]byte, error) {
	peerBytes, err := base64.StdEncoding.DecodeString(peerPubKeyBase64)
	if err != nil {
		return nil, fmt.Errorf("invalid peer public key encoding: %w", err)
	}

	curve := ecdh.P256()
	peerPubKey, err := curve.NewPublicKey(peerBytes)
	if err != nil {
		return nil, fmt.Errorf("invalid peer public key bytes: %w", err)
	}

	rawSecret, err := privKey.ECDH(peerPubKey)
	if err != nil {
		return nil, fmt.Errorf("ECDH key derivation failed: %w", err)
	}

	if len(rawSecret) == 0 {
		return nil, errors.New("empty shared secret")
	}

	// KDF: Hash raw secret with SHA-256 to ensure uniform 32-byte key
	derivedKey := sha256.Sum256(rawSecret)
	return derivedKey[:], nil
}
