#include <Wire.h>
#include <Adafruit_MCP9808.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include "MAX30105.h"
#include "spo2_algorithm.h"
#include "heartRate.h"

// ---------- BLE UUIDs ----------
#define SYNKLINX_SERVICE "e5df6019-cf42-49f6-a418-346db96363f6"
#define HEART_RATE_CHAR  "3c1f4fe4-c7ce-4c09-a38a-ba166fce06c6"
#define O2_CHAR          "9749ccd9-940e-4ad6-bce9-d246a8d30dca"
#define TEMP_CHAR        "69b82322-1c56-423e-820e-eb08c3f030d4"

// ---------- Sensors ----------
MAX30105 particleSensor;
Adafruit_MCP9808 tempSensor = Adafruit_MCP9808();
bool max301Available = false;
bool tempAvailable = false;

// ---------- BLE ----------
BLECharacteristic* hrChar;
BLECharacteristic* o2Char;
BLECharacteristic* tempChar;
BLEServer* pServer;

// ---------- Buffers ----------
const int bufferLength = 50;
uint32_t irBuffer[bufferLength];
uint32_t redBuffer[bufferLength];
uint8_t bufferIndex = 0;
bool bufferFilled = false;

// ---------- Timing ----------
unsigned long lastNotify = 0;
const unsigned long notifyInterval = 250; // 4 Hz updates
unsigned long lastConnectTime = 0;

// ---------- Valid Ranges ----------
#define MIN_HR 40
#define MAX_HR 200
#define MIN_SPO2 70
#define MAX_SPO2 100
#define MIN_TEMP_C 30
#define MAX_TEMP_C 45

// ---------- BLE Callbacks ----------
class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) override {
    if (millis() - lastConnectTime < 1000) return; // debounce rapid reconnect
    lastConnectTime = millis();
    Serial.println("Device connected");
  }

  void onDisconnect(BLEServer* pServer) override {
    Serial.println("Device disconnected");
    // Reset buffers to avoid stale values
    bufferIndex = 0;
    bufferFilled = false;
    // Restart advertising
    pServer->getAdvertising()->start();
    Serial.println("Advertising restarted");
  }
};

void setup() {
  Serial.begin(115200);
  Wire.begin();
  delay(200);

  Serial.println("=== SynkLinx BLE Firmware Starting ===");

  // ---------- Initialize BLE ----------
  BLEDevice::init("SynkLinx");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  BLEService* service = pServer->createService(SYNKLINX_SERVICE);

  hrChar = service->createCharacteristic(HEART_RATE_CHAR, BLECharacteristic::PROPERTY_NOTIFY);
  o2Char = service->createCharacteristic(O2_CHAR, BLECharacteristic::PROPERTY_NOTIFY);
  tempChar = service->createCharacteristic(TEMP_CHAR, BLECharacteristic::PROPERTY_NOTIFY);

  hrChar->addDescriptor(new BLE2902());
  o2Char->addDescriptor(new BLE2902());
  tempChar->addDescriptor(new BLE2902());

  service->start();

  // ---------- Advertising ----------
  BLEAdvertising* pAdvertising = pServer->getAdvertising();
  pAdvertising->addServiceUUID(SYNKLINX_SERVICE);
  pAdvertising->setScanResponse(true);
  pAdvertising->start();
  Serial.println("BLE advertising started");

  // ---------- Initialize Sensors ----------
  max301Available = particleSensor.begin(Wire);
  if (max301Available) {
    particleSensor.setup(60, 4, 2, 411, 4096, 16384);
    particleSensor.setPulseAmplitudeRed(60);
    particleSensor.setPulseAmplitudeIR(60);
    Serial.println("MAX30102 detected");
  } else Serial.println("WARNING: MAX30102 not detected. Sending fallback values.");

  tempAvailable = tempSensor.begin(0x18);
  if (tempAvailable) tempSensor.setResolution(3);
  else Serial.println("WARNING: MCP9808 not detected. Sending fallback values.");
}

void loop() {
  unsigned long now = millis();
  int32_t rawHR = 0, rawO2 = 0;
  float rawTemp = 0.0f;

  // ---------- MAX30102 ----------
  if (max301Available && particleSensor.available()) {
    irBuffer[bufferIndex] = particleSensor.getIR();
    redBuffer[bufferIndex] = particleSensor.getRed();
    particleSensor.nextSample();

    bufferIndex = (bufferIndex + 1) % bufferLength;
    if (bufferIndex == 0) bufferFilled = true;

    if (bufferFilled) {
      int8_t validHR = 0, validSpO2 = 0;
      maxim_heart_rate_and_oxygen_saturation(
        irBuffer, bufferLength, redBuffer,
        &rawO2, &validSpO2, &rawHR, &validHR
      );

      if (!(validHR && rawHR >= MIN_HR && rawHR <= MAX_HR)) rawHR = 0;
      if (!(validSpO2 && rawO2 >= MIN_SPO2 && rawO2 <= MAX_SPO2)) rawO2 = 0;
    }
  }

  // ---------- MCP9808 ----------
  if (tempAvailable) {
    rawTemp = tempSensor.readTempC();
    if (rawTemp < MIN_TEMP_C || rawTemp > MAX_TEMP_C) rawTemp = 0.0f;
  }

  // ---------- BLE Notify (only if connected) ----------
  if (pServer->getConnectedCount() > 0 && now - lastNotify >= notifyInterval) {
    lastNotify = now;

    uint8_t hrVal = max301Available ? rawHR : 0;
    uint8_t o2Val = max301Available ? rawO2 : 0;
    int16_t tempInt = tempAvailable ? (int16_t)(rawTemp * 100) : 0;

    hrChar->setValue(&hrVal, sizeof(hrVal));
    hrChar->notify();

    o2Char->setValue(&o2Val, sizeof(o2Val));
    o2Char->notify();

    tempChar->setValue((uint8_t*)&tempInt, sizeof(tempInt));
    tempChar->notify();

    Serial.printf("HR: %d | SpO2: %d | Temp: %.2f°C\n", hrVal, o2Val, rawTemp);
  }

  // ---------- Optional: re-check sensors periodically ----------
  if (!max301Available && millis() % 5000 < 10) max301Available = particleSensor.begin(Wire);
  if (!tempAvailable && millis() % 5000 < 10) tempAvailable = tempSensor.begin(0x18);

  delay(5);
}
