#include "nfc_scanner.h"

#include <string.h>

#include "freertos/queue.h"

namespace {
const uint8_t QUEUE_LENGTH = 8;

// How long the reader must fail to see the tag for its removal to be
// confirmed (~250 ms). Until then a re-applied tag counts as still lying
// on the reader; after that it is a new application.
const uint32_t REMOVAL_CONFIRM_MS = 250;

// Per-poll reader timeout and pause between polls.
const uint16_t POLL_TIMEOUT_MS = 100;
const uint32_t POLL_PAUSE_MS = 20;
} // namespace

NfcScanner::NfcScanner(uint8_t irqPin, uint8_t resetPin)
    : nfc(irqPin, resetPin), eventQueue(nullptr), taskHandle(nullptr),
      cardPresent(false), currentUid{0}, currentUidLength(0), absentSince(0) {}

bool NfcScanner::begin() {
    nfc.begin();

    if (!nfc.getFirmwareVersion()) {
        return false;
    }
    nfc.SAMConfig();

    eventQueue = xQueueCreate(QUEUE_LENGTH, sizeof(TagEvent));
    return eventQueue != nullptr;
}

void NfcScanner::start() {
    if (taskHandle != nullptr) {
        return;
    }
    xTaskCreatePinnedToCore(taskEntry, "nfcScanTask", 4096, this, 1, &taskHandle, 0);
}

void NfcScanner::onTag(TagHandler handler) {
    handlers.push_back(handler);
}

void NfcScanner::loop() {
    if (eventQueue == nullptr) {
        return;
    }

    TagEvent event;
    while (xQueueReceive(eventQueue, &event, 0)) {
        for (TagHandler &handler : handlers) {
            handler(event);
        }
    }
}

void NfcScanner::taskEntry(void *arg) {
    static_cast<NfcScanner *>(arg)->scanTask();
}

void NfcScanner::scanTask() {
    for (;;) {
        uint8_t uid[8];
        uint8_t uidLength = 0;
        bool present = nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &uidLength, POLL_TIMEOUT_MS);

        if (present) {
            absentSince = 0;
            bool sameCard = cardPresent && uidLength == currentUidLength && memcmp(uid, currentUid, uidLength) == 0;
            if (!sameCard) {
                // New application: another tag, or the same tag after a
                // confirmed removal. Publish and remember it.
                cardPresent = true;
                memcpy(currentUid, uid, uidLength);
                currentUidLength = uidLength;

                TagEvent event;
                memcpy(event.uid, uid, uidLength);
                event.uidLength = uidLength;
                if (xQueueSend(eventQueue, &event, 0) != pdTRUE) {
                    Serial.println("[NFC] Event queue full, dropping tag event");
                }
            }
        } else if (cardPresent) {
            // Absence must persist for REMOVAL_CONFIRM_MS before the tag
            // counts as removed; short glitches do not fire new events.
            if (absentSince == 0) {
                absentSince = millis();
            } else if (millis() - absentSince >= REMOVAL_CONFIRM_MS) {
                cardPresent = false;
                absentSince = 0;
            }
        }

        vTaskDelay(pdMS_TO_TICKS(POLL_PAUSE_MS));
    }
}
