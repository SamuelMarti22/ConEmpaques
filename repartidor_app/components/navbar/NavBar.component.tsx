// BottomNavbar.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './NavBar.styles';

type Tab = 'rutas' | 'tracking' | 'perfil' | 'salir';

interface BottomNavbarProps {
  activeTab: Tab;
  onTabPress: (tab: Tab) => void;
}

const TABS: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap; iconActive: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'rutas',    label: 'Mis rutas', icon: 'map-outline',    iconActive: 'map' },
  { key: 'tracking', label: 'Tracking',  icon: 'navigate-outline', iconActive: 'navigate' },
  { key: 'perfil',   label: 'Mi perfil', icon: 'person-outline', iconActive: 'person' },
  { key: 'salir',    label: 'Salir',     icon: 'log-out-outline', iconActive: 'log-out' },
];

export const BottomNavbar: React.FC<BottomNavbarProps> = ({ activeTab, onTabPress }) => (
  <View style={styles.navbar}>
    {TABS.map(({ key, label, icon, iconActive }) => {
      const isActive = activeTab === key;
      return (
        <TouchableOpacity
          key={key}
          style={styles.navItem}
          onPress={() => onTabPress(key)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isActive ? iconActive : icon}
            size={22}
            color={isActive ? '#185FA5' : '#888'}
          />
          <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
            {label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);
