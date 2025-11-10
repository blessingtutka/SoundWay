# SoundWay – Bluetooth Indoor Navigation System (License CC BY-ND 4.0 + Annex)
[![License: CC BY-ND 4.0](https://img.shields.io/badge/License-CC%20BY--ND%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nd/4.0/)
[![Available on Google Play](https://img.shields.io/badge/Google%20Play-Available-green.svg)](https://play.google.com/store/apps/details?id=com.example.soundway)

This project was developed within the framework of the academic course **INFOM435 – Interface Incarnée Augmentée** at the **University of Namur (UNamur)**.  
It was designed and implemented by a multidisciplinary student team exploring embodied and augmented interaction through IoT and mobile systems.

------------------------------------------------------------
📌 Project Description
------------------------------------------------------------

SoundWay is an innovative Bluetooth-based indoor navigation system designed to enhance mobility and spatial awareness within buildings.  
The system connects a **Raspberry Pi BLE transmitter** (emitter) installed above doors with a **mobile Android receiver application** providing map visualization and voice assistance in real time.

The ecosystem enables:
- precise indoor positioning via Bluetooth Low Energy (BLE) signals,
- voice guidance for users navigating indoor spaces,
- map-based navigation showing zones and directions,
- real-time RSSI calibration for accurate distance estimation,
- a dual-user system:
  - Raspberry Pi (Emitter)
  - Android Application (Receiver),
- secure account management within the mobile app.

------------------------------------------------------------
🧱 Code Content
------------------------------------------------------------

The repository is organized into three main components:

1️⃣ Raspberry Pi Emitter (folder: Rasberry/)
------------------------------------------------------------
Files:
- ble_advertiser.py          → Launches BLE advertising (Linux version)
- ble_advertiser_win.py      → BLE emission script for Windows
- ble_scan_rssi.py           → Scans RSSI values for calibration
- ble_calib.pkl              → Stores calibration data
- users.json                 → Defines users and zone identifiers
- ble_multi_rssi_log.csv     → Logs detected signals and timestamps

The Raspberry Pi acts as a Bluetooth beacon that emits signals readable by the mobile application.

------------------------------------------------------------
2️⃣ Local Debug API (Optional) (folder: ApiLocalADE/)
------------------------------------------------------------
Files:
- main.py                    → Local API for BLE data testing
- requirements.txt           → Python dependencies
- ade_debug_*.txt            → Log files for calibration and debugging

------------------------------------------------------------
3️⃣ Android Receiver Application
------------------------------------------------------------
- Available on Google Play under package ID: com.example.soundway
- Developed using Kotlin + Jetpack Compose
- Integrates:
  - Google Maps SDK for real-time map display
  - Text-to-Speech (TTS) for voice guidance
  - BLE scanning for beacon detection
  - Account creation and authentication

------------------------------------------------------------
🚀 How to Run the Project
------------------------------------------------------------

🛰️ For Raspberry Pi Users (Emitter Setup)
------------------------------------------------------------
1. Install dependencies:
   sudo apt update
   sudo apt install python3 python3-venv python3-pip bluetooth bluez
   cd Rasberry
   python3 -m venv venv
   source venv/bin/activate
   pip install bleak

2. Calibrate BLE signal:
   python3 ble_scan_rssi.py

3. Start broadcasting:
   python3 ble_advertiser.py

💡 On Windows, use:
   python ble_advertiser_win.py

Once active, the Raspberry Pi continuously emits BLE signals detectable by the SoundWay app.

------------------------------------------------------------
📱 For Android Users (Receiver Setup)
------------------------------------------------------------
1. Install the application:
   Download SoundWay from Google Play:
   https://play.google.com/store/apps/details?id=com.example.soundway

2. Create your account:
   Register as a new user inside the app.

3. Grant permissions:
   Enable Bluetooth and Location access.

4. Use the system:
   When a beacon is detected:
   - Your position appears on the map,
   - The voice assistant provides real-time instructions and feedback.


------------------------------------------------------------
🧠 Technical Highlights
------------------------------------------------------------
- Python 3.12 for BLE emission and calibration
- Bleak 0.22+ – cross-platform Bluetooth library
- Android SDK 26+ (Android 8.0+)
- Google Maps SDK for indoor navigation
- Text-to-Speech (TTS) for accessibility
- Dual-user interaction between Raspberry and Android

------------------------------------------------------------
👩‍💻 Academic Context
------------------------------------------------------------
Authors:
- Esteban BARRACHO
- Anas DAMLAKHI
- Jonathan KONDOLI NKEBI
- Arthur SMOOS
- Bénédicte TUTEKA MUKUTA

------------------------------------------------------------
📄 License
------------------------------------------------------------
This project is distributed under the terms of the Creative Commons BY-ND 4.0 license.
A signed annex grants exclusive adaptation and redistribution rights to the authors of the project within the context of the INFOM435 course.

The full annex is available in:
legal/licenseSoundWay.pdf

⚠️ Any unauthorized modification, redistribution, or removal of attribution will be considered a license violation
and may result in a GitHub DMCA takedown.