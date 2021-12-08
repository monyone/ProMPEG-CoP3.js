export const RTP_HEADER_SIZE = 12;

export default class RTPHeader {
  public version: number;         // 2 (current version)
  public padding: boolean;        // 0 (in ProMPEG-CoP3 restrictions)
  public extension: boolean;      // 0 (in ProMPEG-CoP3 restrictions) 
  public csrc_count: number;      // 0 (in ProMPEG-CoP3 restrictions)
  public marker: boolean;         // 0 (in ProMPEG-CoP3 restrictions)
  public payload_type: number;
  public sequence_number: number;
  public timestamp: number;
  public ssrc: number;            // not be used by reciever (in ProMPEG-CoP3 restrictions)

  public constructor(rtp_header: Buffer) {
    this.version = (rtp_header[0] & 0b11000000) >> 6;
    this.padding = (rtp_header[0] & 0b00100000) !== 0;
    this.extension = (rtp_header[0] & 0b00010000) !== 0;
    this.csrc_count = (rtp_header[0] & 0b00001111) >> 0;
    this.marker = (rtp_header[1] & 0b10000000) !== 0;
    this.payload_type = (rtp_header[1] & 0b01111111) >> 0;
    this.sequence_number = (rtp_header[2] << 8) | (rtp_header[3] << 0);
    this.timestamp = (rtp_header[4] << 24) | (rtp_header[5] << 16) | (rtp_header[6] << 8) | (rtp_header[7] << 0);
    this.ssrc = (rtp_header[8] << 24) | (rtp_header[9] << 16) | (rtp_header[10] << 8) | (rtp_header[11] << 0);
  }

  public toBuffer() {
    return Buffer.from([
      (this.version << 6) | ((this.padding ? 1 : 0) << 5) | ((this.extension ? 1 : 0) << 4) | (this.csrc_count << 0),
      (this.marker ? 1 : 0) << 7 | (this.payload_type << 0),
      (this.sequence_number & 0xFF00) >> 8,
      (this.sequence_number & 0x00FF) >> 0,
      (this.timestamp & 0xFF000000) >> 24,
      (this.timestamp & 0x00FF0000) >> 16,
      (this.timestamp & 0x0000FF00) >> 8,
      (this.timestamp & 0x000000FF) >> 0,
      (this.ssrc & 0xFF000000) >> 24,
      (this.ssrc & 0x00FF0000) >> 16,
      (this.ssrc & 0x0000FF00) >> 8,
      (this.ssrc & 0x000000FF) >> 0,
    ]);
  }
}
