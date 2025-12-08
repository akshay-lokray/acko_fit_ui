import { useEffect, useRef } from 'react';
import './ReadyPlayerMeWebviewer.css';

const APP_ID = '6932f4edf929fb8dbfd89d28';
const SUBDOMAIN = 'https://ackofit.readyplayer.me/avatar';

interface ReadyPlayerMeWebviewerProps {
  onAvatarCreated: (avatarUrl: string) => void;
  gender?: string;
  visible: boolean;
  onClose: () => void;
}

export default function ReadyPlayerMeWebviewer({
  onAvatarCreated,
  gender = 'neutral',
  visible,
  onClose,
}: ReadyPlayerMeWebviewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!visible) return;

    const handleMessage = (event: MessageEvent) => {
      // Verify origin for security
      if (!event.origin.includes('readyplayer.me')) {
        return;
      }

      console.log('ReadyPlayer.me message received:', event.data);

      // Handle avatar creation events
      // ReadyPlayer.me sends different event formats depending on the version
      if (event.data?.source === 'readyplayerme' || event.data?.source === 'readyplayermewebview') {
        const eventName = event.data.eventName || event.data.event;
        const avatarData = event.data.data || event.data;
        
        if (eventName === 'v1.avatar.exported' || eventName === 'v1.avatar.set' || eventName === 'avatar.exported') {
          let avatarUrl = avatarData?.url || avatarData?.glbUrl || avatarData?.gltfUrl;
          
          if (avatarUrl) {
            // Ensure we have the GLB URL for 3D rendering
            if (avatarUrl.includes('.gltf')) {
              avatarUrl = avatarUrl.replace('.gltf', '.glb');
            }
            // If no extension, try to get GLB version
            if (!avatarUrl.includes('.glb') && !avatarUrl.includes('.gltf')) {
              // Try common ReadyPlayer.me URL patterns
              avatarUrl = `${avatarUrl}.glb`;
            }
            
            onAvatarCreated(avatarUrl);
            onClose();
          }
        }
      }
      
      // Also handle direct URL in data
      if (event.data?.url && typeof event.data.url === 'string') {
        let avatarUrl = event.data.url;
        if (avatarUrl.includes('.gltf')) {
          avatarUrl = avatarUrl.replace('.gltf', '.glb');
        }
        onAvatarCreated(avatarUrl);
        onClose();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [visible, onAvatarCreated, onClose]);

  if (!visible) return null;

  // Enable photo upload in webviewer (requires photo option enabled in subdomain settings)
  const webviewerUrl = `${SUBDOMAIN}?appId=${APP_ID}&frameApi=true&gender=${gender}&photo=true`;

  return (
    <div className="webviewer-overlay" onClick={onClose}>
      <div className="webviewer-container" onClick={(e) => e.stopPropagation()}>
        <div className="webviewer-header">
          <h3>Create Your Avatar</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <iframe
          ref={iframeRef}
          src={webviewerUrl}
          className="webviewer-iframe"
          allow="camera *; microphone *"
          title="ReadyPlayer.me Avatar Creator"
        />
      </div>
    </div>
  );
}

