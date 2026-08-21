package crypto

import (
	"bytes"
	"os"
	"testing"
)

func TestAES256GCM(t *testing.T) {
	key, err := GenerateRandomKey()
	if err != nil {
		t.Fatalf("GenerateRandomKey failed: %v", err)
	}

	plaintext := []byte("Hello, this is a secret decentralized P2P chunk payload!")

	ciphertext, err := EncryptAESGCM(key, plaintext)
	if err != nil {
		t.Fatalf("EncryptAESGCM failed: %v", err)
	}

	if bytes.Equal(ciphertext, plaintext) {
		t.Fatalf("Ciphertext equals plaintext")
	}

	decrypted, err := DecryptAESGCM(key, ciphertext)
	if err != nil {
		t.Fatalf("DecryptAESGCM failed: %v", err)
	}

	if !bytes.Equal(decrypted, plaintext) {
		t.Fatalf("Decrypted does not match plaintext: got %s, want %s", decrypted, plaintext)
	}
}

func TestECDHKeyExchange(t *testing.T) {
	alice, err := GenerateECDHKeyPair()
	if err != nil {
		t.Fatalf("Alice keygen failed: %v", err)
	}

	bob, err := GenerateECDHKeyPair()
	if err != nil {
		t.Fatalf("Bob keygen failed: %v", err)
	}

	aliceSecret, err := DeriveSharedSecret(alice.PrivateKey, bob.PublicKeyBase64())
	if err != nil {
		t.Fatalf("Alice derivation failed: %v", err)
	}

	bobSecret, err := DeriveSharedSecret(bob.PrivateKey, alice.PublicKeyBase64())
	if err != nil {
		t.Fatalf("Bob derivation failed: %v", err)
	}

	if !bytes.Equal(aliceSecret, bobSecret) {
		t.Fatalf("Shared secrets do not match between Alice and Bob!")
	}
}

func TestFileHashing(t *testing.T) {
	tempFile, err := os.CreateTemp("", "hash_test_*.txt")
	if err != nil {
		t.Fatal(err)
	}
	defer os.Remove(tempFile.Name())

	content := []byte("P2P File Transfer SHA256 integrity verification test.")
	if _, err := tempFile.Write(content); err != nil {
		t.Fatal(err)
	}
	tempFile.Close()

	hash, err := ComputeFileSHA256(tempFile.Name())
	if err != nil {
		t.Fatalf("ComputeFileSHA256 failed: %v", err)
	}

	expected := ComputeSHA256(content)
	if hash != expected {
		t.Fatalf("File hash mismatch: got %s, want %s", hash, expected)
	}
}
