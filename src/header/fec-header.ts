export const FEC_HEADER_SIZE = 16;

export default class FECHeader {
  public SNBase_low_bits: number;
  public length_recovery: number;
  public E: boolean;              // 1 (in ProMPEG-CoP3 restrictions)
  public PT_recovery: number;
  public Mask: number;            // 0 (in ProMPEG-CoP3 restrictions)
  public TS_recovery: number;
  public X: boolean;              // 0 (in ProMPEG-CoP3 restrictions)
  public D: boolean;              // 0 is COL, 1 is ROW
  public type: number;            // 0 (in ProMPEG-CoP3 restrictions)
  public index: number;           // 0 (in ProMPEG-CoP3 restrictions)
  public Offset: number;          // ROW is 1, COl is L
  public NA: number;              // ROW is L, COL is D
  public SNBase_ext_bits: number;  // 0 (in ProMPEG-CoP3 restrictions)

  public constructor(fec_header: Buffer) {
    this.SNBase_low_bits = (fec_header[0] << 8) | (fec_header[1] << 0);
    this.length_recovery = (fec_header[2] << 8) | (fec_header[3] << 0);
    this.E = (fec_header[4] & 0b10000000) !== 0;
    this.PT_recovery = (fec_header[4] & 0b01111111) << 0;
    this.Mask = (fec_header[5] << 16) | (fec_header[6] << 8) | (fec_header[7] << 0);
    this.TS_recovery = (fec_header[8] << 24) | (fec_header[9] << 16) | (fec_header[10] << 8) | (fec_header[11] << 0);
    this.X = (fec_header[12] & 0b10000000) !== 0;
    this.D = (fec_header[12] & 0b01000000) !== 0;
    this.type = (fec_header[12] & 0b00111000) >> 2;
    this.index = (fec_header[12] & 0b00000111) >> 0;
    this.Offset = fec_header[13];
    this.NA = fec_header[14];
    this.SNBase_ext_bits = fec_header[15];
  }

  public toBuffer() {
    return Buffer.from([
      (this.SNBase_low_bits & 0xFF00) >> 8,
      (this.SNBase_low_bits & 0x00FF) >> 0,
      (this.length_recovery & 0xFF00) >> 8,
      (this.length_recovery & 0x00FF) >> 0,
      ((this.E ? 1 : 0) << 7) | (this.PT_recovery << 0),
      (this.Mask & 0xFF0000) >> 16,
      (this.Mask & 0x00FF00) >> 8,
      (this.Mask & 0x0000FF) >> 0,
      (this.TS_recovery & 0xFF000000) >> 24,
      (this.TS_recovery & 0x00FF0000) >> 16,
      (this.TS_recovery & 0x0000FF00) >> 8,
      (this.TS_recovery & 0x000000FF) >> 0,
      ((this.X ? 1 : 0) << 7) | ((this.D ? 1 : 0) << 6) | (this.type << 3) | (this.index << 0),
      this.Offset,
      this.NA,
      this.SNBase_ext_bits
    ]);
  }
}
