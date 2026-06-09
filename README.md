# Survfix APK to Supabase Proxy

This repository contains a lightweight Node.js middleware server designed to act as a bridge between the reverse-engineered field APK (Survfix) and your cloud infrastructure (Supabase).

## 🚀 Overview
Since the compiled field APK blindly pushes telemetry streams (GPS coordinates, battery levels, and statuses), this proxy service:
1. **Listens** for incoming HTTP POST requests from the field tablets.
2. **Catches** the raw payloads containing the rover telemetry.
3. **Translates** and forwards the data securely into your Supabase database via REST APIs using your secure API keys.

## 🛠️ Setup & Configuration
1. Clone the repository and install dependencies:
   ```bash
   npm install
