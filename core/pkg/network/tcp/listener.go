package tcp

import (
	"fmt"
	"net"
	"time"
)

// TCPListener wraps net.Listener for P2P direct socket connections
type TCPListener struct {
	listener net.Listener
	port     int
}

// StartListener binds a TCP port on all interfaces
func StartListener(port int) (*TCPListener, error) {
	addr := fmt.Sprintf(":%d", port)
	l, err := net.Listen("tcp", addr)
	if err != nil {
		return nil, fmt.Errorf("failed to listen on TCP %s: %w", addr, err)
	}

	actualPort := l.Addr().(*net.TCPAddr).Port
	return &TCPListener{
		listener: l,
		port:     actualPort,
	}, nil
}

// AcceptConnection waits for an incoming peer connection
func (tl *TCPListener) AcceptConnection() (net.Conn, error) {
	return tl.listener.Accept()
}

// Port returns the bound port number
func (tl *TCPListener) Port() int {
	return tl.port
}

// Close terminates the listener
func (tl *TCPListener) Close() error {
	return tl.listener.Close()
}

// ConnectPeer dials a target peer IP and port with timeout
func ConnectPeer(targetAddr string, timeout time.Duration) (net.Conn, error) {
	conn, err := net.DialTimeout("tcp", targetAddr, timeout)
	if err != nil {
		return nil, fmt.Errorf("failed to dial peer at %s: %w", targetAddr, err)
	}
	return conn, nil
}
