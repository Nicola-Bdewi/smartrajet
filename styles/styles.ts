import { StyleSheet, Dimensions } from 'react-native';

export const styles = StyleSheet.create({
    searchContainer: {
        position: 'absolute',
        top: 60,
        left: 10,
        right:10,
        zIndex: 10,
    },
    input: {
        backgroundColor: '#fff',
        padding: 10,
        borderRadius: 8,
        marginBottom: 5,
        marginRight: 8,
        elevation: 2,
        minWidth: 50,
    },
    fab: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: '#1976D2',
    },
    fabTwo: {
        position: 'absolute',
        top: 42,          // e.g. 60px *below* the first one (adjust as needed)
        right: 0,         // same right edge
        backgroundColor: '#1976D2',
    },
    suggestionsList: {
        backgroundColor: '#fff',
        borderRadius: 8,
        maxHeight: Dimensions.get('window').height * 0.3,
    },
    suggestion: {
        padding: 10,
        borderBottomWidth: 1,
        borderColor: '#eee',
    },
    floatingBtnContainer: {
        position: 'absolute',
        left: 20,
        right: 20,
    },
    sliderContainer: {
        backgroundColor: '#ffffff',
        padding: 12,
        borderRadius: 10,
        elevation: 2, // for subtle shadow (Android)
        shadowColor: '#000', // shadow for iOS
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        marginHorizontal: 10,
        marginBottom: 10,
    },
    floatingButton: {
        position: 'absolute',
        top: 40,
        right: 20,
        zIndex: 10,
    },
    animatedCard: {
        margin: 20,
    },
    togglePanel: {
        position: 'absolute',
        bottom: 90,
        left: 20,
        right: 20,
        zIndex: 20,
    },
});