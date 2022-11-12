export default {
  randomFillSync(buf: ArrayBufferView, offset: number, size: number) {
    const uint = new Uint8Array(buf.buffer, offset, size)
    crypto.getRandomValues(uint)
    return buf
  },
}
