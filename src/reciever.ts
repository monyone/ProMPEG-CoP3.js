import dgram from 'dgram';

import RTPHeader, { RTP_HEADER_SIZE } from './header/rtp-header'
import FECHeader, { FEC_HEADER_SIZE } from './header/fec-header'

const RECV_BUFFER_SIZE = 1000000;
const RING_BUFFER_SIZE = 200;

const udp_content = dgram.createSocket({
  type: 'udp4',
  recvBufferSize: RECV_BUFFER_SIZE,
})
const udp_col_fec = dgram.createSocket({
  type: 'udp4',
  recvBufferSize: RECV_BUFFER_SIZE,
})
const udp_row_fec = dgram.createSocket({
  type: 'udp4',
  recvBufferSize: RECV_BUFFER_SIZE,
})

const rtp_buffer: (Buffer | undefined)[] = new Array(RING_BUFFER_SIZE);
let front: number = 0;
let tail: number = 0;
let SNBase: number | undefined = undefined;

const fecs: Buffer[] = [];

udp_content.on('message', (message: Buffer) => {
  const rtp_header = new RTPHeader(message.slice(0));

  /*  
  if (Math.random() < 0.1) { 
    console.log(rtp_header.sequence_number, "dropped");
    return;
  }
  */

  if (SNBase === undefined) {
    SNBase = rtp_header.sequence_number;
  }

  const SNBase_tail = SNBase + (tail - front + RING_BUFFER_SIZE) % RING_BUFFER_SIZE;
  if (SNBase_tail < rtp_header.sequence_number) {
    for (let i = 0; i < (rtp_header.sequence_number - SNBase_tail - 1); i++) {
      const size = (tail - front + RING_BUFFER_SIZE) % RING_BUFFER_SIZE;
      if (size === RING_BUFFER_SIZE - 1) {
        rtp_buffer[front] = undefined;
        SNBase += 1; // TODO: need wrap around
        front = (front + 1) % RING_BUFFER_SIZE;
      }
      tail = (tail + 1) % RING_BUFFER_SIZE;
    }
    {
      const size = (tail - front + RING_BUFFER_SIZE) % RING_BUFFER_SIZE;
      if (size === RING_BUFFER_SIZE - 1) {
        rtp_buffer[front] = undefined;
        SNBase += 1; // TODO: need wrap around
        front = (front + 1) % RING_BUFFER_SIZE;
      }
      rtp_buffer[tail] = Buffer.from(message.slice(RTP_HEADER_SIZE));
      tail = (tail + 1) % RING_BUFFER_SIZE;
    }
  } else if (front === tail) {
    rtp_buffer[tail] = Buffer.from(message.slice(RTP_HEADER_SIZE));
    tail = (tail + 1) % RING_BUFFER_SIZE;
  } else {
    const index = (front + (rtp_header.sequence_number - SNBase)) % RING_BUFFER_SIZE;
    rtp_buffer[index] = Buffer.from(message.slice(RTP_HEADER_SIZE));
  }

  while (true) {
    let recovered = false;

    for (let i = fecs.length - 1; i >= 0; i--) {
      const fec: Buffer = fecs[i];

      const fec_header: FECHeader = new FECHeader(fec.slice(RTP_HEADER_SIZE));
      const SNBase_low_bits = fec_header.SNBase_low_bits;
      const Offset = fec_header.Offset;
      const NA = fec_header.NA;

      const SNmin = SNBase_low_bits;
      const SNmax = SNBase_low_bits + Offset * (NA - 1);

      if (SNBase > SNmin) { // TODO: need wrap around
        fecs.splice(i, 1);
        continue;
      }

      const size = (tail - front + RING_BUFFER_SIZE) % RING_BUFFER_SIZE;
      if (SNBase + size < SNmax) { // TODO: need wrap around
        continue;
      }

      const xor = Buffer.from(fec.slice(FEC_HEADER_SIZE));
      let drop_index: number | null = null;
      let count = 0;

      for (let j = SNmin; j <= SNmax; j += Offset) {
        const index = (front + (j - SNBase)) % RING_BUFFER_SIZE
        const buffer = rtp_buffer[index];
        if (buffer === undefined) {
          count++;
          drop_index = index;
          continue;
        }

        for (let x = 0; x < xor.length; x++) {
          xor[x] ^= buffer[x];
        }
      }

      if (count === 0) {
        fecs.splice(i, 1);
        continue;
      } else if (count >= 2) {
        continue;
      } else if (drop_index === null) {
        continue;
      }

      recovered = true;
      rtp_buffer[drop_index] = xor;
      fecs.splice(i, 1);
    }

    if (!recovered) { break; }
  }
})

udp_col_fec.on('message', (message: Buffer) => {
  fecs.push(message);
})
udp_row_fec.on('message', (message: Buffer) => {
  fecs.push(message);
})

udp_content.bind(5000);
udp_col_fec.bind(5002);
udp_row_fec.bind(5004);
