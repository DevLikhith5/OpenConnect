import { useEffect, useRef, useState } from 'react';

const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

let googleScriptPromise = null;

function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (googleScriptPromise) return googleScriptPromise;

  googleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GOOGLE_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Google script')), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google script'));
    document.head.appendChild(script);
  });

  return googleScriptPromise;
}

export default function GoogleSignInButton({
  clientId,
  buttonText = 'signin_with',
  dark = true,
  disabled = false,
  onCredential,
  onError,
}) {
  const containerRef = useRef(null);
  const [renderError, setRenderError] = useState('');

  useEffect(() => {
    if (!clientId || disabled || !containerRef.current) return;

    let active = true;

    function renderButton() {
      if (!active || !containerRef.current || !window.google?.accounts?.id) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (!response?.credential) {
            onError?.(new Error('Google did not return a credential'));
            return;
          }
          onCredential?.(response.credential);
        },
      });

      containerRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(containerRef.current, {
        type: 'standard',
        shape: 'rectangular',
        size: 'large',
        text: buttonText,
        width: containerRef.current.offsetWidth || 360,
        logo_alignment: 'left',
        theme: dark ? 'filled_black' : 'outline',
      });
    }

    loadGoogleScript()
      .then(() => {
        setRenderError('');
        renderButton();
      })
      .catch((e) => {
        if (!active) return;
        setRenderError(e.message || 'Google Sign-In failed to initialize');
      });

    window.addEventListener('resize', renderButton);

    return () => {
      active = false;
      window.removeEventListener('resize', renderButton);
    };
  }, [buttonText, clientId, dark, disabled, onCredential, onError]);

  if (!clientId) {
    return null;
  }

  if (renderError) {
    return <div className="auth-provider-note">{renderError}</div>;
  }

  return <div ref={containerRef} className="auth-google-slot" aria-live="polite" />;
}
