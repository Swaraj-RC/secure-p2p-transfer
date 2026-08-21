package nat

import (
	"crypto/rand"
	"encoding/binary"
	"errors"
	"fmt"
	"net"
	"time"
)

// STUN Magic Cookie (RFC 5389)
const (
	stunMagicCookie = 0x2112A442
	stunBindingReq  = 0x0001
	stunBindingResp = 0x0101
)

// PublicEndpoint represents discovered public IP and mapped NAT port
type PublicEndpoint struct {
	IP   net.IP
	Port int
}

// DiscoverPublicEndpoint queries a public STUN server over UDP to discover external IP & NAT mapped port
func DiscoverPublicEndpoint(stunServer string, timeout time.Duration) (*PublicEndpoint, error) {
	if stunServer == "" {
		stunServer = "stun.l.google.com:19302"
	}

	conn, err := net.DialTimeout("udp", stunServer, timeout)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to STUN server: %w", err)
	}
	defer conn.Close()

	_ = conn.SetDeadline(time.Now().Add(timeout))

	// Build STUN Binding Request Header (20 bytes)
	req := make([]byte, 20)
	binary.BigEndian.PutUint16(req[0:2], stunBindingReq) // Message Type
	binary.BigEndian.PutUint16(req[2:4], 0)               // Message Length
	binary.BigEndian.PutUint32(req[4:8], stunMagicCookie) // Magic Cookie
	if _, err := rand.Read(req[8:20]); err != nil {      // Transaction ID
		return nil, err
	}

	if _, err := conn.Write(req); err != nil {
		return nil, fmt.Errorf("failed to send STUN request: %w", err)
	}

	resp := make([]byte, 1024)
	n, err := conn.Read(resp)
	if err != nil {
		return nil, fmt.Errorf("failed to read STUN response: %w", err)
	}

	if n < 20 {
		return nil, errors.New("stun response too short")
	}

	respType := binary.BigEndian.Uint16(resp[0:2])
	if respType != stunBindingResp {
		return nil, fmt.Errorf("unexpected STUN response type: 0x%04X", respType)
	}

	// Parse attributes (XOR-MAPPED-ADDRESS: 0x0020 or MAPPED-ADDRESS: 0x0001)
	offset := 20
	for offset+4 <= n {
		attrType := binary.BigEndian.Uint16(resp[offset : offset+2])
		attrLen := int(binary.BigEndian.Uint16(resp[offset+2 : offset+4]))
		offset += 4

		if offset+attrLen > n {
			break
		}

		if attrType == 0x0020 && attrLen >= 8 { // XOR-MAPPED-ADDRESS
			family := resp[offset+1]
			port := binary.BigEndian.Uint16(resp[offset+2:offset+4]) ^ uint16(stunMagicCookie>>16)

			if family == 0x01 { // IPv4
				ipBytes := make([]byte, 4)
				copy(ipBytes, resp[offset+4:offset+8])
				cookieBytes := make([]byte, 4)
				binary.BigEndian.PutUint32(cookieBytes, stunMagicCookie)

				for i := 0; i < 4; i++ {
					ipBytes[i] ^= cookieBytes[i]
				}

				return &PublicEndpoint{
					IP:   net.IP(ipBytes),
					Port: int(port),
				}, nil
			}
		}
		offset += attrLen
	}

	return nil, errors.New("no valid mapped address in STUN response")
}
