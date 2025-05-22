import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Linking,
  SafeAreaView,
  StatusBar,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { BarcodeScanningResult } from 'expo-camera';
import { QRHistoryItem } from './src/types';
import * as API from './src/services/api';

export default function QRScannerApp() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [qrHistory, setQrHistory] = useState<QRHistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'scanner' | 'history'>('scanner');
  const [loading, setLoading] = useState(true);

  // Cargar los códigos QR guardados al iniciar la aplicación
  useEffect(() => {
    loadQRCodes();
  }, []);

  // Cargar códigos desde la API
  const loadQRCodes = async () => {
    try {
      setLoading(true);
      const data = await API.getAllCodigos();
      setQrHistory(data);
    } catch (error) {
      Alert.alert(
        'Error',
        'No se pudieron cargar los códigos QR guardados. Verifica tu conexión al servidor.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Verificar permisos al iniciar
  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  // Función que se ejecuta cuando se escanea un código QR
  const handleBarcodeScanned = async ({ type, data }: BarcodeScanningResult) => {
    if (scanned) return; // Evitar múltiples escaneos
    
    setScanned(true);
    
    try {
      // Guardar en la API
      const newItem = await API.saveCodigo({
        data,
        type,
        timestamp: new Date(),
      });
      
      // Actualizar estado local
      setQrHistory(prev => [newItem, ...prev]);
      
      // Mostrar el resultado
      Alert.alert(
        'Código QR Escaneado',
        data,
        [
          {
            text: 'Abrir enlace',
            onPress: () => openLink(data),
            style: 'default',
          },
          {
            text: 'Ver historial',
            onPress: () => setActiveTab('history'),
            style: 'default',
          },
          {
            text: 'Escanear otro',
            onPress: () => setScanned(false),
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('Error al guardar código escaneado:', error);
      Alert.alert(
        'Error',
        'No se pudo guardar el código QR. Verifica tu conexión al servidor.'
      );
      setScanned(false);
    }
  };

  // Función para abrir enlaces
  const openLink = async (url: string) => {
    try {
      // Verificar si es una URL válida
      if (url.startsWith('http://') || url.startsWith('https://')) {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        } else {
          Alert.alert('Error', 'No se puede abrir este enlace');
        }
      } else {
        Alert.alert('Información', 'El código QR contiene: ' + url);
      }
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un error al procesar el código QR');
    }
    setScanned(false);
  };

  // Función para eliminar un elemento del historial
  const deleteHistoryItem = (id: string) => {
    Alert.alert(
      'Eliminar elemento',
      '¿Estás seguro de que quieres eliminar este elemento del historial?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await API.deleteCodigo(id);
              setQrHistory(prev => prev.filter(item => item.id !== id));
            } catch (error) {
              Alert.alert(
                'Error',
                'No se pudo eliminar el código QR. Verifica tu conexión al servidor.'
              );
            }
          },
        },
      ]
    );
  };

  // Función para limpiar todo el historial
  const clearHistory = () => {
    Alert.alert(
      'Limpiar historial',
      '¿Estás seguro de que quieres eliminar todo el historial?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpiar todo',
          style: 'destructive',
          onPress: async () => {
            try {
              await API.deleteAllCodigos();
              setQrHistory([]);
            } catch (error) {
              Alert.alert(
                'Error',
                'No se pudo limpiar el historial. Verifica tu conexión al servidor.'
              );
            }
          },
        },
      ]
    );
  };

  // Función para formatear la fecha
  const formatDate = (date: Date) => {
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Componente para renderizar cada elemento del historial
  const renderHistoryItem = ({ item }: { item: QRHistoryItem }) => (
    <View style={styles.historyItem}>
      <View style={styles.historyContent}>
        <Text style={styles.historyData} numberOfLines={2}>
          {item.data}
        </Text>
        <Text style={styles.historyDate}>
          {formatDate(item.timestamp)}
        </Text>
        <Text style={styles.historyType}>
          Tipo: {item.type}
        </Text>
      </View>
      <View style={styles.historyActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => openLink(item.data)}
        >
          <Text style={styles.actionButtonText}>Abrir</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => deleteHistoryItem(item.id)}
        >
          <Text style={styles.actionButtonText}>Eliminar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Si no hay permisos
  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.message}>Solicitando permisos de cámara...</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.message}>
            Necesitamos acceso a la cámara para escanear códigos QR
          </Text>
          <TouchableOpacity style={styles.button} onPress={requestPermission}>
            <Text style={styles.buttonText}>Conceder Permiso</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header con navegación */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Escáner de Códigos QR</Text>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'scanner' && styles.activeTab]}
            onPress={() => setActiveTab('scanner')}
          >
            <Text style={[styles.tabText, activeTab === 'scanner' && styles.activeTabText]}>
              Escáner
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'history' && styles.activeTab]}
            onPress={() => setActiveTab('history')}
          >
            <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
              Historial ({qrHistory.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Contenido principal */}
      {activeTab === 'scanner' ? (
        <>
          {/* Cámara */}
          <View style={styles.cameraContainer}>
            <CameraView
              style={styles.camera}
              facing="back"
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ['qr', 'pdf417'],
              }}
            />
            
            {/* Overlay con marco de escaneo */}
            <View style={styles.overlay}>
              <View style={styles.scanArea}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
            </View>
          </View>

          {/* Instrucciones */}
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructions}>
              {scanned 
                ? 'Código QR escaneado correctamente' 
                : 'Apunta la cámara hacia un código QR'
              }
            </Text>
            
            {scanned && (
              <TouchableOpacity 
                style={styles.button} 
                onPress={() => setScanned(false)}
              >
                <Text style={styles.buttonText}>Escanear Otro</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      ) : (
        /* Historial */
        <View style={styles.historyContainer}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>
              Historial de Códigos QR
            </Text>
            <View style={styles.headerButtonsContainer}>
              {qrHistory.length > 0 && (
                <TouchableOpacity
                  style={[styles.headerButton, styles.clearButton]}
                  onPress={clearHistory}
                >
                  <Text style={styles.headerButton}>Limpiar</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.headerButton, styles.refreshButton]}
                onPress={loadQRCodes}
              >
                <Text style={styles.headerButton}>Actualizar</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Cargando códigos...</Text>
            </View>
          ) : qrHistory.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No hay códigos QR escaneados aún
              </Text>
              <TouchableOpacity
                style={styles.button}
                onPress={() => setActiveTab('scanner')}
              >
                <Text style={styles.buttonText}>Ir al Escáner</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={qrHistory}
              keyExtractor={(item) => item.id}
              renderItem={renderHistoryItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.historyList}
              refreshing={loading}
              onRefresh={loadQRCodes}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: '#1a1a1a',
  },
  headerText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#333',
    borderRadius: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    color: '#ccc',
    fontSize: 16,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#00ff00',
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  instructionsContainer: {
    padding: 20,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
  },
  instructions: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
    marginLeft: 10,
  },
  refreshButton: {
    backgroundColor: '#34C759',
    marginLeft: 10,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  message: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  historyContainer: {
    flex: 1,
    backgroundColor: '#111',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1a1a1a',
  },
  historyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  headerButtonsContainer: {
    flexDirection: 'row',
  },
  headerButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginLeft: 10,
  },
  historyList: {
    padding: 15,
  },
  historyItem: {
    backgroundColor: '#1a1a1a',
    marginBottom: 15,
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyContent: {
    flex: 1,
    marginRight: 15,
  },
  historyData: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 5,
    fontWeight: '500',
  },
  historyDate: {
    color: '#999',
    fontSize: 14,
    marginBottom: 3,
  },
  historyType: {
    color: '#666',
    fontSize: 12,
  },
  historyActions: {
    flexDirection: 'column',
  },
  actionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 5,
    minWidth: 70,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#999',
    marginTop: 10,
    fontSize: 16,
  },
});