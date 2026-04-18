import { StyleSheet } from 'react-native';
import  {COLORS}  from '../../assets/styles/Colores.style';

export const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.teal,
  },
  cardActiva: {
    borderLeftColor: COLORS.light,
    shadowColor: COLORS.teal,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 9,
  },
  idText: {
    fontSize: 10,
    color: COLORS.teal,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  fechaText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 1,
  },
  diaText: {
    fontSize: 11,
    color: '#888',
    marginTop: 1,
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  divider: {
    height: 0.5,
    backgroundColor: '#eee',
    marginVertical: 8,
  },
  metrics: {
    flexDirection: 'row',
    gap: 6,
  },
  metric: {
    flex: 1,
    backgroundColor: COLORS.metricBg,
    borderRadius: 9,
    padding: 8,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: COLORS.cardBorder,
  },
  metricVal: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  metricLbl: {
    fontSize: 9,
    color: '#888',
    marginTop: 2,
  },
  btn: {
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: COLORS.teal,
    borderRadius: 9,
    paddingVertical: 9,
    alignItems: 'center',
  },
  btnActiva: {
    backgroundColor: COLORS.teal,
    borderColor: COLORS.teal,
  },
  btnPending: {
    backgroundColor: 'transparent',
    borderColor: COLORS.teal,
  },
  btnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.teal,
  },
  btnTextActiva: {
    color: '#fff',
  },
  enCursoBadge: {
    backgroundColor: COLORS.teal,
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 7,
  },
  enCursoText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
});
