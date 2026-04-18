import React, { useState } from 'react';
import { View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { BottomNavbar } from '../../components/navbar/NavBar.component';

type Tab = 'rutas' | 'tracking' | 'perfil' | 'salir';

export default function PedidosLayout() {
  const [activeTab, setActiveTab] = useState<Tab>('rutas');
  const router = useRouter();

  const handleTabPress = (tab: Tab) => {
    setActiveTab(tab);
    switch (tab) {
      case 'rutas':
        router.push('./Pedidos.app');
        break;
      case 'tracking':
        router.push('../tracking');
        break;
      case 'perfil':
        router.push('../perfil');
        break;
      case 'salir':
        router.push('../../autenticacion/login.app');
        break;
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
      <BottomNavbar activeTab={activeTab} onTabPress={handleTabPress} />
    </View>
  );
}
