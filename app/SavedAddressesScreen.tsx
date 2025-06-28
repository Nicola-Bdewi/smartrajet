import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TextInput,
    TouchableOpacity,
    Button,
    Alert,
    StyleSheet
} from 'react-native';
import {
    fetchAddresses,
    updateAddress,
    deleteAddress,
    SavedAddr
} from '@/services/addressService';

export default function SavedAddressesScreen() {
    const [addresses, setAddresses] = useState<SavedAddr[]>([]);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [tempLabel, setTempLabel] = useState<string>('');

    // Load all addresses on mount (and after any change)
    const load = async () => {
        const list = await fetchAddresses();
        setAddresses(list);
    };

    useEffect(() => {
        load();
    }, []);

    const handleSave = async (id: number) => {
        await updateAddress(id, tempLabel);
        setEditingId(null);
        load();
    };

    const handleDelete = (id: number) => {
        Alert.alert(
            'Delete address?',
            'Are you sure you want to delete this saved address?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete', style: 'destructive', onPress: async () => {
                        await deleteAddress(id);
                        load();
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
        <Text style={styles.header}>My Saved Addresses</Text>

    <FlatList
    data={addresses}
    keyExtractor={item => item.id.toString()}
    ListEmptyComponent={<Text style={styles.empty}>No saved addresses.</Text>}
    renderItem={({ item }) => (
        <View style={styles.row}>
        {editingId === item.id ? (
                <>
                    <TextInput
                        value={tempLabel}
            onChangeText={setTempLabel}
    style={styles.input}
    />
    <Button title="Save" onPress={() => handleSave(item.id)} />
    <Button title="Cancel" onPress={() => setEditingId(null)} />
    </>
) : (
        <>
            <View style={styles.info}>
        <Text style={styles.label}>{item.label}</Text>
            <Text style={styles.coords}>
        {item.coords[0].toFixed(5)}, {item.coords[1].toFixed(5)}
    </Text>
    </View>
    <View style={styles.actions}>
    <TouchableOpacity
        onPress={() => {
        setEditingId(item.id);
        setTempLabel(item.label);
    }}
    style={styles.actionBtn}
        >
        <Text>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
    onPress={() => handleDelete(item.id)}
    style={[styles.actionBtn, styles.deleteBtn]}
>
    <Text>Delete</Text>
    </TouchableOpacity>
    </View>
    </>
)}
    </View>
)}
    />
    </View>
);
}

    const styles = StyleSheet.create({
        container: { flex: 1, padding: 16, backgroundColor: '#fff' },
        header: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
        empty: { textAlign: 'center', marginTop: 20, color: '#666' },
        row: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 12,
            flexWrap: 'wrap'
        },
        info: { flex: 1, minWidth: 0 },
        label: { fontSize: 16 },
        coords: { color: '#666', fontSize: 12 },
        actions: {
            flexDirection: 'row',
            alignItems: 'center',
            marginLeft: 8
        },
        actionBtn: {
            padding: 6,
            borderWidth: 1,
            borderRadius: 4,
            marginLeft: 4
        },
        deleteBtn: {
            borderColor: 'red'
        },
        input: {
            flex: 1,
            borderBottomWidth: 1,
            paddingVertical: 4,
            marginRight: 8
        }
    });
