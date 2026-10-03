/*
  PILAR Microscope Controller v0.3
  Untuk PILAR Microscope Lab v0.7+

  Target : ESP32 DevKit / Arduino-ESP32 core 3.x
  Library: AccelStepper, WebSocketsServer
  BLE    : library BLE bawaan Arduino-ESP32 (tidak perlu server eksternal)

  Wiring default:
    A4988/DRV8825 STEP=26 DIR=27 EN=25 (EN aktif LOW)
    LED via MOSFET GPIO18 (JANGAN memberi beban LED langsung dari GPIO)
    Limit home GPIO33 -> GND, INPUT_PULLUP
    Motor memakai supply terpisah; ground driver dan ESP32 harus bersama.

  Transport:
    1) USB Serial 115200               -> paling stabil untuk IFP/desktop
    2) BLE "PILAR-Scope" (NUS-like)   -> bekerja dari GitHub Pages HTTPS via Web Bluetooth
    3) WebSocket ws://192.168.4.1:81   -> legacy/local-only; browser HTTPS biasanya memblok mixed content

  Perintah kompatibel:
    M<n>  gerak relatif n step
    L<n>  LED 0..255
    S<n>  max speed step/s
    H     homing
    X     emergency/soft stop
    ?     posisi + state
    I     info/capabilities

  Balasan:
    READY PILAR-SCOPE 0.3
    ACK M <target>
    DONE POS <n>
    OK L <n>
    OK S <n>
    HOME POS 0
    POS <n> HOMED <0|1> LIMIT <0|1>
    ERR <kode>
*/

#include <WiFi.h>
#include <WebSocketsServer.h>
#include <AccelStepper.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#define STEP_PIN   26
#define DIR_PIN    27
#define EN_PIN     25
#define LED_PIN    18
#define LIMIT_PIN  33

// Sesuaikan mekanik fokus.
// Soft limit baru aktif SETELAH homing sukses.
static const long SOFT_MIN = 0;
static const long SOFT_MAX = 12000;
static const long MAX_REL_MOVE = 1200;
static const long HOME_MAX_TRAVEL = 16000;
static const uint32_t HOME_TIMEOUT_MS = 30000;

static const char* AP_SSID = "PILAR-Scope";
static const char* AP_PASS = "stem12345"; // GANTI sebelum penggunaan publik.

static const char* BLE_SERVICE_UUID = "6E400001-B5A3-F393-E0A9-E50E24DCCA9E";
static const char* BLE_RX_UUID      = "6E400002-B5A3-F393-E0A9-E50E24DCCA9E";
static const char* BLE_TX_UUID      = "6E400003-B5A3-F393-E0A9-E50E24DCCA9E";

AccelStepper focus(AccelStepper::DRIVER, STEP_PIN, DIR_PIN);
WebSocketsServer ws(81);

BLECharacteristic* bleTx = nullptr;
bool bleConnected = false;
bool moving = false;
bool homing = false;
bool homed = false;
uint32_t homeStarted = 0;
long homeStartPos = 0;
String serialLine;

void motorEnable(bool on) { digitalWrite(EN_PIN, on ? LOW : HIGH); }
bool limitHit() { return digitalRead(LIMIT_PIN) == LOW; }

void reply(const String& s) {
  Serial.println(s);
  ws.broadcastTXT(s);
  if (bleConnected && bleTx) {
    String msg = s + "\n";
    bleTx->setValue((uint8_t*)msg.c_str(), msg.length());
    bleTx->notify();
  }
}

void finishMove() {
  moving = false;
  motorEnable(false);
  reply("DONE POS " + String(focus.currentPosition()));
}

void stopMotion(const char* reason = "STOP") {
  homing = false;
  if (moving) {
    focus.stop();
    while (focus.distanceToGo() != 0) focus.run();
  }
  moving = false;
  motorEnable(false);
  reply(String(reason) + " POS " + String(focus.currentPosition()));
}

void startRelativeMove(long delta) {
  delta = constrain(delta, -MAX_REL_MOVE, MAX_REL_MOVE);
  if (delta == 0) { reply("DONE POS " + String(focus.currentPosition())); return; }

  if (limitHit() && delta < 0) {
    if (homed) focus.setCurrentPosition(0);
    reply("ERR LIMIT_HOME");
    return;
  }

  long target = focus.currentPosition() + delta;
  if (homed) {
    if (target < SOFT_MIN || target > SOFT_MAX) {
      reply("ERR SOFT_LIMIT");
      return;
    }
  }

  homing = false;
  motorEnable(true);
  focus.moveTo(target);
  moving = true;
  reply("ACK M " + String(target));
}

void startHome() {
  moving = false;
  homing = true;
  homed = false;
  homeStarted = millis();
  homeStartPos = focus.currentPosition();
  motorEnable(true);
  focus.setSpeed(-500);
  reply("ACK H");
}

void handleCommand(String c) {
  c.trim();
  if (!c.length()) return;
  if (c.length() > 40) { reply("ERR CMD_TOO_LONG"); return; }

  char k = toupper(c[0]);
  long v = c.substring(1).toInt();

  switch (k) {
    case 'M':
      startRelativeMove(v);
      break;

    case 'L': {
      int duty = constrain((int)v, 0, 255);
      ledcWrite(LED_PIN, duty);
      reply("OK L " + String(duty));
      break;
    }

    case 'S': {
      long speed = constrain(v, 80, 3000);
      focus.setMaxSpeed(speed);
      reply("OK S " + String(speed));
      break;
    }

    case 'H':
      startHome();
      break;

    case 'X':
      stopMotion("STOP");
      break;

    case '?':
      reply("POS " + String(focus.currentPosition()) +
            " HOMED " + String(homed ? 1 : 0) +
            " LIMIT " + String(limitHit() ? 1 : 0));
      break;

    case 'I':
      reply("INFO PILAR-SCOPE 0.3 USB BLE WS STEPPER LED LIMIT");
      break;

    default:
      reply("ERR UNKNOWN_CMD");
  }
}

void onWs(uint8_t num, WStype_t type, uint8_t* payload, size_t len) {
  if (type != WStype_TEXT || !payload || !len) return;
  String cmd;
  cmd.reserve(len);
  for (size_t i = 0; i < len; ++i) cmd += (char)payload[i];
  handleCommand(cmd);
}

class PulseServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer*) override {
    bleConnected = true;
    reply("BLE CONNECTED");
  }
  void onDisconnect(BLEServer* server) override {
    bleConnected = false;
    server->getAdvertising()->start();
  }
};

class PulseRxCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* characteristic) override {
    String value = characteristic->getValue();
    if (!value.length()) return;
    int start = 0;
    for (int i = 0; i <= value.length(); ++i) {
      if (i == value.length() || value[i] == '\n' || value[i] == '\r') {
        if (i > start) handleCommand(value.substring(start, i));
        start = i + 1;
      }
    }
  }
};

void setupBle() {
  BLEDevice::init("PILAR-Scope");
  BLEServer* server = BLEDevice::createServer();
  server->setCallbacks(new PulseServerCallbacks());

  BLEService* service = server->createService(BLE_SERVICE_UUID);
  bleTx = service->createCharacteristic(
    BLE_TX_UUID,
    BLECharacteristic::PROPERTY_NOTIFY
  );
  bleTx->addDescriptor(new BLE2902());

  BLECharacteristic* rx = service->createCharacteristic(
    BLE_RX_UUID,
    BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR
  );
  rx->setCallbacks(new PulseRxCallbacks());

  service->start();
  BLEAdvertising* adv = BLEDevice::getAdvertising();
  adv->addServiceUUID(BLE_SERVICE_UUID);
  adv->setScanResponse(true);
  adv->start();
}

void setup() {
  Serial.begin(115200);

  pinMode(EN_PIN, OUTPUT);
  motorEnable(false);

  pinMode(LIMIT_PIN, INPUT_PULLUP);

  ledcAttach(LED_PIN, 20000, 8);
  ledcWrite(LED_PIN, 128);

  focus.setMaxSpeed(1000);
  focus.setAcceleration(1800);

  WiFi.mode(WIFI_AP);
  WiFi.softAP(AP_SSID, AP_PASS);
  ws.begin();
  ws.onEvent(onWs);

  setupBle();

  reply("READY PILAR-SCOPE 0.3");
}

void loop() {
  ws.loop();

  while (Serial.available()) {
    char ch = Serial.read();
    if (ch == '\n' || ch == '\r') {
      if (serialLine.length()) {
        handleCommand(serialLine);
        serialLine = "";
      }
    } else if (serialLine.length() < 64) {
      serialLine += ch;
    } else {
      serialLine = "";
      reply("ERR SERIAL_OVERFLOW");
    }
  }

  if (homing) {
    if (limitHit()) {
      homing = false;
      homed = true;
      focus.setCurrentPosition(0);
      motorEnable(false);
      reply("HOME POS 0");
    } else if ((millis() - homeStarted) > HOME_TIMEOUT_MS ||
               labs(focus.currentPosition() - homeStartPos) > HOME_MAX_TRAVEL) {
      homing = false;
      motorEnable(false);
      reply("ERR HOME_TIMEOUT");
    } else {
      focus.runSpeed();
    }
    return;
  }

  // Jika limit home tersentuh saat gerak ke arah negatif, hentikan aman.
  if (moving && limitHit() && focus.distanceToGo() < 0) {
    focus.setCurrentPosition(0);
    homed = true;
    moving = false;
    motorEnable(false);
    reply("ERR LIMIT_HOME");
    return;
  }

  focus.run();

  if (moving && focus.distanceToGo() == 0) {
    finishMove();
  }
}
