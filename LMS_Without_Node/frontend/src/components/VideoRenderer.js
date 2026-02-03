import React, { useEffect, useRef, memo } from 'react';
import { Paper, Chip } from '@mui/material';
import FiberManualRecord from '@mui/icons-material/FiberManualRecord';

const VideoRenderer = memo(({
  remoteStreams,
  localStream,
  localVideoRef,
  isTeacher,
  isRecording
}) => {
  const remoteVideoRefs = useRef({});

  // Update video elements when remote streams change
  useEffect(() => {
    if (!isTeacher && Object.keys(remoteStreams).length > 0) {
      // For students, update teacher's video
      Object.entries(remoteStreams).forEach(([socketId, stream]) => {
        if (remoteVideoRefs.current[socketId]) {
          remoteVideoRefs.current[socketId].srcObject = stream;
          remoteVideoRefs.current[socketId].play().catch(err => 
            console.error('Error playing teacher video:', err)
          );
        }
      });
    }
  }, [remoteStreams, isTeacher]);

  // Update local video when stream changes
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(err => 
        console.error('Error playing local video:', err)
      );
    }
  }, [localStream, localVideoRef]);

  return (
    <Paper sx={{ position: 'relative', height: '100%', backgroundColor: '#000', overflow: 'hidden' }}>
      {/* Display video based on role */}
      {isTeacher ? (
        // Teacher displays own local video + remote streams (students)
        <div style={{ display: 'flex', flexWrap: 'wrap', height: '100%' }}>
          {/* Teacher's own local video */}
          {localStream ? (
            <video
              ref={localVideoRef}
              autoPlay
              muted={true}
              playsInline
              onLoadedMetadata={() => {
                console.log('Teacher local video metadata loaded');
                if (localVideoRef.current) {
                  localVideoRef.current.play().catch(err => 
                    console.error('Error playing local video:', err)
                  );
                }
              }}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
            />
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              color: 'white',
              backgroundColor: '#1a1a1a'
            }}>
              Waiting for your camera...
            </div>
          )}
        </div>
      ) : (
        // Student displays teacher's video or local video if no teacher
        Object.entries(remoteStreams).length > 0 ? (
          Object.entries(remoteStreams).map(([socketId, stream]) => (
            <video
              key={socketId}
              ref={(videoElement) => {
                if (videoElement) {
                  remoteVideoRefs.current[socketId] = videoElement;
                  if (stream) {
                    videoElement.srcObject = stream;
                    videoElement.play().catch(err => 
                      console.error('Error playing teacher video:', err)
                    );
                  }
                }
              }}
              autoPlay
              playsInline
              muted={false}
              data-socket-id={socketId}
              onLoadedMetadata={(e) => {
                console.log('Teacher video metadata loaded');
                e.target.play().catch(err => console.error('Error playing:', err));
              }}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
            />
          ))[0] // Show first remote stream (teacher)
        ) : (
          <video
            ref={localVideoRef}
            autoPlay
            muted={true}
            playsInline
            onLoadedMetadata={() => {
              console.log('Local video metadata loaded');
              if (localVideoRef.current) {
                localVideoRef.current.play().catch(err => 
                  console.error('Error playing local video:', err)
                );
              }
            }}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }}
          />
        )
      )}

      {/* Recording indicator */}
      {isRecording && (
        <Chip
          icon={<FiberManualRecord />}
          label="Recording"
          color="error"
          sx={{ position: 'absolute', top: 10, right: 10 }}
        />
      )}
    </Paper>
  );
});

VideoRenderer.displayName = 'VideoRenderer';
export default VideoRenderer;
