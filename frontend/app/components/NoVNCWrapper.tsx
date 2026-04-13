'use client';

import { useEffect, useRef } from 'react';

interface NoVNCWrapperProps {
  url: string;
  password: string;
  onConnect: () => void;
  onDisconnect: (reason?: string) => void;
  onError: (error: string) => void;
}

export default function NoVNCWrapper({ 
  url, 
  password, 
  onConnect, 
  onDisconnect, 
  onError 
}: NoVNCWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rfbRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;

    const initRFB = async () => {
      try {
        // Dynamic import to avoid SSR issues
        const RFB = (await import('@novnc/novnc/lib/rfb')).default;
        
        if (!mounted || !containerRef.current) return;

        const rfb = new RFB(containerRef.current, url, {
          credentials: { password }
        });

        // Remove properties that don't exist
        rfb.scaleViewport = true;
        rfb.resizeSession = true;

        rfb.addEventListener('connect', () => {
          if (mounted) onConnect();
        });

        rfb.addEventListener('disconnect', (e: any) => {
          if (mounted) onDisconnect(e.detail?.reason);
        });

        rfb.addEventListener('credentialsrequired', () => {
          if (mounted) rfb.sendCredentials({ password });
        });

        rfb.addEventListener('securityfailure', (e: any) => {
          if (mounted) onError(e.detail?.reason || 'Security failure');
        });

        rfbRef.current = rfb;
      } catch (err) {
        console.error('Failed to load RFB:', err);
        onError('Failed to load VNC client');
      }
    };

    initRFB();

    return () => {
      mounted = false;
      if (rfbRef.current) {
        try {
          rfbRef.current.disconnect();
        } catch (e) {}
      }
    };
  }, [url, password, onConnect, onDisconnect, onError]);

  // Expose sendCtrlAltDel method via ref
  useEffect(() => {
    if (rfbRef.current) {
      (window as any).__rfbControl = {
        sendCtrlAltDel: () => rfbRef.current?.sendCtrlAltDel()
      };
    }
    return () => {
      delete (window as any).__rfbControl;
    };
  }, [rfbRef.current]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}