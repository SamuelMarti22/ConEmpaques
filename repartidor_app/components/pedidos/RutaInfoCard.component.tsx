import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from './RutaInfoCard.style';
import { ESTADO_CONFIG } from './rutas.constants';
import { RutaResumen } from '../../types/rutas.types';

interface RutaInfoCardProps extends RutaResumen {
  onVerDetalles: () => void;
}

const RutaInfoCard: React.FC<RutaInfoCardProps> = ({
  id,
  dia,
  fecha,
  estado,
  cantidadPuntos,
  tiempoPromedio,
  distancia,
  onVerDetalles,
}) => {
  const key = (estado || 'pendiente').toLowerCase();

  const cfg = ESTADO_CONFIG[key] ?? ESTADO_CONFIG.pendiente;
  const isActiva = key === 'en_proceso';

  return (
    <View style={[styles.card, isActiva && styles.cardActiva]}>
      {isActiva && (
        <View style={styles.enCursoBadge}>
          <Text style={styles.enCursoText}>● EN CURSO</Text>
        </View>
      )}

      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.idText}>RUTA #{String(id).padStart(3, '0')}</Text>
          <Text style={styles.fechaText}>{fecha}</Text>
          <Text style={styles.diaText}>{dia}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.metrics}>
        {[
          { val: String(cantidadPuntos), lbl: 'Puntos' },
          { val: `${distancia.toFixed(1)}km`, lbl: 'Distancia' },
          { val: tiempoPromedio, lbl: 'Prom/punto' },
        ].map(({ val, lbl }) => (
          <View key={lbl} style={styles.metric}>
            <Text style={styles.metricVal}>{val}</Text>
            <Text style={styles.metricLbl}>{lbl}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[
          styles.btn,
          isActiva ? styles.btnActiva : styles.btnPending,
        ]}
        onPress={onVerDetalles}
        activeOpacity={0.7}
      >
        <Text style={[styles.btnText, isActiva && styles.btnTextActiva]}>
          Ver detalles →
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default RutaInfoCard;
