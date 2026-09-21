#pragma once

#include <stdint.h>
#include <functional>
#include <vector>

#include <Arduino.h>
#include <Adafruit_PN532.h>

// PN532-based NFC tag scanner running in its own FreeRTOS task.
//
// The task polls the reader and runs a debounced presence state machine:
// a tag lying on the reader produces a single event, removal is confirmed
// only after the tag has stayed unseen for a fixed time, and re-applying
// the same tag after that produces a new event again. Confirmed events
// cross the task boundary through a FreeRTOS queue and reach subscribers
// from loop(), so handlers run in the main-loop context and may safely
// touch the web server and the websocket controller.
class NfcScanner {
    public:
        // One confirmed tag application.
        struct TagEvent {
            uint8_t uid[8];
            uint8_t uidLength;
        };

        // Runs in main-loop context (from loop()) for each TagEvent.
        using TagHandler = std::function<void(const TagEvent &)>;

        NfcScanner(uint8_t irqPin, uint8_t resetPin);

        // Bring the reader up; false when no PN532 firmware answers.
        bool begin();

        // Spawn the polling task on core 0. Idempotent: does nothing
        // when the task is already running.
        void start();

        // Subscribe to tag events. Subscribe before start() or from
        // loop(); the list is not touched by the task.
        void onTag(TagHandler handler);

        // Drain the event queue into the handlers; call from the main loop.
        void loop();

    private:
        static void taskEntry(void *arg);
        void scanTask();

        Adafruit_PN532 nfc;
        QueueHandle_t eventQueue;
        TaskHandle_t taskHandle;

        std::vector<TagHandler> handlers;

        // Presence state machine, owned by the task.
        bool cardPresent;
        uint8_t currentUid[8];
        uint8_t currentUidLength;
        uint32_t absentSince;
};
