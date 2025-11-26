import { ScreenLayout } from '@/components/ScreenLayout';
import { Card } from '@/components/ui/card';
import { useVoiceAssistant } from '@/providers/VoiceAssistanteProvider';
import { bleService } from '@/services/bleService';
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { handleZoneText } from '../services/ZoneManager';

export default function DeviceScreen() {
  const [logs, setLogs] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [device, setDevice] = useState<any>(null);
  const [distance, setDistance] = useState<any>(null);

  const { speak } = useVoiceAssistant();

  useEffect(() => {
    if (connected) {
      speak('Conneced to soundway device of building ');
    } else {
      speak('Disconneced to soundway device of building ');
    }
  }, [connected]);

  useEffect(() => {
    (async () => {
      bleService.setZoneCallback(async (msg) => {
        const parsed = await handleZoneText(msg);
        setLogs((s) => [`${new Date().toLocaleTimeString()}: ${parsed}`, ...s].slice(0, 200));
      });

      bleService.setConnectionCallback((c) => setConnected(c));

      bleService.setDeviceUpdatedCallback((device, distance) => {
        setDevice(device);
        setDistance(distance);
      });

      bleService.startAutoScan();
    })();

    return () => {
      bleService.stopAll();
    };
  }, []);

  return (
    <ScreenLayout>
      <Card className='w-[90%] h-[90vh] flex flex-col justify-center items-center bg-dark-trans self-center rounded-lg shadow-sm p-6 gap-4'>
        <View className=' flex gap-3'>
          <Text className='text-2xl text-green-600'>{device ? 'Founded' : 'Scanning...'}</Text>
          <Text className={`text-2xl ${connected ? 'text-green-600' : 'text-red-600'}`}>{connected ? 'Connected' : 'Not Connected'}</Text>
        </View>

        <View>
          <Text className='flex flex-col gap-3 justify-center items-center'>Connected Device</Text>

          {device ? (
            <View className=' border border-gray-400 p-3 rounded'>
              <Text className='text-gray-400'>{device.id}</Text>
              <Text className='text-white text-lg'>{device.name || device.localName || 'Ble Device'}</Text>
              <Text className='text-white text-lg'>Distance: {distance ? `${distance.toFixed(2)}m` : 'N/A'}</Text>
            </View>
          ) : (
            <Text className='text-white'>No device Found</Text>
          )}
        </View>

        <View className='w-full h-[40%] mt-4'>
          {logs.map((log, i) => (
            <Text key={i} className='text-white text-xs'>
              {log}
            </Text>
          ))}
        </View>
      </Card>
    </ScreenLayout>
  );
}
