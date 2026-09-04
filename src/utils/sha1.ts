/**
 * Pure JavaScript SHA-1 implementation for React Native / Expo environment
 * Used to sign Cloudinary authenticated API requests without requiring Node.js native crypto modules.
 */
export function sha1(str: string): string {
  function utf8Encode(string: string) {
    string = string.replace(/\r\n/g, '\n');
    let utftext = '';
    for (let n = 0; n < string.length; n++) {
      const c = string.charCodeAt(n);
      if (c < 128) {
        utftext += String.fromCharCode(c);
      } else if (c > 127 && c < 2048) {
        utftext += String.fromCharCode((c >> 6) | 192);
        utftext += String.fromCharCode((c & 63) | 128);
      } else {
        utftext += String.fromCharCode((c >> 12) | 224);
        utftext += String.fromCharCode(((c >> 6) & 63) | 128);
        utftext += String.fromCharCode((c & 63) | 128);
      }
    }
    return utftext;
  }

  function rotateLeft(n: number, s: number) {
    return (n << s) | (n >>> (32 - s));
  }

  function cvtHex(val: number) {
    let str = '';
    for (let i = 7; i >= 0; i--) {
      const v = (val >>> (i * 4)) & 0x0f;
      str += v.toString(16);
    }
    return str;
  }

  const blocksize = 64;
  const x: number[] = [];
  const encoded = utf8Encode(str);
  const strLen = encoded.length;

  for (let i = 0; i < strLen; i++) {
    x[i >> 2] |= (encoded.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
  }
  x[strLen >> 2] |= 0x80 << (24 - (strLen % 4) * 8);
  x[(((strLen + 8) >> 6) << 4) + 15] = strLen * 8;

  const w: number[] = new Array(80);
  let a = 1732584193;
  let b = -271733879;
  let c = -1732584194;
  let d = 271733878;
  let e = -1009589776;

  for (let i = 0; i < x.length; i += 16) {
    const olda = a;
    const oldb = b;
    const oldc = c;
    const oldd = d;
    const olde = e;

    for (let j = 0; j < 80; j++) {
      if (j < 16) {
        w[j] = x[i + j] || 0;
      } else {
        w[j] = rotateLeft((w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16]) || 0, 1);
      }

      let t = 0;
      if (j < 20) {
        t = ((b & c) | (~b & d)) + 1518500249;
      } else if (j < 40) {
        t = (b ^ c ^ d) + 1859775393;
      } else if (j < 60) {
        t = ((b & c) | (b & d) | (c & d)) - 1894007588;
      } else {
        t = (b ^ c ^ d) - 899497514;
      }

      t = (rotateLeft(a, 5) + t + e + w[j]) | 0;
      e = d;
      d = c;
      c = rotateLeft(b, 30);
      b = a;
      a = t;
    }

    a = (a + olda) | 0;
    b = (b + oldb) | 0;
    c = (c + oldc) | 0;
    d = (d + oldd) | 0;
    e = (e + olde) | 0;
  }

  return cvtHex(a) + cvtHex(b) + cvtHex(c) + cvtHex(d) + cvtHex(e);
}
