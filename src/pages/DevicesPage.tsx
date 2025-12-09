import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Watch,
  Smartphone,
  Activity,
  CheckCircle2,
  RefreshCw,
  Link2,
  Heart,
  Moon,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Device {
  id: string;
  name: string;
  icon: any;
  color: string;
  connected: boolean;
  lastSync?: string;
}

const INITIAL_DEVICES: Device[] = [
  {
    id: "apple",
    name: "Apple Health",
    icon: Activity,
    color: "text-red-500",
    connected: false,
  },
  {
    id: "google",
    name: "Google Fit",
    icon: Heart,
    color: "text-blue-500",
    connected: false,
  },
  {
    id: "fitbit",
    name: "Fitbit",
    icon: Watch,
    color: "text-emerald-500",
    connected: false,
  },
  {
    id: "oura",
    name: "Oura Ring",
    icon: Link2,
    color: "text-black",
    connected: false,
  },
];

export function DevicesPage() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<Device[]>(INITIAL_DEVICES);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStats, setSyncStats] = useState<{
    steps: number;
    heartRate: number;
    date: string;
  } | null>(null);

  // Simulate connecting a device
  const toggleConnection = (id: string) => {
    setDevices((prev) =>
      prev.map((d) => {
        if (d.id === id) {
          return {
            ...d,
            connected: !d.connected,
            lastSync: !d.connected ? "Just now" : undefined,
          };
        }
        return d;
      })
    );
  };

  // Simulate "Sync All" global action
  const handleSyncAll = () => {
    if (!devices.some((d) => d.connected)) return;

    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setSyncStats({
        steps: Math.floor(Math.random() * 5000) + 2000,
        heartRate: Math.floor(Math.random() * 20) + 60,
        date: new Date().toLocaleTimeString(),
      });
      // Update timestamps
      setDevices((prev) =>
        prev.map((d) => (d.connected ? { ...d, lastSync: "Just now" } : d))
      );
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-white p-4 shadow-sm z-10 sticky top-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/home")}>
            <ArrowLeft className="w-6 h-6 text-gray-900" />
          </Button>
          <h1 className="text-xl font-bold text-gray-900">Devices & Apps</h1>
        </div>
      </div>

      <div className="p-6 flex-1 overflow-y-auto">
        {/* Hero / Sync Status */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-6 text-white shadow-lg mb-8 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Wearable Sync</h2>
              <Smartphone className="w-6 h-6 opacity-80" />
            </div>

            {syncStats ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center gap-2 text-emerald-300 font-bold mb-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Sync Complete</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-xs font-bold opacity-70 mb-1">
                      <Flame className="w-3 h-3" /> Steps
                    </div>
                    <div className="text-2xl font-bold">{syncStats.steps}</div>
                  </div>
                  <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-xs font-bold opacity-70 mb-1">
                      <Activity className="w-3 h-3" /> Heart Rate
                    </div>
                    <div className="text-2xl font-bold">
                      {syncStats.heartRate} bpm
                    </div>
                  </div>
                </div>
                <p className="text-xs opacity-60 mt-2 text-right">
                  Last updated: {syncStats.date}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-indigo-100 font-medium mb-6 leading-relaxed">
                  Connect your health apps to give your Fitness Coach real-time
                  biometric data for hyper-personalized plans.
                </p>
                <Button
                  onClick={handleSyncAll}
                  disabled={!devices.some((d) => d.connected) || isSyncing}
                  className="w-full bg-white text-indigo-600 hover:bg-indigo-50 font-bold rounded-xl h-12 flex items-center justify-center gap-2"
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Syncing Data...
                    </>
                  ) : (
                    "Sync Now"
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        </div>

        <h3 className="font-bold text-gray-900 mb-4 px-1">
          Available Integrations
        </h3>

        <div className="space-y-4">
          {devices.map((device) => (
            <Card
              key={device.id}
              className={`p-4 flex items-center justify-between transition-all border-2 ${
                device.connected
                  ? "border-emerald-500 bg-emerald-50/50"
                  : "border-transparent hover:border-gray-200"
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center bg-gray-50 ${device.color}`}
                >
                  <device.icon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{device.name}</h4>
                  {device.connected ? (
                    <p className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Connected
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 font-medium">
                      Not linked
                    </p>
                  )}
                </div>
              </div>

              <Button
                variant={device.connected ? "outline" : "default"}
                size="sm"
                className={`rounded-lg font-bold ${
                  device.connected
                    ? "text-gray-500 hover:text-red-500 border-gray-200"
                    : "bg-gray-900 text-white"
                }`}
                onClick={() => toggleConnection(device.id)}
              >
                {device.connected ? "Disconnect" : "Connect"}
              </Button>
            </Card>
          ))}
        </div>

        <div className="mt-8 text-center px-8">
          <p className="text-xs text-gray-400 leading-relaxed">
            We prioritize your privacy. Your biometric data is encrypted and
            used solely to adjust your fitness and nutrition plans.
          </p>
        </div>
      </div>
    </div>
  );
}
