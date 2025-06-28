import { StyleSheet, Dimensions } from 'react-native';

export const styles = StyleSheet.create({
    searchContainer: {
        position: 'absolute',
        top: 40,
        left: 10,
        right: 10,
        zIndex: 10,
    },
    input: {
        backgroundColor: '#fff',
        padding: 10,
        borderRadius: 8,
        marginBottom: 5,
        elevation: 2,
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
});