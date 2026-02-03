/**
 * Convert blob to File object
 */
export const blobToFile = (blob, fileName) => {
  return new File([blob], fileName, { type: blob.type });
};

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * Upload recording blob to backend
 */
export const uploadRecordingToBackend = async (recordingBlob, classId, recordingDuration, authToken) => {
  try {
    // Get token from localStorage if not provided
    const token = authToken || localStorage.getItem('token');
    
    if (!token) {
      throw new Error('Authentication token not found. Please log in again.');
    }

    const formData = new FormData();
    formData.append('recording', recordingBlob, `recording-${Date.now()}.webm`);
    formData.append('classId', classId);
    formData.append('recordingDuration', recordingDuration);

    const response = await fetch(
      `${API_URL}/api/classes/${classId}/recording/upload`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to upload recording');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error uploading recording:', error);
    throw error;
  }
};

/**
 * Fetch all recordings for a class
 */
export const fetchClassRecordings = async (classId, authToken) => {
  try {
    const token = authToken || localStorage.getItem('token');
    if (!token) throw new Error('Authentication token not found. Please log in.');

    const response = await fetch(
      `${API_URL}/api/classes/${classId}/recordings`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch recordings');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching recordings:', error);
    throw error;
  }
};

/**
 * Delete a recording
 */
export const deleteClassRecording = async (classId, recordingId, authToken) => {
  try {
    const token = authToken || localStorage.getItem('token');
    if (!token) throw new Error('Authentication token not found. Please log in.');

    const response = await fetch(
      `${API_URL}/api/classes/${classId}/recording/${recordingId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete recording');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error deleting recording:', error);
    throw error;
  }
};

/**
 * Format duration (seconds) to readable format
 */
export const formatDuration = (seconds) => {
  if (!seconds) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Format file size to readable format
 */
export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};
