import { QRHistoryItem } from '../types';

// Configura la URL base de la API
const API_URL = 'http://192.168.1.159:3000';

// Headers comunes para todas las peticiones
const headers = {
  'Accept': 'application/json',
  'Content-Type': 'application/json'
};

/**
 * Obtiene todos los códigos QR del backend
 */
export const getAllCodigos = async (): Promise<QRHistoryItem[]> => {
  try {
    const response = await fetch(`${API_URL}/codigos`, {
      method: 'GET',
      headers
    });
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${await response.text()}`);
    }
    
    const data = await response.json();
    
    // Transformar los datos al formato que espera nuestra app
    return data.map((item: any) => ({
      id: item.id,
      data: item.data,
      type: item.type,
      timestamp: new Date(item.createdAt || Date.now())
    }));
  } catch (error) {
    console.error('Error al obtener códigos:', error);
    throw error;
  }
};

/**
 * Guarda un nuevo código QR en el backend
 */
export const saveCodigo = async (codigo: Omit<QRHistoryItem, 'id'>): Promise<QRHistoryItem> => {
  try {
    const response = await fetch(`${API_URL}/codigos`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        data: codigo.data,
        type: codigo.type
      })
    });
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${await response.text()}`);
    }
    
    const savedCodigo = await response.json();
    
    return {
      id: savedCodigo.id,
      data: savedCodigo.data,
      type: savedCodigo.type,
      timestamp: new Date(savedCodigo.createdAt || Date.now())
    };
  } catch (error) {
    console.error('Error al guardar código:', error);
    throw error;
  }
};

/**
 * Elimina un código QR del backend
 */
export const deleteCodigo = async (id: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/codigos/${id}`, {
      method: 'DELETE',
      headers
    });
    
    if (response.status === 204) {
      return true;
    }
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${await response.text()}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error al eliminar código:', error);
    throw error;
  }
};

/**
 * Elimina todos los códigos QR del backend
 */
export const deleteAllCodigos = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/codigos`, {
      method: 'DELETE',
      headers
    });
    
    return response.status === 204;
  } catch (error) {
    console.error('Error al eliminar todos los códigos:', error);
    throw error;
  }
};