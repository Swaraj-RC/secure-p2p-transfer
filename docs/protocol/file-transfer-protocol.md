# File Transfer Protocol (FTP-P2P v1)

## 1. Frame Structure

Binary packets sent between peers have a fixed 28-byte header followed by variable-length encrypted payload:

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|    Version    |     Type      |             Flags             |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                                                               |
+                         Transfer ID                           +
|                          (16 Bytes)                           |
+                                                               +
|                                                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                          Chunk Index                          |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                          Chunk Size                           |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                   Payload Data (Chunk Size Bytes)             |
|                               ...                             |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

## 2. Message Types

| Value | Identifier | Description |
|---|---|---|
| `0x01` | `SYN` | Initiate transfer handshake with metadata |
| `0x02` | `ACK` | Handshake accepted / chunk acknowledgment |
| `0x03` | `NACK` | Transfer rejected or chunk retransmission request |
| `0x04` | `DATA` | Encrypted chunk data payload |
| `0x05` | `DATA_ACK` | Explicit chunk verification acknowledgment |
| `0x06` | `FIN` | Final packet signaling end of transfer |
| `0x07` | `RESUME` | Resume inquiry for partially completed file |
| `0xFF` | `ERROR` | Abrupt termination error |
