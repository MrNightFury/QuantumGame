#include "ndef_helper.h"

bool writeNDEFText(Adafruit_PN532 &nfc, const String &text) {
    const uint8_t FIRST_PAGE = 4;

    uint16_t textLen    = text.length();
    uint16_t payloadLen = 1 + 2 + textLen;            // status + "en" + text
    uint16_t ndefLen    = 4 + payloadLen;             // D1 + 01 + PLEN + 54 + payload
    uint16_t totalLen   = 2 + ndefLen + 1;            // 03 + LEN + message + FE

    if (ndefLen > 254) {
        Serial.println(F("Text too long (max 247 bytes)"));
        return false;
    }

    uint8_t buf[260];
    uint16_t i = 0;
    buf[i++] = 0x03;                   // TLV: NDEF
    buf[i++] = (uint8_t)ndefLen;       // length
    buf[i++] = 0xD1;                   // MB|ME|SR|TNF=1 (Well-Known)
    buf[i++] = 0x01;                   // type len
    buf[i++] = (uint8_t)payloadLen;    // payload len
    buf[i++] = 0x54;                   // "T" (Text)
    buf[i++] = 0x02;                   // UTF-8
    buf[i++] = 'e';  buf[i++] = 'n';   // lang
    memcpy(buf + i, text.c_str(), textLen); // message
    i += textLen;
    buf[i++] = 0xFE;                   // END

    uint16_t pages = (totalLen + 3) / 4;
    for (uint16_t p = 0; p < pages; p++) {
        uint8_t page[4] = {0, 0, 0, 0};
        uint16_t off = p * 4;
        uint16_t n = (totalLen - off < 4) ? (totalLen - off) : 4;
        memcpy(page, buf + off, n);
        if (!nfc.ntag2xx_WritePage(FIRST_PAGE + p, page)) {
            Serial.print(F("Write failed at page "));
            Serial.println(FIRST_PAGE + p);
            return false;
        }
    }
    return true;
}


bool readNDEFText(Adafruit_PN532 &nfc, String &out) {
    const uint8_t FIRST_PAGE = 4;
    uint8_t buf[260];

    if (!nfc.ntag2xx_ReadPage(FIRST_PAGE, buf)) return false;

    uint8_t t = 0;
    while (t < 3 && buf[t] == 0x00) t++; // Skip zeros
    if (t > 2 || buf[t] != 0x03) {
        Serial.println(F("No NDEF TLV at page 4")); return false;
    }

    uint16_t ndefLen, hdrLen;
    if (buf[t + 1] == 0xFF) { // long format, skip
        if (t != 0)  {
            Serial.println(F("Bad TLV"));
            return false;
        }
        ndefLen = ((uint16_t)buf[2] << 8) | buf[3];
        hdrLen  = 4;
    } else {
        ndefLen = buf[t + 1];
        hdrLen  = 2;
    }
    if (ndefLen == 0) {
        Serial.println(F("Tag empty (03 00 FE)"));
        return false;
    }

    uint16_t totalLen = t + hdrLen + ndefLen + 1;
    if (totalLen > sizeof(buf)) {
        Serial.println(F("Message too long for reader"));
        return false;
    }

    // Read as much as we need
    uint16_t pages = (totalLen + 3) / 4;
    for (uint16_t p = 1; p < pages; p++)
        if (!nfc.ntag2xx_ReadPage(FIRST_PAGE + p, buf + p * 4))
            return false;

    if (buf[t + hdrLen + ndefLen] != 0xFE)
        Serial.println(F("Warning: FE terminator missing")); // Sad, but not critical

    // Headers
    uint16_t i    = t + hdrLen;
    uint8_t  hdr  = buf[i++];
    if ((hdr & 0x07) != 0x01) { Serial.println(F("TNF is not Well-Known")); return false; }
    bool sr = hdr & 0x10;                       // Short Record
    bool il = hdr & 0x08;

    uint8_t  typeLen = buf[i++];
    uint32_t payLen;
    if (sr) {
        payLen = buf[i++];
    } else {                                    // 4 big-endian
        payLen = ((uint32_t)buf[i] << 24) | ((uint32_t)buf[i + 1] << 16)
            | ((uint32_t)buf[i + 2] << 8) | buf[i + 3];
        i += 4;
    }
    if (il) i += 1 + buf[i];                    // ID len + ID

    if (typeLen != 1 || buf[i] != 'T') {
        Serial.println(F("Not a Text record"));
        return false;
    }
    i++;

    // payload and blah-blah-blah
    uint8_t status  = buf[i++];
    uint8_t langLen = status & 0x3F;            // lang code len
    bool    utf16   = status & 0x80;            // coding
    i += langLen;

    uint32_t textLen = payLen - 1 - langLen;
    if (textLen > totalLen - i) {
        Serial.println(F("Corrupt lengths"));
        return false;
    }

    out.reserve(textLen);
    if (!utf16) {                               // UTF-8
        for (uint32_t k = 0; k < textLen; k++) {
            out += (char)buf[i + k];
        }
    } else {
        // UTF-16BE -> UTF-8. Thanks to LLM for this part. 
        // I will never need that but eh, its free
        for (uint32_t k = 0; k + 1 < textLen; k += 2) {
        uint32_t cp = ((uint32_t)buf[i + k] << 8) | buf[i + k + 1];
        if (cp >= 0xD800 && cp <= 0xDBFF && k + 3 < textLen) {
            uint32_t lo = ((uint32_t)buf[i + k + 2] << 8) | buf[i + k + 3];
            if (lo >= 0xDC00 && lo <= 0xDFFF) {
            cp = 0x10000 + ((cp - 0xD800) << 10) + (lo - 0xDC00); k += 2;
            }
        }
        if      (cp <   0x80)  out += (char)cp;
        else if (cp <  0x800) { out += (char)(0xC0 | (cp >> 6));  out += (char)(0x80 | (cp & 0x3F)); }
        else if (cp < 0x10000) { out += (char)(0xE0 | (cp >> 12)); out += (char)(0x80 | ((cp >> 6) & 0x3F)); out += (char)(0x80 | (cp & 0x3F)); }
        else                   { out += (char)(0xF0 | (cp >> 18)); out += (char)(0x80 | ((cp >> 12) & 0x3F)); out += (char)(0x80 | ((cp >> 6) & 0x3F)); out += (char)(0x80 | (cp & 0x3F)); }
        }
    }
    return true;
}