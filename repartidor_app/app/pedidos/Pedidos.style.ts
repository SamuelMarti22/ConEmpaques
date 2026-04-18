import { StyleSheet } from 'react-native';
import { COLORS } from '../../assets/styles/Colores.style';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  list: {
    padding: 12,
    gap: 10,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.teal,
    fontSize: 14,
  },
  errorText: {
    color: '#a32d2d',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: COLORS.teal,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 9,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
  },
});