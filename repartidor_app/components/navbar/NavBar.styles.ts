import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  navbar: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
    paddingBottom: 20,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 10,
    gap: 3,
  },
  navLabel: { fontSize: 9, fontWeight: '500', color: '#888' },
  navLabelActive: { color: '#185FA5' },
});