# SoundWay – Bluetooth Indoor Navigation System (License CC BY-ND 4.0 + Annex)
[![License: CC BY-ND 4.0](https://img.shields.io/badge/License-CC%20BY--ND%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nd/4.0/)
[![Available on Google Play](https://img.shields.io/badge/Google%20Play-Available-green.svg)](https://play.google.com/store/apps/details?id=com.example.soundway)

This project was developed within the academic course **INFOM435 – Interface Incarnée Augmentée** at the **University of Namur (UNamur)**.  
It was designed and implemented by a multidisciplinary student team exploring embodied and augmented interaction through IoT and mobile systems.

------------------------------------------------------------
📘 Official Documentation
------------------------------------------------------------

The project includes three official documents available in the `/doc/` directory:

- 📄 **ACM Scientific Report (AIM 2023)**  
  `doc/AcmRapport/PDF/AcmRapport.pdf`

- 📙 **User Guide**  
  `doc/UserGuide/PDF/UserGuide.pdf`

- 🛠️ **Programmer Guide**  
  `doc/ProgrammerGuide/PDF/ProgrammerGuide.pdf`

A scientific publication related to SoundWay is currently pending DOI assignment, and will be added once available.

------------------------------------------------------------
📌 Project Description
------------------------------------------------------------

SoundWay is a Bluetooth-based indoor navigation system designed to enhance mobility and spatial awareness within buildings.  
The system connects a **Raspberry Pi BLE transmitter** installed above doors with a **mobile receiver application** offering map visualization and voice assistance in real time.

The ecosystem enables:
- precise indoor positioning using Bluetooth Low Energy (BLE),
- voice guidance for indoor navigation,
- map-based navigation showing areas and directions,
- real-time RSSI calibration for improved accuracy,
- a dual-system architecture:
  - Raspberry Pi (Emitter)
  - Mobile Application (Receiver),
- secure account management within the mobile app.

------------------------------------------------------------
🧱 Code Content
------------------------------------------------------------

The repository contains two main codebases:

1️⃣ **Raspberry Pi Emitter**  
Located in: `code/rasberry/`  
Files:
- `Emetteur.py` → BLE multi-advertising emitter  
- `ble_advertiser.py` → Linux BLE advertising  
- `ble_advertiser_win.py` → Windows BLE advertising  
- `ble_scan_rssi.py` → RSSI calibration  
- `ble_calib.pkl` → Calibration data  
- `users.json` → User/zone identifiers  
- `ble_multi_rssi_log.csv` → RSSI logs  

2️⃣ **Mobile Application**  
Located in: `code/mobile/`  
Features:
- Developed using **React Native + Expo + TypeScript**
- Voice assistance (Text-to-Speech)
- BLE scanning for beacon detection
- Map visualization and route guidance
- Firebase authentication system

3️⃣ **Local Debug API (optional)**  
Located in: `method/implementation/2025-11-09 – ApiLocalADE/`  
Files:
- `main.py` → Local debug API  
- `requirements.txt` → Dependencies  
- `ade_debug_*.txt` → Debug logs  

------------------------------------------------------------
🚀 How to Run the Project
------------------------------------------------------------

🛰️ **Raspberry Pi Setup (Emitter)**  
------------------------------------------------------------
1. Install dependencies:
    sudo apt update
    sudo apt install python3 python3-venv python3-pip bluetooth bluez
    cd code/rasberry
    python3 -m venv venv
    source venv/bin/activate
    pip install bleak

2. Calibrate BLE signal:
   python3 ble_scan_rssi.py

3. Start advertising:
   python3 Emetteur.py

💡 On Windows, use:
   python ble_advertiser_win.py

Once active, the Raspberry Pi continuously emits BLE signals detectable by the SoundWay app.

------------------------------------------------------------
📱 Mobile Application (Receiver)
------------------------------------------------------------

1. Install the app from Google Play:  
   https://play.google.com/store/apps/details?id=com.example.soundway

2. Create your account inside the app.

3. Grant permissions:
- Bluetooth  
- Location  

4. Begin navigation:
- BLE devices appear automatically,
- Distance and direction are computed in real time,
- The voice assistant provides interactive guidance.

------------------------------------------------------------
🧠 Technical Highlights
------------------------------------------------------------
- Python 3.12 for BLE processing  
- Bleak 0.22+ for cross-platform BLE communication  
- React Native + Expo + TypeScript for mobile development  
- Text-to-Speech (TTS) for accessibility  
- Firebase user authentication  
- RSSI-based distance computation with calibration  
- BLE multi-advertising for stronger signal density  

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
This project is provided under the **Creative Commons BY-ND 4.0** license.

You may share the work with attribution.  
Modifying or distributing modified versions is **not permitted**.

⚠️ Unauthorized modification, redistribution, or removal of attribution may result in a GitHub DMCA takedown.
